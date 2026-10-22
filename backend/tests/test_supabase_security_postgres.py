"""Opt-in only: fresh synthetic PostgreSQL cluster, never a Supabase database."""

import os
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection

from core.supabase_security import audit_public_schema, containment_review_plan

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.skipif(os.getenv("SHINEAPP_SECURITY_POSTGRES_TESTS") != "1",
                       reason="requires explicitly authorized synthetic PostgreSQL"),
]


@pytest.fixture
def catalog():
    assert connection.vendor == "postgresql", "Synthetic PostgreSQL required"
    with connection.cursor() as cursor:
        # pytest-django rolls back roles, defaults and DDL together per test.
        cursor.execute("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE security_probe_parent")
        cursor.execute("SELECT current_user")
        creator = cursor.fetchone()[0]
        quoted_creator = connection.ops.quote_name(creator)
        cursor.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated")
        cursor.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated")
        cursor.execute("REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated")
        cursor.execute("REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated")
        cursor.execute("SELECT relname FROM pg_catalog.pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p')")
        for (table,) in cursor.fetchall():
            cursor.execute(f"ALTER TABLE public.{connection.ops.quote_name(table)} ENABLE ROW LEVEL SECURITY")
        for scope in ("", "IN SCHEMA public"):
            for kind in ("TABLES", "SEQUENCES", "FUNCTIONS"):
                cursor.execute(f"ALTER DEFAULT PRIVILEGES FOR ROLE {quoted_creator} {scope} REVOKE ALL ON {kind} FROM PUBLIC, anon, authenticated")
        cursor.execute("CREATE TABLE public.security_probe (id integer, tenant_id integer)")
        cursor.execute("ALTER TABLE public.security_probe ENABLE ROW LEVEL SECURITY")
        yield cursor, creator


def report(catalog):
    cursor, creator = catalog
    return audit_public_schema(cursor, [creator])


def codes(catalog):
    return {f["code"] for f in report(catalog)["findings"]}


def test_clean_contract_and_new_table_regression(catalog):
    assert report(catalog)["status"] == "pass"
    cursor, _ = catalog
    cursor.execute("CREATE TABLE public.security_new_table (id integer)")
    assert codes(catalog) == {"rls_disabled"}  # safe defaults alone do not enable RLS
    cursor.execute("ALTER TABLE public.security_new_table ENABLE ROW LEVEL SECURITY")
    assert report(catalog)["status"] == "pass"
    assert report(catalog)["counts"]["tables"] >= 2


@pytest.mark.parametrize("sql,expected", [
    ("GRANT SELECT ON public.security_probe TO anon", "table_grant"),
    ("GRANT UPDATE ON public.security_probe TO authenticated", "table_grant"),
    ("GRANT TRUNCATE ON public.security_probe TO PUBLIC", "table_grant"),
    ("GRANT SELECT (tenant_id) ON public.security_probe TO anon", "column_grant"),
    ("GRANT USAGE ON SCHEMA public TO PUBLIC", "schema_grant"),
    ("GRANT CREATE ON SCHEMA public TO authenticated", "schema_grant"),
    ("GRANT security_probe_parent TO anon; GRANT SELECT ON public.security_probe TO security_probe_parent", "table_grant"),
    ("CREATE SEQUENCE public.security_probe_seq; GRANT USAGE ON public.security_probe_seq TO authenticated", "sequence_grant"),
    ("CREATE POLICY security_probe_policy ON public.security_probe TO PUBLIC USING (false)", "api_policy"),
    ("GRANT security_probe_parent TO authenticated; CREATE POLICY security_probe_policy ON public.security_probe TO security_probe_parent USING (true)", "api_policy"),
    ("ALTER ROLE anon BYPASSRLS", "privileged_api_role"),
])
def test_detects_effective_grants_and_policies_even_without_schema_usage(catalog, sql, expected):
    catalog[0].execute(sql)
    assert expected in codes(catalog)


@pytest.mark.parametrize("declaration,definer", [("SECURITY DEFINER", True), ("SECURITY INVOKER", False)])
def test_function_execute_inherited_from_public(catalog, declaration, definer):
    cursor, _ = catalog
    cursor.execute(f"CREATE FUNCTION public.security_probe_fn() RETURNS int LANGUAGE sql {declaration} AS 'SELECT 1'")
    assert report(catalog)["status"] == "pass"
    cursor.execute("GRANT EXECUTE ON FUNCTION public.security_probe_fn() TO PUBLIC")
    result = report(catalog)
    assert "routine_grant" in {f["code"] for f in result["findings"]}
    assert result["routines"][0]["security_definer"] is definer


@pytest.mark.parametrize("kind", ["VIEW", "MATERIALIZED VIEW"])
def test_views_are_checked_separately_from_table_rls(catalog, kind):
    cursor, _ = catalog
    cursor.execute(f"CREATE {kind} public.security_probe_view AS SELECT id FROM public.security_probe")
    cursor.execute("GRANT SELECT ON public.security_probe_view TO anon")
    assert codes(catalog) == {"view_grant"}
    assert report(catalog)["counts"]["views"] == 1


@pytest.mark.parametrize("scope,kind,privilege", [
    ("", "TABLES", "SELECT"),
    ("IN SCHEMA public", "TABLES", "INSERT"),
    ("", "SEQUENCES", "USAGE"),
    ("IN SCHEMA public", "FUNCTIONS", "EXECUTE"),
    ("", "FUNCTIONS", "EXECUTE"),
])
def test_default_privileges_are_checked_globally_and_per_schema(catalog, scope, kind, privilege):
    cursor, creator = catalog
    quoted = connection.ops.quote_name(creator)
    cursor.execute(f"ALTER DEFAULT PRIVILEGES FOR ROLE {quoted} {scope} GRANT {privilege} ON {kind} TO PUBLIC")
    assert codes(catalog) == {"default_grant"}
    # A schema REVOKE cannot cancel global grants, including built-in EXECUTE.
    if not scope:
        cursor.execute(f"ALTER DEFAULT PRIVILEGES FOR ROLE {quoted} IN SCHEMA public REVOKE ALL ON {kind} FROM PUBLIC")
        assert codes(catalog) == {"default_grant"}


def test_additional_operational_creator_is_not_inferred_from_existing_tables(catalog):
    cursor, creator = catalog
    cursor.execute("CREATE ROLE security_new_creator")
    # No pg_default_acl row: PostgreSQL's built-in PUBLIC EXECUTE still applies.
    result = audit_public_schema(cursor, [creator, "security_new_creator"])
    assert any(f["code"] == "default_grant" and f["object"] == "security_new_creator"
               and f["detail"] == "global:f:EXECUTE" for f in result["findings"])
    result = audit_public_schema(cursor, [creator, "missing'; SELECT 1; --"])
    assert any(f["code"] == "missing_creator_role" for f in result["findings"])


def test_review_plan_can_repair_synthetic_regressions_without_broad_regrants(catalog):
    cursor, creator = catalog
    cursor.execute('CREATE TABLE public."security quoted" ("tenant id" integer)')
    cursor.execute('GRANT SELECT ("tenant id") ON public."security quoted" TO PUBLIC')
    cursor.execute("GRANT security_probe_parent TO anon")
    cursor.execute("GRANT SELECT ON public.security_probe TO security_probe_parent")
    cursor.execute("CREATE FUNCTION public.security_probe_fn() RETURNS int LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'")
    cursor.execute("GRANT EXECUTE ON FUNCTION public.security_probe_fn() TO PUBLIC")
    cursor.execute("GRANT USAGE ON SCHEMA public TO anon")
    cursor.execute("CREATE POLICY security_probe_policy ON public.security_probe TO PUBLIC USING (true)")
    cursor.execute("ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC")
    before = report(catalog)
    assert before["status"] == "fail"
    statements = containment_review_plan(cursor, [creator])
    assert report(catalog)["findings"] == before["findings"]  # generation did not mutate ACL/RLS
    assert any('"tenant id"' in sql for sql in statements)
    assert any('security_probe_parent' in sql for sql in statements)
    # Only this synthetic test executes the plan, under pytest rollback.
    for statement in statements:
        cursor.execute(statement)
    assert report(catalog)["status"] == "pass"


@pytest.mark.django_db(transaction=True)
def test_real_command_transaction_refuses_writes(monkeypatch):
    def attempted_write(cursor, creators):
        cursor.execute("CREATE TABLE public.security_forbidden_write (id integer)")

    monkeypatch.setattr("core.management.commands.check_supabase_security.audit_public_schema", attempted_write)
    with pytest.raises(CommandError, match="Metadata audit failed"):
        call_command("check_supabase_security", "--creator-role", "postgres", stdout=StringIO())
    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.security_forbidden_write')")
        assert cursor.fetchone()[0] is None


def test_plan_review_comments_escape_metadata_newlines(catalog):
    cursor, creator = catalog
    unusual_role = 'security\nprobe_owner'
    quoted = connection.ops.quote_name(unusual_role)
    cursor.execute(f"CREATE ROLE {quoted}")
    cursor.execute(f"GRANT {quoted} TO anon")
    cursor.execute(f"ALTER TABLE public.security_probe OWNER TO {quoted}")
    comments = [sql for sql in containment_review_plan(cursor, [creator]) if sql.startswith("--")]
    assert comments
    assert all("\n" not in sql and "\r" not in sql for sql in comments)
    assert any("security\\nprobe_owner" in sql for sql in comments)
