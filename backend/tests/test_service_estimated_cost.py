from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from catalog.models import Service, ServiceMaterial
from finance.models import Payment
from inventory.models import Material, MaterialConsumption
from scheduling.models import Reservation
from workorders.models import WorkOrder

from test_mvp_flows import base_data, create_work_order  # noqa: F401 (fixture reuse)


def _material(unit_cost):
    return Material.objects.create(
        name=f"Material {unit_cost}",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal(unit_cost),
    )


@pytest.mark.django_db
def test_service_serializer_exposes_and_persists_estimated_cost(api_client, base_data):
    _customer, _vehicle, service = base_data
    response = api_client.patch(
        reverse("service-detail", args=[service.id]),
        {"estimated_material_cost": "2500.00"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["estimated_material_cost"] == "2500.00"
    # Sin receta: el costo efectivo cae al estimado manual y se marca como estimado.
    assert response.data["effective_material_cost"] == "2500.00"
    assert response.data["material_cost_is_estimated"] is True


@pytest.mark.django_db
def test_service_estimated_cost_rejects_negative(api_client, base_data):
    _customer, _vehicle, service = base_data
    response = api_client.patch(
        reverse("service-detail", args=[service.id]),
        {"estimated_material_cost": "-1.00"},
        format="json",
    )

    assert response.status_code == 400
    assert "estimated_material_cost" in response.data


@pytest.mark.django_db
def test_recipe_takes_priority_over_manual_estimate(api_client, base_data):
    _customer, _vehicle, service = base_data
    service.estimated_material_cost = Decimal("9999.00")
    service.save(update_fields=["estimated_material_cost"])
    ServiceMaterial.objects.create(
        service=service, material=_material("10.00"), quantity=Decimal("100.000")
    )

    response = api_client.get(reverse("service-detail", args=[service.id]))

    assert response.status_code == 200
    # 100 x 10 = 1000 desde la receta; el manual (9999) se ignora y no es estimado.
    assert response.data["effective_material_cost"] == "1000.00"
    assert response.data["material_cost_is_estimated"] is False


@pytest.mark.django_db
def test_service_without_recipe_or_manual_has_no_effective_cost(api_client, base_data):
    _customer, _vehicle, service = base_data
    response = api_client.get(reverse("service-detail", args=[service.id]))

    assert response.status_code == 200
    assert response.data["estimated_material_cost"] is None
    assert response.data["effective_material_cost"] is None
    assert response.data["material_cost_is_estimated"] is False


@pytest.mark.django_db
def test_history_uses_manual_estimate_when_no_real_consumption(api_client, base_data):
    customer, vehicle, service = base_data
    service.estimated_material_cost = Decimal("4000.00")
    service.save(update_fields=["estimated_material_cost"])
    create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
    )

    response = api_client.get(f"/api/services/{service.id}/history/")

    assert response.status_code == 200
    summary = response.data["summary"]
    assert summary["material_cost_total"] == Decimal("4000.00")
    assert summary["margin_total"] == Decimal("11000.00")
    assert summary["material_cost_is_estimated"] is True


@pytest.mark.django_db
def test_history_uses_recipe_when_no_real_consumption(api_client, base_data):
    customer, vehicle, service = base_data
    service.estimated_material_cost = Decimal("9999.00")
    service.save(update_fields=["estimated_material_cost"])
    ServiceMaterial.objects.create(
        service=service, material=_material("10.00"), quantity=Decimal("100.000")
    )
    create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
    )

    response = api_client.get(f"/api/services/{service.id}/history/")

    assert response.status_code == 200
    summary = response.data["summary"]
    # Receta (1000) gana al manual y NO marca estimado.
    assert summary["material_cost_total"] == Decimal("1000.00")
    assert summary["margin_total"] == Decimal("14000.00")
    assert summary["material_cost_is_estimated"] is False


@pytest.mark.django_db
def test_history_real_consumption_ignores_estimate(api_client, base_data):
    customer, vehicle, service = base_data
    service.estimated_material_cost = Decimal("9999.00")
    service.save(update_fields=["estimated_material_cost"])
    material = _material("10.00")
    received = timezone.now()
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
        received_at=received,
    )
    Payment.objects.create(
        work_order=order,
        amount=Decimal("5000.00"),
        method=Payment.Method.CASH,
        paid_at=received,
    )
    MaterialConsumption.objects.create(
        work_order=order,
        material=material,
        consumed_at=received.date(),
        quantity=Decimal("50.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("500.00"),
    )

    response = api_client.get(f"/api/services/{service.id}/history/")

    assert response.status_code == 200
    summary = response.data["summary"]
    # Consumo real (500) gana sobre el estimado manual (9999).
    assert summary["material_cost_total"] == Decimal("500.00")
    assert summary["margin_total"] == Decimal("14500.00")
    assert summary["material_cost_is_estimated"] is False
