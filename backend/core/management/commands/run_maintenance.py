import json

from django.core.management.base import BaseCommand

from core.maintenance import run_all


class Command(BaseCommand):
    help = "Corre todos los jobs de mantenimiento idempotentes (outbox, gastos fijos, limpieza)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge",
            action="store_true",
            help="Purgar de verdad la papelera (destructivo). Sin esto, la papeleria solo se reporta.",
        )

    def handle(self, *args, **options):
        results = run_all(purge_apply=options["purge"])
        self.stdout.write(json.dumps(results, indent=2, ensure_ascii=False))
