import json

from django.core.management.base import BaseCommand

from core.maintenance import flush_notifications


class Command(BaseCommand):
    help = "Reintenta el envio de las notificaciones pendientes/fallidas de la outbox."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        result = flush_notifications(limit=options["limit"])
        self.stdout.write(json.dumps(result, ensure_ascii=False))
