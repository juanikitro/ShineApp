import json

from django.core.management.base import BaseCommand

from core.maintenance import purge_trash


class Command(BaseCommand):
    help = "Purga registros soft-deleted mas viejos que la retencion. Dry-run por defecto."

    def add_arguments(self, parser):
        parser.add_argument(
            "--older-than",
            type=int,
            default=None,
            dest="older_than",
            help="Dias de retencion (default: settings.TRASH_RETENTION_DAYS).",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Borrar de verdad. Sin esta flag es dry-run (solo reporta).",
        )

    def handle(self, *args, **options):
        result = purge_trash(older_than_days=options["older_than"], apply=options["apply"])
        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))
        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING("DRY-RUN: nada fue borrado. Usa --apply para purgar de verdad.")
            )
