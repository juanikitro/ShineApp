from datetime import datetime
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import BusinessProfile
from customers.models import Customer, Vehicle
from finance.models import CashMovement
from inventory.models import Material
from scheduling.models import Reservation


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    user.groups.add(Group.objects.get_or_create(name="empleador")[0])
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def work_order(db):
    customer = Customer.objects.create(name="Juan Perez", phone="1122334455", email="juan@example.com")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
        color="Gris",
    )
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day="2026-04-28",
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order
    order.total_amount = Decimal("15000.00")
    order.save(update_fields=["total_amount"])
    return order


@pytest.mark.django_db
def test_payment_defaults_to_full_balance_and_payment_type(api_client, work_order):
    response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": work_order.id,
            "method": "cash",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["payment_type"] == "payment"
    assert Decimal(response.data["amount"]) == Decimal("15000.00")
    work_order.refresh_from_db()
    assert work_order.paid_amount == Decimal("15000.00")
    assert work_order.balance_due == Decimal("0.00")
    movement = CashMovement.objects.get(payment_id=response.data["id"])
    assert movement.category == "Pago"
    assert movement.subcategory == "Efectivo"
    assert movement.amount == Decimal("15000.00")


@pytest.mark.django_db
def test_cash_daily_suggests_categories_without_restricting_custom_values(api_client):
    movement = CashMovement.objects.create(
        movement_type=CashMovement.MovementType.EXPENSE,
        category="Ajuste historico",
        amount=Decimal("1000.00"),
        occurred_at=timezone.make_aware(datetime(2026, 4, 28, 10, 0)),
        description="Dato libre existente",
    )

    response = api_client.get(reverse("cash-daily"), {"date": "2026-04-28"})

    assert response.status_code == 200
    assert "Alquiler" in response.data["category_options"]["expense"]
    assert "Servicios" in response.data["category_options"]["expense"]
    assert "Materiales e insumos" in response.data["category_options"]["expense"]
    assert "Inversion" in response.data["category_options"]["expense"]
    assert "Herramientas" in response.data["expense_category_tree"]["Inversion"]
    assert "Luz" in response.data["expense_category_tree"]["Servicios"]
    assert "Pago" in response.data["category_options"]["income"]
    assert "Sena" in response.data["category_options"]["income"]
    assert "Adelanto" in response.data["category_options"]["income"]
    assert "Prestamo" in response.data["category_options"]["income"]
    assert "Inversion" in response.data["category_options"]["income"]
    assert "Efectivo" in response.data["income_category_tree"]["Pago"]
    assert "Transferencia" in response.data["income_category_tree"]["Sena"]
    assert response.data["movements"][0]["id"] == movement.id
    assert response.data["movements"][0]["category"] == "Ajuste historico"


@pytest.mark.django_db
def test_configurable_expense_category_tree_drives_cash_daily_options(api_client):
    profile = BusinessProfile.get_solo()
    profile.expense_category_tree = {
        "Servicios": ["Luz", "Agua"],
        "Inversion": ["Herramientas"],
        "Uniformes": ["Ropa de trabajo"],
    }
    profile.save(update_fields=["expense_category_tree", "updated_at"])

    response = api_client.get(reverse("cash-daily"), {"date": "2026-04-28"})

    assert response.status_code == 200
    assert response.data["category_options"]["expense"] == [
        "Inversion",
        "Servicios",
        "Uniformes",
    ]
    assert response.data["expense_category_tree"]["Uniformes"] == ["Ropa de trabajo"]


@pytest.mark.django_db
def test_configurable_income_category_tree_drives_cash_daily_options(api_client):
    profile = BusinessProfile.get_solo()
    profile.income_category_tree = {
        "Venta": ["Productos"],
        "Pago": ["Efectivo"],
        "Aporte": ["Socio"],
    }
    profile.save(update_fields=["income_category_tree", "updated_at"])

    response = api_client.get(reverse("cash-daily"), {"date": "2026-04-28"})

    assert response.status_code == 200
    assert response.data["category_options"]["income"] == [
        "Aporte",
        "Pago",
        "Venta",
    ]
    assert response.data["income_category_tree"]["Aporte"] == ["Socio"]


@pytest.mark.django_db
def test_cash_movements_from_other_modules_get_default_categories(api_client, work_order):
    material = Material.objects.create(
        name="Cera premium",
        unit="litro",
        stock_quantity=Decimal("0.00"),
        estimated_unit_cost=Decimal("0.00"),
    )

    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": work_order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "transfer",
        },
        format="json",
    )
    purchase_response = api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": "2026-04-28",
            "quantity": "2.00",
            "total_cost": "12000.00",
            "affects_cash": True,
        },
        format="json",
    )
    debt_response = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Factura de luz",
            "principal_amount": "25000.00",
            "origin_date": "2026-04-28",
            "expense_category": "Servicios",
            "expense_subcategory": "Luz",
        },
        format="json",
    )

    assert payment_response.status_code == 201, payment_response.data
    assert purchase_response.status_code == 201, purchase_response.data
    assert debt_response.status_code == 201, debt_response.data

    payment_movement = CashMovement.objects.get(payment_id=payment_response.data["id"])
    purchase_movement = CashMovement.objects.get(material_purchase_id=purchase_response.data["id"])
    debt_movement = CashMovement.objects.get(debt__id=debt_response.data["id"])

    assert (payment_movement.category, payment_movement.subcategory) == ("Sena", "Transferencia")
    assert (purchase_movement.category, purchase_movement.subcategory) == (
        "Materiales e insumos",
        "Cera premium",
    )
    assert (debt_movement.category, debt_movement.subcategory) == ("Servicios", "Luz")


@pytest.mark.django_db
def test_manual_adjustment_uses_adjustment_category_and_subcategory(api_client):
    closed_day = "2026-04-27"
    api_client.post(reverse("cash-close"), {"date": closed_day}, format="json")

    response = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "expense",
            "category": "Ajustes",
            "subcategory": "Ajuste de cierre",
            "amount": "500.00",
            "occurred_at": "2026-04-28T10:00:00",
            "adjusts_closed_day": closed_day,
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["category"] == "Ajustes"
    assert response.data["subcategory"] == "Ajuste de cierre"


@pytest.mark.django_db
def test_manual_expense_requires_category_subcategory_pair(api_client):
    response = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "expense",
            "category": "Servicios",
            "amount": "500.00",
            "occurred_at": "2026-04-28T10:00:00",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "subcategory" in response.data


@pytest.mark.django_db
def test_manual_expense_registers_new_category_subcategory_pair(api_client):
    response = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "expense",
            "category": "Uniformes",
            "subcategory": "Ropa de trabajo",
            "amount": "15000.00",
            "occurred_at": "2026-04-28T10:00:00",
        },
        format="json",
    )

    assert response.status_code == 201, response.data

    profile = BusinessProfile.get_solo()
    assert profile.expense_category_tree["Uniformes"] == ["Ropa de trabajo"]

    daily = api_client.get(reverse("cash-daily"), {"date": "2026-04-28"})
    assert "Uniformes" in daily.data["category_options"]["expense"]
    assert daily.data["expense_category_tree"]["Uniformes"] == ["Ropa de trabajo"]


@pytest.mark.django_db
def test_manual_income_registers_new_category_subcategory_pair(api_client):
    response = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "income",
            "category": "Convenios",
            "subcategory": "Empresa local",
            "amount": "18000.00",
            "occurred_at": "2026-04-28T10:00:00",
        },
        format="json",
    )

    assert response.status_code == 201, response.data

    profile = BusinessProfile.get_solo()
    assert profile.income_category_tree["Convenios"] == ["Empresa local"]

    daily = api_client.get(reverse("cash-daily"), {"date": "2026-04-28"})
    assert "Convenios" in daily.data["category_options"]["income"]
    assert daily.data["income_category_tree"]["Convenios"] == ["Empresa local"]
