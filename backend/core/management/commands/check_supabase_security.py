import json

from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError, connections, transaction

from core.supabase_security import audit_public_schema, containment_review_plan


class Command(BaseCommand):
    help = "Audit internal public schema metadata without reading rows or changing ACL/RLS."
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("--database", default="default", choices=tuple(connections))
        parser.add_argument("--creator-role", action="append", required=True,
                            help="Actual migration/SQL creator role; repeat for every operational creator.")
        parser.add_argument("--include-sql-plan", action="store_true",
                            help="Include proposed SQL for human review; never execute it.")

    def handle(self, *args, **options):
        database = options["database"]
        connection = connections[database]
        if connection.vendor != "postgresql":
            raise CommandError("PostgreSQL required; SQLite cannot validate ACL/RLS.")
        if connection.in_atomic_block:
            raise CommandError("Run outside an existing transaction to enforce a read-only snapshot.")
        creators = list(dict.fromkeys(role.strip() for role in options["creator_role"]))
        if not all(creators):
            raise CommandError("Creator roles must be nonempty.")
        try:
            with transaction.atomic(using=database):
                with connection.cursor() as cursor:
                    cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
                    cursor.execute("SET LOCAL search_path = pg_catalog")
                    cursor.execute("SET LOCAL statement_timeout = '30s'")
                    report = audit_public_schema(cursor, creators)
                    if options["include_sql_plan"]:
                        report["sql_review_plan"] = containment_review_plan(cursor, creators)
        except DatabaseError:
            # Driver errors may contain hostnames, DSNs or server diagnostics.
            raise CommandError("Metadata audit failed; inspect restricted DB diagnostics, not public logs.") from None
        self.stdout.write(json.dumps(report, indent=2, ensure_ascii=True))
        if report["findings"]:
            raise CommandError("Supabase metadata contract failed; do not publish until reviewed.")
