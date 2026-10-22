import json
from contextlib import nullcontext
from io import StringIO
from unittest.mock import MagicMock

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import DatabaseError

from core.supabase_security import audit_public_schema


def inventory(**overrides):
    data = dict(roles=["anon", "authenticated"], creators=["postgres"], schemas=1,
                tables=1, views=0, sequences=0, routines=0, objects=None, functions=None)
    data.update(overrides)
    return tuple(data.values())


def test_catalog_report_is_metadata_only_and_handles_json_driver_variants():
    cursor = MagicMock()
    cursor.fetchone.return_value = inventory(objects='[{"name": "synthetic"}]', functions=[])
    cursor.fetchall.return_value = [("rls_disabled", "synthetic", "", "table requires RLS")]
    report = audit_public_schema(cursor, ["postgres"])
    assert report["status"] == "fail"
    assert report["relations"] == [{"name": "synthetic"}]
    assert report["findings"][0]["code"] == "rls_disabled"
    assert report["counts"]["tables"] == 1
    assert report["checked_at"].endswith("+00:00")
    for query in cursor.execute.call_args_list:
        assert query.args[1] == [["postgres"]]
        assert "FROM public." not in query.args[0]


@pytest.mark.parametrize("overrides,code", [
    ({"roles": None}, "missing_api_role"),
    ({"creators": None}, "missing_creator_role"),
    ({"schemas": 0}, "empty_schema"),
    ({"tables": 0}, "empty_schema"),
])
def test_incomplete_catalog_never_passes(overrides, code):
    cursor = MagicMock()
    cursor.fetchone.return_value = inventory(**overrides)
    cursor.fetchall.return_value = []
    assert code in {f["code"] for f in audit_public_schema(cursor, ["postgres"])["findings"]}


def test_clean_metadata_report_passes_without_claiming_live_incident_closure():
    cursor = MagicMock()
    cursor.fetchone.return_value = inventory()
    cursor.fetchall.return_value = []
    report = audit_public_schema(cursor, ["postgres"])
    assert report["status"] == "pass"
    assert report["relations"] == report["routines"] == []
    assert "not Data API configuration, Storage or incident closure" in report["scope"]


def command_mocks(monkeypatch, *, findings=None):
    from core.management.commands import check_supabase_security as module

    connection = MagicMock(vendor="postgresql", in_atomic_block=False)
    monkeypatch.setattr(module, "connections", {"default": connection})
    atomic = MagicMock(return_value=nullcontext())
    monkeypatch.setattr(module.transaction, "atomic", atomic)
    audit = MagicMock(return_value={"findings": findings or []})
    monkeypatch.setattr(module, "audit_public_schema", audit)
    return connection, atomic, audit


def test_command_enforces_readonly_snapshot_and_deduplicates_creators(monkeypatch):
    connection, atomic, audit = command_mocks(monkeypatch)
    output = StringIO()
    call_command("check_supabase_security", "--creator-role", " postgres ", "--creator-role", "postgres", stdout=output)
    atomic.assert_called_once_with(using="default")
    cursor = connection.cursor.return_value.__enter__.return_value
    assert cursor.execute.call_args_list[0].args[0] == "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"
    audit.assert_called_once_with(cursor, ["postgres"])
    assert json.loads(output.getvalue()) == {"findings": []}


@pytest.mark.parametrize("vendor,atomic,creators,message", [
    ("sqlite", False, ["postgres"], "PostgreSQL required"),
    ("postgresql", True, ["postgres"], "existing transaction"),
    ("postgresql", False, [" "], "nonempty"),
])
def test_command_rejects_unsupported_or_ambiguous_context(monkeypatch, vendor, atomic, creators, message):
    connection, _, audit = command_mocks(monkeypatch)
    connection.vendor, connection.in_atomic_block = vendor, atomic
    with pytest.raises(CommandError, match=message):
        call_command("check_supabase_security", creator_role=creators)
    audit.assert_not_called()


def test_command_requires_an_explicit_operational_creator():
    with pytest.raises(CommandError, match="creator-role"):
        call_command("check_supabase_security")


def test_command_emits_findings_and_fails(monkeypatch):
    command_mocks(monkeypatch, findings=[{"code": "rls_disabled"}])
    output = StringIO()
    with pytest.raises(CommandError, match="contract failed"):
        call_command("check_supabase_security", creator_role=["postgres"], stdout=output)
    assert json.loads(output.getvalue())["findings"] == [{"code": "rls_disabled"}]


def test_command_sql_plan_is_optional_and_never_executed(monkeypatch):
    connection, _, _ = command_mocks(monkeypatch)
    plan = MagicMock(return_value=["REVOKE ALL ON SCHEMA public FROM PUBLIC;"])
    monkeypatch.setattr("core.management.commands.check_supabase_security.containment_review_plan", plan)
    output = StringIO()
    call_command("check_supabase_security", "--creator-role", "postgres", "--include-sql-plan", stdout=output)
    assert json.loads(output.getvalue())["sql_review_plan"] == plan.return_value
    cursor = connection.cursor.return_value.__enter__.return_value
    assert all(not call.args[0].startswith("REVOKE") for call in cursor.execute.call_args_list)


def test_command_redacts_database_errors(monkeypatch, capsys):
    _, _, audit = command_mocks(monkeypatch)
    audit.side_effect = DatabaseError("sensitive connection diagnostics")
    with pytest.raises(CommandError, match="Metadata audit failed") as error:
        call_command("check_supabase_security", creator_role=["postgres"])
    assert "sensitive" not in str(error.value)
    assert "sensitive" not in capsys.readouterr().out
