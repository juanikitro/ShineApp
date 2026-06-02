import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Crea el superusuario de Django admin si todavia no existe. "
        "Idempotente: pensado para correr en CI despues de las migraciones. "
        "Si el usuario ya existe no lo modifica ni resetea su password."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default=os.getenv("DJANGO_SUPERUSER_USERNAME"),
            help="Por defecto toma la variable de entorno DJANGO_SUPERUSER_USERNAME.",
        )
        parser.add_argument(
            "--email",
            default=os.getenv("DJANGO_SUPERUSER_EMAIL", ""),
            help="Por defecto toma DJANGO_SUPERUSER_EMAIL (opcional).",
        )
        parser.add_argument(
            "--password",
            default=os.getenv("DJANGO_SUPERUSER_PASSWORD"),
            help="Por defecto toma DJANGO_SUPERUSER_PASSWORD.",
        )

    def handle(self, *args, **options):
        username = (options.get("username") or "").strip()
        password = options.get("password") or ""
        email = (options.get("email") or "").strip()

        if not username or not password:
            raise CommandError(
                "Faltan credenciales: defini DJANGO_SUPERUSER_USERNAME y "
                "DJANGO_SUPERUSER_PASSWORD (o pasa --username/--password)."
            )

        user_model = get_user_model()
        existing = user_model.objects.filter(username__iexact=username).first()
        if existing is not None:
            if existing.is_staff and existing.is_superuser:
                self.stdout.write(
                    self.style.SUCCESS(f"Superusuario '{username}' ya existe; sin cambios.")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Ya existe un usuario '{username}' que no es superusuario; "
                        "no se modifica."
                    )
                )
            return

        user_model.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(f"Superusuario '{username}' creado."))
