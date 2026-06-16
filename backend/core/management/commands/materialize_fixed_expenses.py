import json

from django.core.management.base import BaseCommand

from core.maintenance import materialize_fixed_expenses


class Command(BaseCommand):
    help = "Materializa las ocurrencias de gastos fijos vencidas hasta hoy (idempotente, todos los negocios)."

    def handle(self, *args, **options):
        result = materialize_fixed_expenses()
        self.stdout.write(json.dumps(result, ensure_ascii=False))
