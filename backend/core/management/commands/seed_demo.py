import os
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from catalog.models import Service
from core.models import (
    AuditLog,
    BusinessAccount,
    BusinessProfile,
    UserProfile,
    default_expense_category_tree,
    default_income_category_tree,
    register_expense_classification,
    register_income_classification,
)
from customers.models import Customer, Vehicle
from debts.models import Debt, DebtPayment
from debts.serializers import sync_debt_cash_movement
from finance.cash import cash_movement_cashflow_effect
from finance.models import CashClosure, CashMovement, Payment
from inventory.models import (
    Material,
    MaterialConsumption,
    MaterialOpenUnit,
    MaterialPurchase,
    StockMovement,
    StockMovementLine,
    Supplier,
    Tool,
)
from inventory.serializers import (
    refresh_material_cost,
    sync_purchase_cash_movement,
    sync_stock_movement_cash_movement,
)
from notifications.models import PublicRequest, PublicRequestItem
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation, ReservationItem
from scheduling.services import ensure_reservation_work_order


DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_EMPLOYEE_PASSWORD = "empleado123"
DEFAULT_SUPERADMIN_PASSWORD = "admin123"
MONEY_ZERO = Decimal("0.00")


def env_flag(name):
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


def aware_at(day, hour=9, minute=0):
    value = datetime.combine(day, time(hour, minute))
    return timezone.make_aware(value) if timezone.is_naive(value) else value


def upsert(model, lookup, defaults):
    obj = model.objects.filter(**lookup).order_by("id").first()
    values = {**lookup, **defaults}
    if obj is None:
        return model.objects.create(**values)
    for field, value in defaults.items():
        setattr(obj, field, value)
    obj.save()
    return obj


def replace_reservation_items(reservation, items):
    reservation.items.all().delete()
    for item in items:
        service = item["service"]
        ReservationItem.objects.create(
            reservation=reservation,
            service=service,
            description=item.get("description") or service.name,
            quantity=item.get("quantity", money("1.00")),
            unit_price=item.get("unit_price", service.base_price),
        )
    ensure_reservation_work_order(reservation)
    order = reservation.work_order
    order.total_amount = reservation.services_total
    order.save(update_fields=["total_amount", "updated_at"])
    return order


def replace_quote_items(quote, items):
    quote.items.all().delete()
    for item in items:
        service = item.get("service")
        QuoteItem.objects.create(
            quote=quote,
            service=service,
            description=item.get("description") or (service.name if service else ""),
            quantity=item.get("quantity", money("1.00")),
            unit_price=item.get("unit_price", service.base_price if service else MONEY_ZERO),
        )
    quote.recalculate()
    return quote


def movement_line_values(movement, material, quantity, unit_price):
    quantity = money(quantity)
    unit_price = money(unit_price)
    if movement.movement_type in [
        StockMovement.MovementType.CONSUMPTION,
        StockMovement.MovementType.SALE,
    ]:
        estimated_unit_cost = material.estimated_unit_cost or MONEY_ZERO
    else:
        estimated_unit_cost = unit_price

    if movement.movement_type == StockMovement.MovementType.PURCHASE:
        stock_delta = quantity if movement.products_received else MONEY_ZERO
    elif movement.movement_type == StockMovement.MovementType.INITIAL_STOCK:
        stock_delta = quantity
    elif movement.movement_type in [
        StockMovement.MovementType.CONSUMPTION,
        StockMovement.MovementType.SALE,
    ]:
        stock_delta = -quantity
    else:
        stock_delta = MONEY_ZERO

    return {
        "quantity": quantity,
        "unit_price": unit_price,
        "line_total": quantity * unit_price,
        "estimated_unit_cost": estimated_unit_cost,
        "estimated_total_cost": estimated_unit_cost * quantity,
        "stock_delta": stock_delta,
    }


def sync_stock_lines(movement, lines):
    movement.lines.all().delete()
    total_amount = MONEY_ZERO
    materials = set()
    for line in lines:
        material = line["material"]
        values = movement_line_values(
            movement,
            material,
            line["quantity"],
            line.get("unit_price", material.estimated_unit_cost or MONEY_ZERO),
        )
        StockMovementLine.objects.create(movement=movement, material=material, **values)
        total_amount += values["line_total"]
        materials.add(material.id)
    movement.total_amount = total_amount
    movement.save(update_fields=["total_amount", "updated_at"])
    for material in Material.objects.filter(id__in=materials):
        refresh_material_cost(material)


class Command(BaseCommand):
    help = "Carga datos demo realistas e idempotentes para probar ShineApp."

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

    def seed_user(self, *, username, password, email, groups, business, first_name="", last_name="", phone=""):
        user_model = get_user_model()
        user, _ = user_model.objects.get_or_create(
            username=username,
            defaults={"email": email, "first_name": first_name, "last_name": last_name},
        )
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_staff = False
        user.is_superuser = False
        user.set_password(password)
        user.save(update_fields=["email", "first_name", "last_name", "is_staff", "is_superuser", "password"])
        for group in groups:
            user.groups.add(group)
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "business": business,
                "phone_country_code": UserProfile.PhoneCountryCode.ARGENTINA,
                "phone_number": phone,
            },
        )
        return user

    def seed_profile(self, business):
        business.name = "Shine Car Detail Studio"
        business.save(update_fields=["name", "updated_at"])
        profile = BusinessProfile.get_solo(business=business)
        profile.name = "Shine Car Detail Studio"
        profile.cuit = "30716123456"
        profile.vat_condition = BusinessProfile.VatCondition.MONOTRIBUTO
        profile.subscription_type = BusinessProfile.SubscriptionType.PREMIUM
        profile.contact_phone = "+54 11 5555-0198"
        profile.contact_email = "hola@shineapp.demo"
        profile.address = "Av. Libertador 2450, Vicente Lopez"
        profile.default_quote_validity_days = 10
        profile.default_quote_tax_rate = money("21.00")
        profile.default_quote_discount_rate = money("5.00")
        profile.default_quote_terms = (
            "La cotizacion conserva precio por 10 dias. El turno se confirma con sena."
        )
        profile.default_quote_payment_instructions = (
            "Transferencia a alias SHINE.DETAIL.DEMO o pago en el local."
        )
        profile.use_reservation_times = True
        profile.show_stay_days_in_agenda = True
        profile.enforce_capacity_limit = True
        profile.public_landing_enabled = True
        profile.public_landing_intro = (
            "Detailing, lavado premium y proteccion ceramica con agenda online."
        )
        profile.allow_public_booking_requests = True
        profile.allow_public_quote_requests = True
        profile.income_category_tree = default_income_category_tree()
        profile.expense_category_tree = default_expense_category_tree()
        profile.save()
        return profile

    def seed_customers(self, business, today):
        birthday = today + timedelta(days=2)
        specs = [
            {
                "name": "Juan Perez",
                "phone": "+54 11 6200-1401",
                "email": "juan.perez@example.com",
                "tax_id": "20301111222",
                "billing_address": "Maipu 844, Florida",
                "birthday_month": 3,
                "birthday_day": 14,
                "notes": "Cliente frecuente. Prefiere lavado por la manana.",
            },
            {
                "name": "Maria Gomez",
                "phone": "+54 11 6120-3321",
                "email": "maria.gomez@example.com",
                "tax_id": "27324444555",
                "billing_address": "Olivos Golf 510, Olivos",
                "birthday_month": birthday.month,
                "birthday_day": birthday.day,
                "notes": "Cumpleanos proximo para probar alertas.",
            },
            {
                "name": "Diego Fernandez",
                "phone": "+54 11 5980-4411",
                "email": "diego.fernandez@example.com",
                "tax_id": "20299888777",
                "billing_address": "San Martin 1200, Martinez",
                "birthday_month": 9,
                "birthday_day": 2,
                "notes": "Consulta siempre antes de aprobar extras.",
            },
            {
                "name": "Valeria Ruiz",
                "phone": "+54 11 6100-9876",
                "email": "valeria.ruiz@example.com",
                "tax_id": "27288777666",
                "billing_address": "Italia 132, San Isidro",
                "birthday_month": 11,
                "birthday_day": 26,
                "notes": "Paga por transferencia.",
            },
            {
                "name": "Estudio Norte SRL",
                "phone": "+54 11 5555-8877",
                "email": "administracion@estudionorte.example",
                "tax_id": "30709876543",
                "billing_address": "Corrientes 1840, CABA",
                "birthday_month": None,
                "birthday_day": None,
                "notes": "Cuenta corporativa con facturacion mensual.",
            },
            {
                "name": "Camila Torres",
                "phone": "+54 11 5111-2200",
                "email": "camila.torres@example.com",
                "tax_id": "27311222333",
                "billing_address": "Parana 320, San Fernando",
                "birthday_month": 6,
                "birthday_day": 7,
                "notes": "Registro inactivo para validar filtros.",
                "is_active": False,
            },
        ]
        return {
            spec["name"]: upsert(
                Customer,
                {"business": business, "name": spec["name"]},
                {
                    "phone": spec["phone"],
                    "email": spec["email"],
                    "tax_id": spec["tax_id"],
                    "billing_address": spec["billing_address"],
                    "birthday_month": spec["birthday_month"],
                    "birthday_day": spec["birthday_day"],
                    "notes": spec["notes"],
                    "is_active": spec.get("is_active", True),
                },
            )
            for spec in specs
        }

    def seed_vehicles(self, business, customers):
        specs = [
            ("AB123CD", "Juan Perez", "Ford", "Focus Titanium", "Gris plata", "Pulido suave en paragolpes trasero."),
            ("AE482LM", "Maria Gomez", "Toyota", "Corolla Cross", "Blanco perla", "Interior con cuero claro."),
            ("AF001ZZ", "Diego Fernandez", "Volkswagen", "Amarok V6", "Negro", "Uso de campo, revisar bajos."),
            ("AG777RX", "Valeria Ruiz", "Peugeot", "208 GT", "Azul", "Cliente solicita fotos del avance."),
            ("AA930NN", "Estudio Norte SRL", "Tesla", "Model 3", "Rojo", "Vehiculo corporativo."),
            ("AC404NO", "Camila Torres", "Jeep", "Renegade", "Verde", "Vehiculo inactivo para pruebas."),
        ]
        vehicles = {}
        for plate, customer_name, brand, model, color, notes in specs:
            vehicles[plate] = upsert(
                Vehicle,
                {"business": business, "license_plate": plate},
                {
                    "customer": customers[customer_name],
                    "brand": brand,
                    "model": model,
                    "color": color,
                    "notes": notes,
                    "is_active": customer_name != "Camila Torres",
                },
            )
        return vehicles

    def seed_services(self, business):
        from catalog.sector_defaults import ensure_default_sectors

        sectors = ensure_default_sectors(business)
        sectors["lavadero"].default_capacity = 8
        sectors["lavadero"].save(update_fields=["default_capacity", "updated_at"])
        sectors["detailing"].default_capacity = 4
        sectors["detailing"].save(update_fields=["default_capacity", "updated_at"])

        specs = [
            ("Lavado exterior express", "wash", "lavadero", "9500.00", 45, "Lavado exterior y secado con microfibra."),
            ("Lavado premium", "spark", "lavadero", "18000.00", 90, "Exterior, interior, llantas y terminacion rapida."),
            ("Detailing interior profundo", "seat", "detailing", "52000.00", 240, "Limpieza profunda de tapizados, plasticos y baul."),
            ("Correccion de pintura one step", "polish", "detailing", "85000.00", 360, "Pulido de un paso para recuperar brillo."),
            ("Tratamiento ceramico 12 meses", "shield", "detailing", "145000.00", 480, "Descontaminado, correccion liviana y coating."),
            ("Combo venta pre entrega", "combo", "lavadero", "118000.00", 420, "Interior profundo, lavado premium y proteccion express."),
        ]
        return {
            name: upsert(
                Service,
                {"business": business, "name": name},
                {
                    "icon": icon,
                    "sector": sectors[sector_key],
                    "base_price": money(price),
                    "estimated_duration_minutes": duration,
                    "notes": notes,
                    "is_active": True,
                },
            )
            for name, icon, sector_key, price, duration, notes in specs
        }

    def seed_reservations(self, business, customers, vehicles, services, today):
        specs = [
            {
                "customer": "Juan Perez",
                "vehicle": "AB123CD",
                "day": today,
                "start": time(9, 0),
                "exit": time(11, 0),
                "status": Reservation.Status.CONFIRMED,
                "items": ["Lavado premium"],
                "notes": "Confirmado por WhatsApp. Revisar llantas delanteras.",
            },
            {
                "customer": "Maria Gomez",
                "vehicle": "AE482LM",
                "day": today,
                "start": time(11, 30),
                "exit": time(16, 0),
                "status": Reservation.Status.IN_PROGRESS,
                "items": ["Detailing interior profundo", "Lavado exterior express"],
                "notes": "En proceso. Interior claro con manchas de cafe.",
            },
            {
                "customer": "Estudio Norte SRL",
                "vehicle": "AA930NN",
                "day": today,
                "start": time(15, 30),
                "exit": time(18, 30),
                "status": Reservation.Status.READY,
                "items": ["Combo venta pre entrega"],
                "notes": "Listo para entregar, falta cobrar saldo.",
            },
            {
                "customer": "Diego Fernandez",
                "vehicle": "AF001ZZ",
                "day": today + timedelta(days=1),
                "start": time(10, 0),
                "exit_day": today + timedelta(days=2),
                "exit": time(17, 30),
                "status": Reservation.Status.PENDING,
                "items": ["Tratamiento ceramico 12 meses"],
                "notes": "Pendiente de sena. Trabajo de dos dias.",
            },
            {
                "customer": "Valeria Ruiz",
                "vehicle": "AG777RX",
                "day": today + timedelta(days=2),
                "start": time(8, 30),
                "exit": time(15, 0),
                "status": Reservation.Status.CONFIRMED,
                "items": ["Correccion de pintura one step", "Lavado premium"],
                "notes": "Quiere fotos antes/despues.",
            },
            {
                "customer": "Juan Perez",
                "vehicle": "AB123CD",
                "day": today - timedelta(days=1),
                "start": time(14, 0),
                "exit": time(16, 0),
                "status": Reservation.Status.DELIVERED,
                "items": ["Lavado premium"],
                "notes": "Entregado con pago completo.",
            },
            {
                "customer": "Estudio Norte SRL",
                "vehicle": "AA930NN",
                "day": today - timedelta(days=8),
                "start": time(9, 30),
                "exit_day": today - timedelta(days=7),
                "exit": time(18, 0),
                "status": Reservation.Status.DELIVERED,
                "items": ["Tratamiento ceramico 12 meses", "Detailing interior profundo"],
                "notes": "Trabajo corporativo facturado.",
            },
            {
                "customer": "Camila Torres",
                "vehicle": "AC404NO",
                "day": today - timedelta(days=3),
                "start": time(12, 0),
                "exit": time(14, 0),
                "status": Reservation.Status.CANCELED,
                "items": ["Lavado exterior express"],
                "notes": "Cancelado por lluvia.",
            },
        ]
        reservations = {}
        for spec in specs:
            customer = customers[spec["customer"]]
            vehicle = vehicles[spec["vehicle"]]
            service_objects = [services[name] for name in spec["items"]]
            reservation = upsert(
                Reservation,
                {
                    "business": business,
                    "customer": customer,
                    "vehicle": vehicle,
                    "day": spec["day"],
                    "start_time": spec["start"],
                },
                {
                    "service": service_objects[0],
                    "exit_day": spec.get("exit_day"),
                    "exit_time": spec.get("exit"),
                    "estimated_duration_minutes": sum(s.estimated_duration_minutes for s in service_objects),
                    "status": spec["status"],
                    "notes": spec["notes"],
                },
            )
            order = replace_reservation_items(
                reservation,
                [{"service": service} for service in service_objects],
            )
            created_at = aware_at(spec["day"], spec["start"].hour, spec["start"].minute)
            Reservation.objects.filter(pk=reservation.pk).update(created_at=created_at, updated_at=created_at)
            WorkOrder = order.__class__
            WorkOrder.objects.filter(pk=order.pk).update(
                received_at=created_at,
                estimated_delivery_at=aware_at(
                    spec.get("exit_day") or spec["day"],
                    spec.get("exit", time(17, 0)).hour,
                    spec.get("exit", time(17, 0)).minute,
                ),
                created_at=created_at,
                updated_at=created_at,
                internal_notes=f"Seed demo: {spec['notes']}",
            )
            reservations[f"{spec['customer']} {spec['day']} {spec['start']}"] = reservation
        return reservations

    def seed_payments_and_cash(self, business, admin, reservations, today):
        orders = {key: reservation.work_order for key, reservation in reservations.items()}
        payment_specs = [
            {
                "order": orders[f"Juan Perez {today - timedelta(days=1)} 14:00:00"],
                "amount": "18000.00",
                "type": Payment.PaymentType.PAYMENT,
                "method": Payment.Method.CASH,
                "paid_at": aware_at(today - timedelta(days=1), 16, 10),
                "notes": "Seed demo: pago completo lavado premium",
            },
            {
                "order": orders[f"Estudio Norte SRL {today - timedelta(days=8)} 09:30:00"],
                "amount": "80000.00",
                "type": Payment.PaymentType.DEPOSIT,
                "method": Payment.Method.TRANSFER,
                "paid_at": aware_at(today - timedelta(days=8), 10, 0),
                "notes": "Seed demo: sena trabajo corporativo",
            },
            {
                "order": orders[f"Estudio Norte SRL {today - timedelta(days=8)} 09:30:00"],
                "amount": "117000.00",
                "type": Payment.PaymentType.PAYMENT,
                "method": Payment.Method.TRANSFER,
                "paid_at": aware_at(today - timedelta(days=7), 18, 15),
                "notes": "Seed demo: saldo trabajo corporativo",
            },
            {
                "order": orders[f"Maria Gomez {today} 11:30:00"],
                "amount": "25000.00",
                "type": Payment.PaymentType.DEPOSIT,
                "method": Payment.Method.CARD,
                "paid_at": aware_at(today, 11, 35),
                "notes": "Seed demo: sena detailing interior",
            },
            {
                "order": orders[f"Estudio Norte SRL {today} 15:30:00"],
                "amount": "50000.00",
                "type": Payment.PaymentType.DEPOSIT,
                "method": Payment.Method.TRANSFER,
                "paid_at": aware_at(today, 15, 40),
                "notes": "Seed demo: anticipo combo pre entrega",
            },
        ]
        for spec in payment_specs:
            payment = upsert(
                Payment,
                {"work_order": spec["order"], "notes": spec["notes"]},
                {
                    "business": business,
                    "amount": money(spec["amount"]),
                    "payment_type": spec["type"],
                    "method": spec["method"],
                    "paid_at": spec["paid_at"],
                },
            )
            category = "Sena" if payment.payment_type == Payment.PaymentType.DEPOSIT else "Pago"
            movement = upsert(
                CashMovement,
                {"payment": payment},
                {
                    "business": business,
                    "movement_type": CashMovement.MovementType.INCOME,
                    "category": category,
                    "subcategory": payment.get_method_display(),
                    "amount": payment.amount,
                    "occurred_at": payment.paid_at,
                    "description": f"Pago orden #{payment.work_order_id}",
                    "created_by": admin,
                },
            )
            register_income_classification(movement.category, movement.subcategory, business=business)

        manual_specs = [
            (
                "Seed demo: aporte inicial de caja",
                CashMovement.MovementType.INCOME,
                "Inversion",
                "Aporte de capital",
                "250000.00",
                aware_at(today - timedelta(days=5), 9, 0),
            ),
            (
                "Seed demo: publicidad Instagram",
                CashMovement.MovementType.EXPENSE,
                "Marketing y ventas",
                "Publicidad",
                "22000.00",
                aware_at(today, 13, 0),
            ),
            (
                "Seed demo: limpieza semanal del local",
                CashMovement.MovementType.EXPENSE,
                "Administracion",
                "Limpieza",
                "18500.00",
                aware_at(today - timedelta(days=2), 18, 0),
            ),
        ]
        for description, movement_type, category, subcategory, amount, occurred_at in manual_specs:
            movement = upsert(
                CashMovement,
                {"business": business, "description": description},
                {
                    "movement_type": movement_type,
                    "category": category,
                    "subcategory": subcategory,
                    "amount": money(amount),
                    "occurred_at": occurred_at,
                    "created_by": admin,
                },
            )
            if movement_type == CashMovement.MovementType.INCOME:
                register_income_classification(category, subcategory, business=business)
            else:
                register_expense_classification(category, subcategory, business=business)

    def seed_inventory(self, business, admin, customers, reservations, today):
        material_specs = [
            ("SHAM-NEU-5L", "Shampoo neutro", "ml", "Shampoo", "Bidon 5L", "6200.00", "450.00", "2.60"),
            ("APC-1L", "APC multiuso", "ml", "Quimicos", "Botella 1L", "1800.00", "300.00", "3.20"),
            ("CERA-SIN-500", "Cera sintetica", "ml", "Ceras", "Pote 500ml", "750.00", "150.00", "18.00"),
            ("MIC-PRO-40", "Microfibra premium", "unidad", "Microfibras", "Pack 10 unidades", "34.00", "8.00", "1450.00"),
            ("COAT-12M-50", "Coating ceramico 12m", "ml", "Abrillantadores", "Frasco 50ml", "85.00", "20.00", "820.00"),
            ("DES-LLA-5L", "Desengrasante llantas", "ml", "Quimicos", "Bidon 5L", "2600.00", "400.00", "2.10"),
        ]
        materials = {}
        for sku, name, unit, category, presentation, stock, minimum, cost in material_specs:
            materials[name] = upsert(
                Material,
                {"business": business, "sku": sku},
                {
                    "name": name,
                    "unit": unit,
                    "category": category,
                    "presentation": presentation,
                    "stock_quantity": money(stock),
                    "minimum_stock": money(minimum),
                    "estimated_unit_cost": money(cost),
                    "notes": "Stock demo para consumos, compras y alertas.",
                    "is_active": True,
                },
            )

        supplier_specs = [
            ("DetailPro Insumos", "DetailPro Insumos SA", "Insumos", "Responsable inscripto", "Laura Mendez"),
            ("Microfibra Sur", "Microfibra Sur SRL", "Accesorios", "Monotributo", "Pablo Sierra"),
            ("Quimica Brillo", "Quimica Brillo SA", "Quimicos", "Responsable inscripto", "Nadia Lopez"),
        ]
        suppliers = {}
        for name, legal_name, category, tax_condition, contact in supplier_specs:
            suppliers[name] = upsert(
                Supplier,
                {"business": business, "name": name},
                {
                    "legal_name": legal_name,
                    "category": category,
                    "tax_condition": tax_condition,
                    "website": "https://proveedores.example",
                    "contact_name": contact,
                    "phone": "+54 11 5555-0101",
                    "email": f"{name.lower().replace(' ', '.')}@example.com",
                    "tax_id": "30700111222",
                    "address": "Parque industrial norte",
                    "notes": "Proveedor demo con historial de compras.",
                    "is_active": True,
                },
            )

        tool_specs = [
            ("Hidrolavadora Karcher HD", 1, Tool.Status.IN_USE, "420000.00", today - timedelta(days=210)),
            ("Aspiradora industrial doble motor", 1, Tool.Status.IN_USE, "285000.00", today - timedelta(days=160)),
            ("Pulidora orbital 15mm", 2, Tool.Status.IN_USE, "190000.00", today - timedelta(days=95)),
            ("Extractor tapizados", 1, Tool.Status.MAINTENANCE, "350000.00", today - timedelta(days=120)),
            ("Lijadora neumática", 1, Tool.Status.RETIRED, "95000.00", today - timedelta(days=420)),
        ]
        for name, quantity, status, value, purchased_at in tool_specs:
            upsert(
                Tool,
                {"business": business, "name": name},
                {
                    "quantity": quantity,
                    "status": status,
                    "unit_value": money(value),
                    "purchased_at": purchased_at,
                    "notes": "Herramienta demo para inventario operativo.",
                    "is_active": status != Tool.Status.RETIRED,
                },
            )

        purchase = upsert(
            MaterialPurchase,
            {"business": business, "material": materials["Microfibra premium"], "observations": "Seed demo: reposicion de microfibras"},
            {
                "purchased_at": today - timedelta(days=4),
                "quantity": money("20.00"),
                "total_cost": money("29000.00"),
                "affects_cash": True,
            },
        )
        sync_purchase_cash_movement(purchase, user=admin)

        movement_specs = [
            {
                "lookup": {"business": business, "movement_type": StockMovement.MovementType.INITIAL_STOCK, "document_number": "DEMO-STOCK-INICIAL"},
                "defaults": {
                    "occurred_on": today - timedelta(days=14),
                    "document_type": StockMovement.DocumentType.OTHER,
                    "products_received": True,
                    "affects_cash": False,
                    "payment_method": StockMovement.PaymentMethod.OTHER,
                    "notes": "Stock inicial cargado para demo.",
                },
                "lines": [
                    ("Shampoo neutro", "5000.00", "2.20"),
                    ("APC multiuso", "2000.00", "2.80"),
                    ("Microfibra premium", "30.00", "1200.00"),
                    ("Coating ceramico 12m", "100.00", "760.00"),
                ],
            },
            {
                "lookup": {"business": business, "movement_type": StockMovement.MovementType.PURCHASE, "document_number": "FC-A-0004-00001234"},
                "defaults": {
                    "occurred_on": today - timedelta(days=6),
                    "supplier": suppliers["DetailPro Insumos"],
                    "document_type": StockMovement.DocumentType.INVOICE_A,
                    "products_received": True,
                    "affects_cash": True,
                    "payment_method": StockMovement.PaymentMethod.TRANSFER,
                    "notes": "Compra recibida y pagada.",
                },
                "lines": [
                    ("Cera sintetica", "900.00", "16.40"),
                    ("Desengrasante llantas", "3000.00", "1.95"),
                ],
            },
            {
                "lookup": {"business": business, "movement_type": StockMovement.MovementType.PURCHASE, "document_number": "FC-B-0003-00000891"},
                "defaults": {
                    "occurred_on": today + timedelta(days=1),
                    "supplier": suppliers["Quimica Brillo"],
                    "document_type": StockMovement.DocumentType.INVOICE_B,
                    "products_received": False,
                    "affects_cash": False,
                    "payment_method": StockMovement.PaymentMethod.TRANSFER,
                    "notes": "Pedido pendiente de recepcion.",
                },
                "lines": [
                    ("Shampoo neutro", "5000.00", "2.75"),
                    ("APC multiuso", "2000.00", "3.05"),
                ],
            },
            {
                "lookup": {"business": business, "movement_type": StockMovement.MovementType.CONSUMPTION, "document_number": "DEMO-CONSUMO-001"},
                "defaults": {
                    "occurred_on": today,
                    "customer": customers["Maria Gomez"],
                    "reservation": reservations[f"Maria Gomez {today} 11:30:00"],
                    "work_order": reservations[f"Maria Gomez {today} 11:30:00"].work_order,
                    "document_type": StockMovement.DocumentType.OTHER,
                    "products_received": True,
                    "affects_cash": False,
                    "payment_method": StockMovement.PaymentMethod.OTHER,
                    "notes": "Consumo operativo del detailing en curso.",
                },
                "lines": [
                    ("APC multiuso", "120.00", "0.00"),
                    ("Microfibra premium", "2.00", "0.00"),
                ],
            },
            {
                "lookup": {"business": business, "movement_type": StockMovement.MovementType.SALE, "document_number": "TK-VENTA-0007"},
                "defaults": {
                    "occurred_on": today,
                    "customer": customers["Juan Perez"],
                    "document_type": StockMovement.DocumentType.TICKET,
                    "products_received": True,
                    "affects_cash": True,
                    "payment_method": StockMovement.PaymentMethod.CASH,
                    "notes": "Venta de microfibras al mostrador.",
                },
                "lines": [
                    ("Microfibra premium", "2.00", "2400.00"),
                ],
            },
        ]
        for spec in movement_specs:
            movement = upsert(StockMovement, spec["lookup"], spec["defaults"])
            sync_stock_lines(
                movement,
                [
                    {
                        "material": materials[material_name],
                        "quantity": quantity,
                        "unit_price": unit_price,
                    }
                    for material_name, quantity, unit_price in spec["lines"]
                ],
            )
            sync_stock_movement_cash_movement(movement, user=admin)

        orders = {key: reservation.work_order for key, reservation in reservations.items()}
        direct_consumption = upsert(
            MaterialConsumption,
            {
                "business": business,
                "work_order": orders[f"Juan Perez {today - timedelta(days=1)} 14:00:00"],
                "material": materials["Shampoo neutro"],
                "observations": "Seed demo: consumo directo lavado entregado",
            },
            {
                "consumed_at": today - timedelta(days=1),
                "quantity": money("80.00"),
                "estimated_unit_cost": materials["Shampoo neutro"].estimated_unit_cost,
                "estimated_total_cost": materials["Shampoo neutro"].estimated_unit_cost * money("80.00"),
            },
        )
        direct_consumption.save()

        open_unit = upsert(
            MaterialOpenUnit,
            {"business": business, "material": materials["Coating ceramico 12m"], "observations": "Seed demo: coating abierto para Amarok"},
            {
                "opened_at": today - timedelta(days=1),
                "opened_by_work_order": orders[f"Diego Fernandez {today + timedelta(days=1)} 10:00:00"],
                "status": MaterialOpenUnit.Status.OPEN,
                "finished_at": None,
                "stock_quantity_to_decrement": money("50.00"),
                "estimated_unit_cost_at_open": materials["Coating ceramico 12m"].estimated_unit_cost,
            },
        )
        upsert(
            MaterialConsumption,
            {
                "business": business,
                "work_order": orders[f"Diego Fernandez {today + timedelta(days=1)} 10:00:00"],
                "material": materials["Coating ceramico 12m"],
                "open_unit": open_unit,
                "observations": "Seed demo: uso de unidad abierta en preparacion",
            },
            {
                "consumed_at": today,
                "quantity": MONEY_ZERO,
                "estimated_unit_cost": open_unit.estimated_unit_cost_at_open,
                "estimated_total_cost": MONEY_ZERO,
            },
        )

        finished_unit = upsert(
            MaterialOpenUnit,
            {"business": business, "material": materials["Cera sintetica"], "observations": "Seed demo: unidad terminada en trabajos previos"},
            {
                "opened_at": today - timedelta(days=12),
                "opened_by_work_order": orders[f"Estudio Norte SRL {today - timedelta(days=8)} 09:30:00"],
                "status": MaterialOpenUnit.Status.FINISHED,
                "finished_at": today - timedelta(days=7),
                "stock_quantity_to_decrement": money("500.00"),
                "estimated_unit_cost_at_open": materials["Cera sintetica"].estimated_unit_cost,
            },
        )
        upsert(
            MaterialConsumption,
            {
                "business": business,
                "work_order": orders[f"Estudio Norte SRL {today - timedelta(days=8)} 09:30:00"],
                "material": materials["Cera sintetica"],
                "open_unit": finished_unit,
                "observations": "Seed demo: aplicacion desde unidad terminada",
            },
            {
                "consumed_at": today - timedelta(days=8),
                "quantity": MONEY_ZERO,
                "estimated_unit_cost": finished_unit.estimated_unit_cost_at_open,
                "estimated_total_cost": MONEY_ZERO,
            },
        )
        return materials, suppliers

    def seed_debts(self, business, admin, suppliers, today):
        debt_specs = [
            {
                "concept": "Factura DetailPro abril",
                "creditor": "",
                "supplier": suppliers["DetailPro Insumos"],
                "principal": "88000.00",
                "origin": today - timedelta(days=12),
                "due": today - timedelta(days=2),
                "category": "Materiales e insumos",
                "subcategory": "Compra de materiales",
                "notes": "Deuda vencida con pago parcial.",
                "payments": [("25000.00", today - timedelta(days=5), DebtPayment.Method.TRANSFER, "Seed demo: pago parcial DetailPro")],
            },
            {
                "concept": "Alquiler local mayo",
                "creditor": "Inmobiliaria Rio",
                "supplier": None,
                "principal": "180000.00",
                "origin": today - timedelta(days=3),
                "due": today + timedelta(days=5),
                "category": "Alquiler",
                "subcategory": "Local",
                "notes": "Deuda por vencer para alertas del dashboard.",
                "payments": [],
            },
            {
                "concept": "Internet fibra mayo",
                "creditor": "NetDemo",
                "supplier": None,
                "principal": "32000.00",
                "origin": today - timedelta(days=9),
                "due": today - timedelta(days=1),
                "category": "Servicios",
                "subcategory": "Internet",
                "notes": "Deuda pagada para probar estados cerrados.",
                "payments": [("32000.00", today - timedelta(days=1), DebtPayment.Method.CARD, "Seed demo: pago total internet")],
            },
        ]
        debts = {}
        for spec in debt_specs:
            debt = upsert(
                Debt,
                {"business": business, "concept": spec["concept"]},
                {
                    "creditor": spec["creditor"],
                    "supplier": spec["supplier"],
                    "principal_amount": money(spec["principal"]),
                    "origin_date": spec["origin"],
                    "due_date": spec["due"],
                    "expense_category": spec["category"],
                    "expense_subcategory": spec["subcategory"],
                    "notes": spec["notes"],
                },
            )
            sync_debt_cash_movement(debt, user=admin)
            for amount, paid_at, method, notes in spec["payments"]:
                upsert(
                    DebtPayment,
                    {"business": business, "debt": debt, "notes": notes},
                    {
                        "amount": money(amount),
                        "paid_at": paid_at,
                        "method": method,
                    },
                )
            debts[spec["concept"]] = debt
        return debts

    def seed_quotes(self, business, customers, vehicles, services, reservations, today):
        specs = [
            {
                "code": "DEMO-Q-0001",
                "customer": "Diego Fernandez",
                "vehicle": "AF001ZZ",
                "status": Quote.Status.DRAFT,
                "date": today,
                "reservation_day": today + timedelta(days=1),
                "reservation_start": time(10, 0),
                "reservation": None,
                "observations": "Cliente pidio revisar proteccion ceramica antes de senar.",
                "items": ["Tratamiento ceramico 12 meses"],
            },
            {
                "code": "DEMO-Q-0002",
                "customer": "Valeria Ruiz",
                "vehicle": "AG777RX",
                "status": Quote.Status.SENT,
                "date": today - timedelta(days=1),
                "reservation_day": today + timedelta(days=2),
                "reservation_start": time(8, 30),
                "reservation": None,
                "observations": "Cotizacion enviada con descuento por combo.",
                "items": ["Correccion de pintura one step", "Lavado premium"],
            },
            {
                "code": "DEMO-Q-0003",
                "customer": "Estudio Norte SRL",
                "vehicle": "AA930NN",
                "status": Quote.Status.ACCEPTED,
                "date": today - timedelta(days=10),
                "reservation_day": today - timedelta(days=8),
                "reservation_start": time(9, 30),
                "reservation": reservations[f"Estudio Norte SRL {today - timedelta(days=8)} 09:30:00"],
                "observations": "Aceptada y convertida a reserva corporativa.",
                "items": ["Tratamiento ceramico 12 meses", "Detailing interior profundo"],
            },
            {
                "code": "DEMO-Q-0004",
                "customer": "Juan Perez",
                "vehicle": "AB123CD",
                "status": Quote.Status.REJECTED,
                "date": today - timedelta(days=20),
                "reservation_day": None,
                "reservation_start": None,
                "reservation": None,
                "observations": "Rechazada por precio, queda para historico.",
                "items": ["Correccion de pintura one step"],
            },
        ]
        quotes = {}
        for spec in specs:
            customer = customers[spec["customer"]]
            vehicle = vehicles[spec["vehicle"]]
            quote = upsert(
                Quote,
                {"business": business, "public_code": spec["code"]},
                {
                    "customer": customer,
                    "vehicle": vehicle,
                    "reservation": spec["reservation"],
                    "reservation_day": spec["reservation_day"],
                    "reservation_start_time": spec["reservation_start"],
                    "quote_date": spec["date"],
                    "valid_until": spec["date"] + timedelta(days=10),
                    "status": spec["status"],
                    "sent_at": aware_at(spec["date"], 12, 0) if spec["status"] in [Quote.Status.SENT, Quote.Status.ACCEPTED] else None,
                    "observations": spec["observations"],
                    "business_name": BusinessProfile.get_solo(business=business).name,
                    "business_address": BusinessProfile.get_solo(business=business).address,
                    "business_cuit": BusinessProfile.get_solo(business=business).cuit,
                    "business_vat_condition_label": BusinessProfile.get_solo(business=business).get_vat_condition_display(),
                    "business_contact_phone": BusinessProfile.get_solo(business=business).contact_phone,
                    "business_contact_email": BusinessProfile.get_solo(business=business).contact_email,
                    "customer_snapshot_name": customer.name,
                    "customer_snapshot_tax_id": customer.tax_id,
                    "customer_snapshot_billing_address": customer.billing_address,
                    "customer_snapshot_phone": customer.phone,
                    "customer_snapshot_email": customer.email,
                    "vehicle_snapshot_label": str(vehicle),
                    "tax_rate": money("21.00"),
                    "discount_rate": money("5.00"),
                    "terms": "Valida por 10 dias. Sena requerida para bloquear agenda.",
                    "payment_instructions": "Alias SHINE.DETAIL.DEMO.",
                },
            )
            replace_quote_items(
                quote,
                [{"service": services[name]} for name in spec["items"]],
            )
            quotes[spec["code"]] = quote
        return quotes

    def seed_public_requests(self, business, services, quotes, reservations, today):
        specs = [
            {
                "type": PublicRequest.RequestType.BOOKING,
                "status": PublicRequest.Status.PENDING,
                "email": "lucas.publico@example.com",
                "name": "Lucas Arce",
                "phone": "+54 11 6400-1190",
                "plate": "AH221QP",
                "brand": "Renault",
                "model": "Kangoo",
                "color": "Blanco",
                "day": today + timedelta(days=3),
                "time": time(9, 0),
                "message": "Quiere turno temprano para lavado premium.",
                "items": ["Lavado premium"],
            },
            {
                "type": PublicRequest.RequestType.QUOTE,
                "status": PublicRequest.Status.PENDING,
                "email": "sofia.publico@example.com",
                "name": "Sofia Martin",
                "phone": "+54 11 6400-9911",
                "plate": "AI882QQ",
                "brand": "Honda",
                "model": "HR-V",
                "color": "Gris",
                "day": today + timedelta(days=6),
                "time": time(12, 0),
                "message": "Pide cotizacion para interior y correccion one step.",
                "items": ["Detailing interior profundo", "Correccion de pintura one step"],
            },
            {
                "type": PublicRequest.RequestType.QUOTE,
                "status": PublicRequest.Status.CONVERTED,
                "email": "corporativo.publico@example.com",
                "name": "Compras Estudio Norte",
                "phone": "+54 11 5555-7788",
                "plate": "AA930NN",
                "brand": "Tesla",
                "model": "Model 3",
                "color": "Rojo",
                "day": today - timedelta(days=8),
                "time": time(9, 30),
                "message": "Convertida a cotizacion aceptada.",
                "items": ["Tratamiento ceramico 12 meses"],
                "quote": quotes["DEMO-Q-0003"],
            },
            {
                "type": PublicRequest.RequestType.BOOKING,
                "status": PublicRequest.Status.CONVERTED,
                "email": "diego.fernandez@example.com",
                "name": "Diego Fernandez",
                "phone": "+54 11 5980-4411",
                "plate": "AF001ZZ",
                "brand": "Volkswagen",
                "model": "Amarok V6",
                "color": "Negro",
                "day": today + timedelta(days=1),
                "time": time(10, 0),
                "message": "Solicitud publica convertida a turno.",
                "items": ["Tratamiento ceramico 12 meses"],
                "reservation": reservations[f"Diego Fernandez {today + timedelta(days=1)} 10:00:00"],
            },
            {
                "type": PublicRequest.RequestType.BOOKING,
                "status": PublicRequest.Status.ARCHIVED,
                "email": "archivo.publico@example.com",
                "name": "Consulta archivada",
                "phone": "+54 11 6000-0000",
                "plate": "ZZ999ZZ",
                "brand": "Fiat",
                "model": "Cronos",
                "color": "Azul",
                "day": today - timedelta(days=2),
                "time": time(17, 0),
                "message": "Solicitud archivada por datos insuficientes.",
                "items": ["Lavado exterior express"],
            },
        ]
        for spec in specs:
            public_request = upsert(
                PublicRequest,
                {"business": business, "request_type": spec["type"], "customer_email": spec["email"]},
                {
                    "status": spec["status"],
                    "customer_name": spec["name"],
                    "customer_phone": spec["phone"],
                    "vehicle_license_plate": spec["plate"],
                    "vehicle_brand": spec["brand"],
                    "vehicle_model": spec["model"],
                    "vehicle_color": spec["color"],
                    "preferred_day": spec["day"],
                    "preferred_time": spec["time"],
                    "message": spec["message"],
                    "ip_address": "127.0.0.1",
                    "user_agent": "SeedDemo/1.0",
                    "converted_reservation": spec.get("reservation"),
                    "converted_quote": spec.get("quote"),
                    "converted_at": timezone.now() if spec["status"] == PublicRequest.Status.CONVERTED else None,
                    "archived_at": timezone.now() if spec["status"] == PublicRequest.Status.ARCHIVED else None,
                },
            )
            public_request.items.all().delete()
            for service_name in spec["items"]:
                PublicRequestItem.objects.create(
                    public_request=public_request,
                    service=services[service_name],
                    description=services[service_name].name,
                    quantity=money("1.00"),
                )

    def seed_cash_closure(self, business, admin, day):
        movements = list(
            CashMovement.objects.select_related("payment", "material_purchase", "stock_movement", "debt").filter(
                business=business,
                occurred_at__date=day,
            )
        )
        total_income = sum((m.amount for m in movements if m.movement_type == CashMovement.MovementType.INCOME), MONEY_ZERO)
        total_expense = sum((m.amount for m in movements if m.movement_type == CashMovement.MovementType.EXPENSE), MONEY_ZERO)
        cashflow_movements = [movement for movement in movements if cash_movement_cashflow_effect(movement)]
        cashflow_income = sum((m.amount for m in cashflow_movements if m.movement_type == CashMovement.MovementType.INCOME), MONEY_ZERO)
        cashflow_expense = sum((m.amount for m in cashflow_movements if m.movement_type == CashMovement.MovementType.EXPENSE), MONEY_ZERO)
        debt_payments = DebtPayment.objects.filter(business=business, paid_at=day)
        cashflow_expense += sum((payment.amount for payment in debt_payments), MONEY_ZERO)
        return upsert(
            CashClosure,
            {"business": business, "day": day},
            {
                "total_income": total_income,
                "total_expense": total_expense,
                "balance": total_income - total_expense,
                "cashflow_income": cashflow_income,
                "cashflow_expense": cashflow_expense,
                "cashflow_balance": cashflow_income - cashflow_expense,
                "closed_by": admin,
                "closed_at": aware_at(day, 20, 0),
                "notes": "Seed demo: cierre de caja historico.",
            },
        )

    def seed_audit_log(self, business, admin, today):
        specs = [
            ("create", "customers", "Customer", "Maria Gomez", today),
            ("update", "inventory", "Material", "Shampoo neutro", today),
            ("close", "finance", "CashClosure", "Cierre caja demo", today - timedelta(days=1)),
            ("convert", "notifications", "PublicRequest", "Diego Fernandez", today),
            ("mark_sent", "quotes", "Quote", "DEMO-Q-0002", today - timedelta(days=1)),
        ]
        for action, module, entity_type, label, day in specs:
            upsert(
                AuditLog,
                {
                    "business": business,
                    "action": action,
                    "module": module,
                    "entity_type": entity_type,
                    "entity_label": label,
                },
                {
                    "actor": admin,
                    "actor_username": admin.username,
                    "actor_email": admin.email,
                    "actor_role": "empleador",
                    "entity_id": label,
                    "before": None,
                    "after": {"demo": True, "label": label},
                    "changes": {"seed_demo": True},
                    "metadata": {"source": "seed_demo"},
                    "request_path": f"/api/{module}/",
                    "request_method": "POST",
                    "created_at": aware_at(day, 12, 0),
                },
            )

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
        profile = self.seed_profile(business)
        today = timezone.localdate()

        if options["create_superadmin"]:
            superadmin, _ = user_model.objects.get_or_create(
                username="superadmin",
                defaults={"is_staff": True, "is_superuser": True, "email": "superadmin@shineapp.local"},
            )
            superadmin.email = "superadmin@shineapp.local"
            superadmin.set_password(superadmin_password)
            superadmin.is_staff = True
            superadmin.is_superuser = True
            superadmin.save(update_fields=["email", "password", "is_staff", "is_superuser"])

        admin = self.seed_user(
            username="admin",
            password=admin_password,
            email="admin@shineapp.local",
            first_name="Ana",
            last_name="Duarte",
            phone="1155550100",
            groups=[employer_group],
            business=business,
        )
        self.seed_user(
            username="empleado",
            password=employee_password,
            email="empleado@shineapp.local",
            first_name="Leo",
            last_name="Molina",
            phone="1155550101",
            groups=[employee_group],
            business=business,
        )
        self.seed_user(
            username="recepcion",
            password=employee_password,
            email="recepcion@shineapp.local",
            first_name="Sol",
            last_name="Rivas",
            phone="1155550102",
            groups=[employee_group],
            business=business,
        )

        customers = self.seed_customers(business, today)
        vehicles = self.seed_vehicles(business, customers)
        services = self.seed_services(business)
        reservations = self.seed_reservations(business, customers, vehicles, services, today)
        self.seed_payments_and_cash(business, admin, reservations, today)
        materials, suppliers = self.seed_inventory(business, admin, customers, reservations, today)
        self.seed_debts(business, admin, suppliers, today)
        quotes = self.seed_quotes(business, customers, vehicles, services, reservations, today)
        self.seed_public_requests(business, services, quotes, reservations, today)
        self.seed_cash_closure(business, admin, today - timedelta(days=1))
        self.seed_audit_log(business, admin, today)

        # Reapply the demo inventory snapshot after historical movements so the
        # dashboard starts from realistic, deterministic quantities.
        final_stock = {
            "Shampoo neutro": ("6200.00", "2.60"),
            "APC multiuso": ("1800.00", "3.20"),
            "Cera sintetica": ("750.00", "18.00"),
            "Microfibra premium": ("34.00", "1450.00"),
            "Coating ceramico 12m": ("85.00", "820.00"),
            "Desengrasante llantas": ("2600.00", "2.10"),
        }
        for name, (stock, cost) in final_stock.items():
            material = materials[name]
            material.stock_quantity = money(stock)
            material.estimated_unit_cost = money(cost)
            material.save(update_fields=["stock_quantity", "estimated_unit_cost", "updated_at"])

        credentials = "admin and empleado users are ready."
        if allow_defaults or (not production_like and not options["admin_password"] and not options["employee_password"]):
            credentials = "admin/admin123, empleado/empleado123 and recepcion/empleado123 are ready."
        if options["create_superadmin"]:
            credentials += " Django admin superadmin user is ready."

        self.stdout.write(
            self.style.SUCCESS(
                "Demo seed finished for "
                f"{profile.name}: clientes, agenda, ordenes, pagos, caja, inventario, "
                f"deudas, cotizaciones, solicitudes publicas e historial cargados. {credentials}"
            )
        )
