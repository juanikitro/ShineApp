"""Read-only audit of the internal public schema; never reads application rows."""

import json
from datetime import UTC, datetime

CATALOG = """
WITH api_roles AS (
    SELECT oid, rolname, rolsuper, rolbypassrls FROM pg_catalog.pg_roles
    WHERE rolname IN ('anon', 'authenticated')
), namespace AS (
    SELECT oid, nspowner, nspacl FROM pg_catalog.pg_namespace WHERE nspname = 'public'
), relations AS (
    SELECT c.* FROM pg_catalog.pg_class c
    WHERE c.relnamespace = (SELECT oid FROM namespace)
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
), routines AS (
    SELECT p.* FROM pg_catalog.pg_proc p
    WHERE p.pronamespace = (SELECT oid FROM namespace)
), creators AS (
    -- Ownership does not prove creation, so explicit operational creators are
    -- required as well. Include observed owners as additional defense in depth.
    SELECT oid, rolname FROM pg_catalog.pg_roles
    WHERE rolname = ANY(%s) OR rolname = current_user
       OR oid IN (SELECT relowner FROM relations UNION SELECT proowner FROM routines)
), default_acls AS (
    SELECT c.rolname AS creator, s.scope, t.kind,
           CASE WHEN s.scope = 'global'
                THEN COALESCE(d.defaclacl, pg_catalog.acldefault(t.kind, c.oid))
                ELSE d.defaclacl END AS acl
    FROM creators c
    CROSS JOIN (VALUES ('r'::"char"), ('S'::"char"), ('f'::"char")) t(kind)
    CROSS JOIN (VALUES ('global'), ('public')) s(scope)
    LEFT JOIN pg_catalog.pg_default_acl d
      ON d.defaclrole = c.oid AND d.defaclobjtype = t.kind
      AND d.defaclnamespace = CASE WHEN s.scope = 'global' THEN 0::oid
                                  ELSE (SELECT oid FROM namespace) END
), defaults AS (
    SELECT d.creator, d.scope, d.kind, a.* FROM default_acls d
    -- Empty ACLs mean no grants; PG15 aclexplode rejects zero-dimensional arrays.
    CROSS JOIN LATERAL pg_catalog.aclexplode(
        CASE WHEN pg_catalog.cardinality(d.acl) > 0 THEN d.acl END) a
)
"""

INVENTORY_SQL = CATALOG + """
SELECT
    (SELECT array_agg(rolname ORDER BY rolname) FROM api_roles),
    (SELECT array_agg(rolname ORDER BY rolname) FROM creators),
    (SELECT count(*) FROM namespace),
    (SELECT count(*) FROM relations WHERE relkind IN ('r', 'p')),
    (SELECT count(*) FROM relations WHERE relkind IN ('v', 'm')),
    (SELECT count(*) FROM relations WHERE relkind = 'S'),
    (SELECT count(*) FROM routines),
    (SELECT jsonb_agg(jsonb_build_object(
        'name', relname, 'kind', relkind, 'owner', pg_catalog.pg_get_userbyid(relowner),
        'rls', relrowsecurity, 'options', reloptions) ORDER BY relname) FROM relations),
    (SELECT jsonb_agg(jsonb_build_object(
        'name', proname, 'arguments', pg_catalog.pg_get_function_identity_arguments(oid),
        'kind', prokind, 'owner', pg_catalog.pg_get_userbyid(proowner),
        'security_definer', prosecdef) ORDER BY proname, oid) FROM routines)
"""

FINDINGS_SQL = CATALOG + """
SELECT 'privileged_api_role' AS code, r.rolname AS object, r.rolname AS role,
       'SUPERUSER or BYPASSRLS' AS detail
FROM api_roles r WHERE r.rolsuper OR r.rolbypassrls
UNION ALL
SELECT 'schema_grant', 'public', r.rolname, p.privilege
FROM api_roles r CROSS JOIN namespace n
CROSS JOIN (VALUES ('USAGE'), ('CREATE')) p(privilege)
WHERE pg_catalog.has_schema_privilege(r.oid, n.oid, p.privilege)
UNION ALL
SELECT 'rls_disabled', c.relname, '', 'table requires RLS'
FROM relations c WHERE c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
UNION ALL
SELECT 'foreign_table', c.relname, '', 'foreign tables require separate review; no local RLS'
FROM relations c WHERE c.relkind = 'f'
UNION ALL
SELECT CASE WHEN c.relkind IN ('v', 'm') THEN 'view_grant' ELSE 'table_grant' END,
       c.relname, r.rolname, p.privilege
FROM relations c CROSS JOIN api_roles r
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(privilege)
WHERE c.relkind <> 'S' AND pg_catalog.has_table_privilege(r.oid, c.oid, p.privilege)
UNION ALL
SELECT 'column_grant', c.relname, r.rolname, p.privilege
FROM relations c CROSS JOIN api_roles r
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) p(privilege)
WHERE c.relkind <> 'S' AND pg_catalog.has_any_column_privilege(r.oid, c.oid, p.privilege)
  AND NOT pg_catalog.has_table_privilege(r.oid, c.oid, p.privilege)
UNION ALL
SELECT 'table_additional_grant', c.relname, r.rolname, a.privilege_type
FROM relations c CROSS JOIN api_roles r
CROSS JOIN LATERAL pg_catalog.aclexplode(
    CASE WHEN pg_catalog.cardinality(c.relacl) > 0 THEN c.relacl END) a
WHERE c.relkind <> 'S'
  AND a.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  AND CASE WHEN a.grantee = 0 THEN true ELSE pg_catalog.pg_has_role(r.oid, a.grantee, 'USAGE') END
UNION ALL
SELECT 'sequence_grant', c.relname, r.rolname, p.privilege
FROM relations c CROSS JOIN api_roles r
CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) p(privilege)
WHERE c.relkind = 'S' AND pg_catalog.has_sequence_privilege(r.oid, c.oid, p.privilege)
UNION ALL
SELECT 'routine_grant', p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
       r.rolname, CASE WHEN p.prosecdef THEN 'EXECUTE SECURITY DEFINER' ELSE 'EXECUTE' END
FROM routines p CROSS JOIN api_roles r
WHERE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE')
UNION ALL
SELECT 'api_policy', c.relname, r.rolname, pol.polname
FROM pg_catalog.pg_policy pol JOIN relations c ON c.oid = pol.polrelid
CROSS JOIN api_roles r
WHERE EXISTS (SELECT 1 FROM unnest(pol.polroles) target(oid)
              WHERE CASE WHEN target.oid = 0 THEN true
                    ELSE pg_catalog.pg_has_role(r.oid, target.oid, 'USAGE') END)
UNION ALL
SELECT 'default_grant', d.creator, r.rolname,
       d.scope || ':' || d.kind::text || ':' || d.privilege_type
FROM defaults d CROSS JOIN api_roles r
WHERE CASE WHEN d.grantee = 0 THEN true
           ELSE pg_catalog.pg_has_role(r.oid, d.grantee, 'USAGE') END
ORDER BY 1, 2, 3, 4
"""


PLAN_SQL = CATALOG + """
, raw_acls AS (
    SELECT 'SCHEMA' AS kind, 'public' AS object, n.nspowner AS owner,
           COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner)) AS acl
    FROM namespace n
    UNION ALL
    SELECT CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END,
           pg_catalog.format('public.%%I', c.relname), c.relowner,
           COALESCE(c.relacl, pg_catalog.acldefault(
               CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, c.relowner))
    FROM relations c
    UNION ALL
    SELECT 'ROUTINE', pg_catalog.format('public.%%I(%%s)', p.proname,
        pg_catalog.pg_get_function_identity_arguments(p.oid)), p.proowner,
        COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
    FROM routines p
), acl_sources AS (
    SELECT raw.kind, raw.object, raw.owner, a.* FROM raw_acls raw
    CROSS JOIN LATERAL pg_catalog.aclexplode(
        CASE WHEN pg_catalog.cardinality(raw.acl) > 0 THEN raw.acl END) a
), effective_sources AS (
    SELECT DISTINCT s.* FROM acl_sources s CROSS JOIN api_roles r
    WHERE CASE WHEN s.grantee = 0 THEN true
               ELSE pg_catalog.pg_has_role(r.oid, s.grantee, 'USAGE') END
)
SELECT DISTINCT statement FROM (
    -- JSON labels escape newlines: even hostile metadata must remain a comment.
    SELECT pg_catalog.format('-- REVIEW privileged API role %%s; ACL revocation cannot remove SUPERUSER/BYPASSRLS.', pg_catalog.to_json(rolname)::text) AS statement
    FROM api_roles WHERE rolsuper OR rolbypassrls
    UNION ALL
    SELECT pg_catalog.format('-- REVIEW foreign table %%s separately; no automatic RLS fix.', pg_catalog.to_json(relname)::text)
    FROM relations WHERE relkind = 'f'
    UNION ALL
    SELECT pg_catalog.format('REVOKE ALL ON %%s %%s FROM %%s;', s.kind, s.object,
        CASE WHEN s.grantee = 0 THEN 'PUBLIC'
             ELSE pg_catalog.quote_ident(pg_catalog.pg_get_userbyid(s.grantee)) END)
    FROM effective_sources s WHERE s.grantee <> s.owner
    UNION ALL
    SELECT pg_catalog.format('-- REVIEW ownership/membership of %%s; REVOKE cannot remove implicit owner privileges.',
        pg_catalog.to_json(pg_catalog.pg_get_userbyid(s.owner))::text)
    FROM effective_sources s WHERE s.grantee = s.owner
    UNION ALL
    SELECT pg_catalog.format('REVOKE ALL (%%I) ON TABLE public.%%I FROM %%s;', col.attname, c.relname,
        CASE WHEN a.grantee = 0 THEN 'PUBLIC'
             ELSE pg_catalog.quote_ident(pg_catalog.pg_get_userbyid(a.grantee)) END)
    FROM relations c JOIN pg_catalog.pg_attribute col ON col.attrelid = c.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(
        CASE WHEN pg_catalog.cardinality(col.attacl) > 0 THEN col.attacl END) a
    CROSS JOIN api_roles r
    WHERE col.attnum > 0 AND NOT col.attisdropped
      AND CASE WHEN a.grantee = 0 THEN true ELSE pg_catalog.pg_has_role(r.oid, a.grantee, 'USAGE') END
    UNION ALL
    SELECT pg_catalog.format('ALTER TABLE public.%%I ENABLE ROW LEVEL SECURITY;', relname)
    FROM relations WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
    UNION ALL
    SELECT pg_catalog.format('DROP POLICY %%I ON public.%%I;', pol.polname, c.relname)
    FROM pg_catalog.pg_policy pol JOIN relations c ON c.oid = pol.polrelid CROSS JOIN api_roles r
    WHERE EXISTS (SELECT 1 FROM unnest(pol.polroles) target(oid)
                  WHERE CASE WHEN target.oid = 0 THEN true
                        ELSE pg_catalog.pg_has_role(r.oid, target.oid, 'USAGE') END)
    UNION ALL
    SELECT pg_catalog.format('ALTER DEFAULT PRIVILEGES FOR ROLE %%I %%s REVOKE ALL ON %%s FROM %%s;',
        d.creator, CASE WHEN d.scope = 'global' THEN '' ELSE 'IN SCHEMA public' END,
        CASE d.kind WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' ELSE 'FUNCTIONS' END,
        CASE WHEN d.grantee = 0 THEN 'PUBLIC'
             ELSE pg_catalog.quote_ident(pg_catalog.pg_get_userbyid(d.grantee)) END)
    FROM defaults d CROSS JOIN api_roles r
    WHERE d.grantee <> (SELECT oid FROM creators WHERE rolname = d.creator)
      AND CASE WHEN d.grantee = 0 THEN true ELSE pg_catalog.pg_has_role(r.oid, d.grantee, 'USAGE') END
) statements ORDER BY statement
"""


def containment_review_plan(cursor, creator_roles):
    """Generate exact quoted SQL from metadata, without executing any statement."""
    cursor.execute(PLAN_SQL, [creator_roles])
    return [row[0] for row in cursor.fetchall()]


def audit_public_schema(cursor, creator_roles):
    """Caller owns the read-only transaction. Only pg_catalog is queried."""
    cursor.execute(INVENTORY_SQL, [creator_roles])
    roles, creators, schemas, tables, views, sequences, routines, objects, functions = cursor.fetchone()
    cursor.execute(FINDINGS_SQL, [creator_roles])
    findings = [dict(zip(("code", "object", "role", "detail"), row, strict=True)) for row in cursor.fetchall()]
    for role in sorted({"anon", "authenticated"} - set(roles or [])):
        findings.append({"code": "missing_api_role", "object": role, "role": role, "detail": "audit incomplete"})
    for role in sorted(set(creator_roles) - set(creators or [])):
        findings.append({"code": "missing_creator_role", "object": role, "role": role, "detail": "audit incomplete"})
    if not schemas or not tables:
        findings.append({"code": "empty_schema", "object": "public", "role": "", "detail": "audit incomplete"})
    return {
        "checked_at": datetime.now(UTC).isoformat(),
        "scope": "public PostgreSQL metadata only; not Data API configuration, Storage or incident closure",
        "api_roles": roles or [],
        "creator_roles": creators or [],
        "counts": {"tables": tables, "views": views, "sequences": sequences, "routines": routines},
        "relations": json.loads(objects) if isinstance(objects, str) else (objects or []),
        "routines": json.loads(functions) if isinstance(functions, str) else (functions or []),
        "findings": findings,
        "status": "fail" if findings else "pass",
    }
