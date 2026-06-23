import json

from django.core.management.base import BaseCommand

from core.maintenance import prune_push_subscriptions


class Command(BaseCommand):
    help = "Reporta las suscripciones push activas (las muertas se limpian inline al fallar 404/410)."

    def handle(self, *args, **options):
        result = prune_push_subscriptions()
        self.stdout.write(json.dumps(result, ensure_ascii=False))
