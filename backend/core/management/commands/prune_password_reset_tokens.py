import json

from django.core.management.base import BaseCommand

from core.maintenance import prune_password_reset_tokens


class Command(BaseCommand):
    help = "Borra tokens de reset de contrasena usados o vencidos."

    def handle(self, *args, **options):
        result = prune_password_reset_tokens()
        self.stdout.write(json.dumps(result, ensure_ascii=False))
