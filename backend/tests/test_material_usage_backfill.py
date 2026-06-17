"""Registro retroactivo de consumo (MaterialOpenUnit historica por servicio).

Verifica el endpoint POST /material-open-units/register-usage/: arma una unidad
ya finalizada a partir de reservas pasadas de un servicio, alimenta el rendimiento
por unidad y NO descuenta stock actual.
"""

from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Sector, Service, ServiceMaterial
from customers.models import Customer, Vehicle
from inventory.models import Material, MaterialConsumption, MaterialOpenUnit
from scheduling.models import Reservation


@pytest.fixture
def usage_setup(api_client):
    customer = Customer.objects.create(name="Ana Lopez", phone="1133224455", email="ana@example.com")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab111cd",
        brand="VW",
        model="Gol",
        color="Rojo",
    )
    sector = Sector.objects.filter(is_active=True).first()
    service = Service.objects.create(name="Esmaltado", sector=sector, base_price=Decimal("5000.00"))
    return api_client, customer, vehicle, service


def make_reservation(customer, vehicle, service, day, status=Reservation.Status.DELIVERED):
    return Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=day,
        status=status,
    )


@pytest.mark.django_db
def test_register_usage_creates_historical_unit_without_touching_stock(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(
        name="Esmalte rojo",
        unit="frasco",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("8000.00"),
    )
    first = make_reservation(customer, vehicle, service, date(2026, 5, 1))
    second = make_reservation(customer, vehicle, service, date(2026, 5, 3))
    third = make_reservation(customer, vehicle, service, date(2026, 5, 5))

    response = api_client.post(
        reverse("materialopenunit-register-usage"),
        {
            "material": material.id,
            "service": service.id,
            "reservations": [first.id, second.id, third.id],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["status"] == "finished"
    assert response.data["is_historical"] is True
    assert response.data["service"] == service.id
    assert response.data["service_name"] == "Esmaltado"
    assert response.data["work_orders_count"] == 3
    assert response.data["consumptions_count"] == 3
    assert response.data["opened_at"] == "2026-05-01"
    assert response.data["finished_at"] == "2026-05-05"
    assert response.data["duration_days"] == 5  # 01..05 inclusive

    # No toca el stock actual: el consumo es historico.
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("5.00")

    # Un uso (quantity 0) por reserva, ligado a la unidad.
    unit = MaterialOpenUnit.objects.get(pk=response.data["id"])
    consumptions = MaterialConsumption.objects.filter(open_unit=unit)
    assert consumptions.count() == 3
    assert all(consumption.quantity == Decimal("0.00") for consumption in consumptions)

    # Alimenta el rendimiento por unidad finalizada del material.
    detail = api_client.get(reverse("material-detail", args=[material.id]))
    assert detail.status_code == 200
    assert detail.data["open_units_finished_count"] == 1
    assert Decimal(detail.data["average_jobs_per_finished_unit"]) == Decimal("3.00")
    assert Decimal(detail.data["average_days_per_finished_unit"]) == Decimal("5.00")


@pytest.mark.django_db
def test_register_usage_works_with_zero_stock(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("0.00"))
    reservation = make_reservation(customer, vehicle, service, date(2026, 4, 10))

    response = api_client.post(
        reverse("materialopenunit-register-usage"),
        {"material": material.id, "service": service.id, "reservations": [reservation.id]},
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["duration_days"] == 1
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("0.00")


@pytest.mark.django_db
def test_register_usage_honors_explicit_dates(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("2.00"))
    first = make_reservation(customer, vehicle, service, date(2026, 5, 2))
    second = make_reservation(customer, vehicle, service, date(2026, 5, 4))

    response = api_client.post(
        reverse("materialopenunit-register-usage"),
        {
            "material": material.id,
            "service": service.id,
            "reservations": [first.id, second.id],
            "opened_at": "2026-05-01",
            "finished_at": "2026-05-10",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["opened_at"] == "2026-05-01"
    assert response.data["finished_at"] == "2026-05-10"
    assert response.data["duration_days"] == 10


@pytest.mark.django_db
def test_register_usage_rejects_reservations_from_other_service(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    sector = Sector.objects.filter(is_active=True).first()
    other_service = Service.objects.create(name="Kapping", sector=sector, base_price=Decimal("9000.00"))
    material = Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("2.00"))
    other = make_reservation(customer, vehicle, other_service, date(2026, 5, 2))

    response = api_client.post(
        reverse("materialopenunit-register-usage"),
        {"material": material.id, "service": service.id, "reservations": [other.id]},
        format="json",
    )

    assert response.status_code == 400
    assert "reservations" in response.data
    assert not MaterialOpenUnit.objects.filter(material=material).exists()


@pytest.mark.django_db
def test_register_usage_requires_at_least_one_reservation(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("2.00"))

    response = api_client.post(
        reverse("materialopenunit-register-usage"),
        {"material": material.id, "service": service.id, "reservations": []},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_service_usage_estimates_consumption_per_service(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(
        name="Esmalte",
        unit="frasco",
        stock_quantity=Decimal("10.00"),
        estimated_unit_cost=Decimal("8000.00"),
    )
    reservations = [make_reservation(customer, vehicle, service, date(2026, 5, day)) for day in (1, 2, 3, 4)]

    registered = api_client.post(
        reverse("materialopenunit-register-usage"),
        {
            "material": material.id,
            "service": service.id,
            "reservations": [reservation.id for reservation in reservations],
        },
        format="json",
    )
    assert registered.status_code == 201, registered.data

    response = api_client.get(reverse("material-service-usage"))
    assert response.status_code == 200
    rows = response.data["results"]
    assert len(rows) == 1
    row = rows[0]
    assert row["material"] == material.id
    assert row["service"] == service.id
    assert row["service_name"] == "Esmaltado"
    assert row["units_count"] == 1
    assert row["total_jobs"] == 4
    # 1 frasco cubrio 4 servicios -> 0,25 por servicio; costo 8000/4 = 2000.
    assert Decimal(row["estimated_consumption_per_service"]) == Decimal("0.2500")
    assert Decimal(row["estimated_cost_per_service"]) == Decimal("2000.00")
    assert Decimal(row["avg_jobs_per_unit"]) == Decimal("4.00")
    assert Decimal(row["avg_days_per_unit"]) == Decimal("4.00")


@pytest.mark.django_db
def test_service_usage_empty_without_historical_units(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("3.00"))

    response = api_client.get(reverse("material-service-usage"))

    assert response.status_code == 200
    assert response.data["results"] == []


@pytest.mark.django_db
def test_recipe_upsert_creates_then_updates(usage_setup):
    api_client, customer, vehicle, service = usage_setup
    material = Material.objects.create(name="Esmalte", unit="frasco", stock_quantity=Decimal("5.00"))

    created = api_client.post(
        reverse("servicematerial-upsert"),
        {"service": service.id, "material": material.id, "quantity": "0.250"},
        format="json",
    )
    assert created.status_code == 201, created.data
    recipe_id = created.data["id"]
    assert Decimal(created.data["quantity"]) == Decimal("0.250")

    updated = api_client.post(
        reverse("servicematerial-upsert"),
        {"service": service.id, "material": material.id, "quantity": "0.330"},
        format="json",
    )
    assert updated.status_code == 200, updated.data
    assert updated.data["id"] == recipe_id  # mismo registro, no duplica
    assert Decimal(updated.data["quantity"]) == Decimal("0.330")
    assert ServiceMaterial.objects.filter(service=service, material=material).count() == 1
