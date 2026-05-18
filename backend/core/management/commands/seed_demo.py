from datetime import date, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from inventory.models import Material
from scheduling.models import DailyCapacity, Reservation


class Command(BaseCommand):
    help = "Carga datos minimos para probar el MVP."

    def handle(self, *args, **options):
        user_model = get_user_model()
        employer_group, _ = Group.objects.get_or_create(name="empleador")
        employee_group, _ = Group.objects.get_or_create(name="empleado")
        business = BusinessAccount.get_default()
        BusinessProfile.get_solo(business=business)

        user_model.objects.get_or_create(
            username="superadmin",
            defaults={"is_staff": True, "is_superuser": True, "email": "superadmin@shineapp.local"},
        )
        superadmin = user_model.objects.get(username="superadmin")
        superadmin.set_password("admin123")
        superadmin.is_staff = True
        superadmin.is_superuser = True
        superadmin.save()

        user_model.objects.get_or_create(username="admin", defaults={"is_staff": False, "is_superuser": False})
        admin = user_model.objects.get(username="admin")
        admin.set_password("admin123")
        admin.is_staff = False
        admin.is_superuser = False
        admin.save()
        admin.groups.add(employer_group)
        UserProfile.objects.get_or_create(user=admin, defaults={"business": business})

        employee, _ = user_model.objects.get_or_create(username="empleado", defaults={"email": ""})
        employee.set_password("empleado123")
        employee.is_staff = False
        employee.is_superuser = False
        employee.save()
        employee.groups.add(employee_group)
        UserProfile.objects.get_or_create(user=employee, defaults={"business": business})

        customer, _ = Customer.objects.get_or_create(
            business=business,
            name="Juan Perez",
            defaults={"phone": "1122334455", "email": "juan@example.com"},
        )
        vehicle, _ = Vehicle.objects.get_or_create(
            license_plate="AB123CD",
            defaults={"customer": customer, "brand": "Ford", "model": "Focus", "color": "Gris"},
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
            customer=customer,
            vehicle=vehicle,
            service=service,
            day=date.today(),
            start_time=time(10, 0),
            defaults={"status": Reservation.Status.CONFIRMED},
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo listo. App: admin / admin123 y empleado / empleado123. Django admin: superadmin / admin123"
            )
        )
