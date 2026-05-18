import os
from datetime import date, time
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from inventory.models import Material
from scheduling.models import DailyCapacity, Reservation


DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_EMPLOYEE_PASSWORD = "empleado123"
DEFAULT_SUPERADMIN_PASSWORD = "admin123"


def env_flag(name):
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


class Command(BaseCommand):
    help = "Carga datos minimos e idempotentes para probar el MVP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Confirma que el target de base de datos fue revisado.",
        )
        parser.add_argument(
            "--allow-default-passwords",
            action="store_true",
            help="Permite usar passwords demo conocidos en entornos production-like.",
        )
        parser.add_argument(
            "--create-superadmin",
            action="store_true",
            help="Crea o actualiza el superadmin de Django admin.",
        )
        parser.add_argument("--admin-password", default=os.getenv("SEED_DEMO_ADMIN_PASSWORD"))
        parser.add_argument("--employee-password", default=os.getenv("SEED_DEMO_EMPLOYEE_PASSWORD"))
        parser.add_argument("--superadmin-password", default=os.getenv("SEED_DEMO_SUPERADMIN_PASSWORD"))

    def production_like_target(self):
        settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
        database_url = os.getenv("DATABASE_URL", "")
        return (
            settings_module.endswith("settings_production")
            or "supabase.co" in database_url
            or "pooler.supabase.com" in database_url
        )

    def resolve_password(self, *, explicit_value, default_value, label, production_like, allow_defaults):
        if explicit_value:
            return explicit_value
        if production_like and not allow_defaults:
            raise CommandError(
                f"{label} password is required for this target. "
                f"Set SEED_DEMO_{label.upper()}_PASSWORD or pass --{label.lower()}-password."
            )
        return default_value

    @transaction.atomic
    def handle(self, *args, **options):
        production_like = self.production_like_target()
        allow_defaults = options["allow_default_passwords"] or env_flag("SEED_DEMO_ALLOW_DEFAULT_PASSWORDS")

        if production_like and not options["yes"]:
            database_name = settings.DATABASES["default"].get("NAME", "")
            raise CommandError(
                "Refusing to seed a production-like target without --yes. "
                f"Reviewed database name: {database_name!r}."
            )

        admin_password = self.resolve_password(
            explicit_value=options["admin_password"],
            default_value=DEFAULT_ADMIN_PASSWORD,
            label="admin",
            production_like=production_like,
            allow_defaults=allow_defaults,
        )
        employee_password = self.resolve_password(
            explicit_value=options["employee_password"],
            default_value=DEFAULT_EMPLOYEE_PASSWORD,
            label="employee",
            production_like=production_like,
            allow_defaults=allow_defaults,
        )
        superadmin_password = None
        if options["create_superadmin"]:
            superadmin_password = self.resolve_password(
                explicit_value=options["superadmin_password"],
                default_value=DEFAULT_SUPERADMIN_PASSWORD,
                label="superadmin",
                production_like=production_like,
                allow_defaults=allow_defaults,
            )

        user_model = get_user_model()
        employer_group, _ = Group.objects.get_or_create(name="empleador")
        employee_group, _ = Group.objects.get_or_create(name="empleado")
        business = BusinessAccount.get_default()
        BusinessProfile.get_solo(business=business)

        if options["create_superadmin"]:
            superadmin, _ = user_model.objects.get_or_create(
                username="superadmin",
                defaults={"is_staff": True, "is_superuser": True, "email": "superadmin@shineapp.local"},
            )
            superadmin.set_password(superadmin_password)
            superadmin.is_staff = True
            superadmin.is_superuser = True
            superadmin.save(update_fields=["password", "is_staff", "is_superuser"])

        admin, _ = user_model.objects.get_or_create(
            username="admin",
            defaults={"is_staff": False, "is_superuser": False, "email": "admin@shineapp.local"},
        )
        admin.set_password(admin_password)
        admin.is_staff = False
        admin.is_superuser = False
        admin.save(update_fields=["password", "is_staff", "is_superuser"])
        admin.groups.add(employer_group)
        UserProfile.objects.update_or_create(user=admin, defaults={"business": business})

        employee, _ = user_model.objects.get_or_create(
            username="empleado",
            defaults={"email": "empleado@shineapp.local"},
        )
        employee.set_password(employee_password)
        employee.is_staff = False
        employee.is_superuser = False
        employee.save(update_fields=["password", "is_staff", "is_superuser"])
        employee.groups.add(employee_group)
        UserProfile.objects.update_or_create(user=employee, defaults={"business": business})

        customer, _ = Customer.objects.get_or_create(
            business=business,
            name="Juan Perez",
            defaults={"phone": "1122334455", "email": "juan@example.com"},
        )
        vehicle, _ = Vehicle.objects.get_or_create(
            license_plate="AB123CD",
            defaults={"business": business, "customer": customer, "brand": "Ford", "model": "Focus", "color": "Gris"},
        )
        service, _ = Service.objects.get_or_create(
            business=business,
            name="Lavado premium",
            defaults={
                "service_type": Service.ServiceType.WASH,
                "base_price": Decimal("15000.00"),
                "estimated_duration_minutes": 90,
            },
        )
        Material.objects.get_or_create(
            business=business,
            name="Shampoo neutro",
            defaults={"unit": "ml", "stock_quantity": Decimal("1000.00"), "estimated_unit_cost": Decimal("2.50")},
        )
        DailyCapacity.objects.get_or_create(business=business, day=date.today(), defaults={"max_slots": 8})
        Reservation.objects.get_or_create(
            business=business,
            customer=customer,
            vehicle=vehicle,
            service=service,
            day=date.today(),
            start_time=time(10, 0),
            defaults={"status": Reservation.Status.CONFIRMED},
        )

        credentials = "admin and empleado users are ready."
        if allow_defaults:
            credentials = "admin/admin123 and empleado/empleado123 are ready."
        if options["create_superadmin"]:
            credentials += " Django admin superadmin user is ready."

        self.stdout.write(self.style.SUCCESS(f"Demo seed finished. {credentials}"))
