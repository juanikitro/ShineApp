"""Tests para alternativas de material en servicios y reservas.

Cubre:
- CRUD de ServiceMaterialAlternative
- Validaciones de negocio (mismo negocio, no igual al default, solo alternativas registradas)
- CRUD de ReservationMaterialOverride
- Lectura de material_overrides inline en la reserva
"""

from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Sector, Service, ServiceMaterial, ServiceMaterialAlternative
from customers.models import Customer, Vehicle
from inventory.models import Material
from scheduling.models import Reservation, ReservationMaterialOverride


@pytest.fixture
def alt_setup(api_client):
    sector = Sector.objects.filter(is_active=True).first()
    service = Service.objects.create(name="Lavado Premium", sector=sector, base_price=Decimal("3000.00"))
    mat_default = Material.objects.create(
        name="Shampoo original",
        unit="litro",
        stock_quantity=Decimal("10.00"),
        estimated_unit_cost=Decimal("500.00"),
    )
    mat_alt = Material.objects.create(
        name="Shampoo premium",
        unit="litro",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("800.00"),
    )
    recipe = ServiceMaterial.objects.create(service=service, material=mat_default, quantity=Decimal("0.5"))
    customer = Customer.objects.create(name="Carlos Ruiz", phone="1122334455")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab222cd",
        brand="Ford",
        model="Focus",
        color="Gris",
    )
    return api_client, service, mat_default, mat_alt, recipe, customer, vehicle


# --- ServiceMaterialAlternative ---

@pytest.mark.django_db
def test_create_alternative(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, *_ = alt_setup
    url = reverse("servicematerialalternative-list")
    data = {"service_material": recipe.id, "alternative_material": mat_alt.id, "notes": "versión premium"}
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 201, resp.data
    assert resp.data["alternative_material"] == mat_alt.id
    assert resp.data["alternative_material_name"] == "Shampoo premium"
    assert resp.data["service_material"] == recipe.id


@pytest.mark.django_db
def test_create_alternative_same_as_default_rejected(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, *_ = alt_setup
    url = reverse("servicematerialalternative-list")
    data = {"service_material": recipe.id, "alternative_material": mat_default.id}
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 400
    assert "alternative_material" in str(resp.data)


@pytest.mark.django_db
def test_duplicate_alternative_rejected(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, *_ = alt_setup
    ServiceMaterialAlternative.objects.create(service_material=recipe, alternative_material=mat_alt)
    url = reverse("servicematerialalternative-list")
    data = {"service_material": recipe.id, "alternative_material": mat_alt.id}
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_list_alternatives_filtered_by_service_material(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, *_ = alt_setup
    ServiceMaterialAlternative.objects.create(service_material=recipe, alternative_material=mat_alt)
    url = reverse("servicematerialalternative-list") + f"?service_material={recipe.id}"
    resp = api_client.get(url)
    assert resp.status_code == 200
    results = resp.data.get("results", resp.data)
    assert len(results) == 1
    assert results[0]["alternative_material"] == mat_alt.id


@pytest.mark.django_db
def test_service_detail_includes_alternatives(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, *_ = alt_setup
    ServiceMaterialAlternative.objects.create(service_material=recipe, alternative_material=mat_alt)
    url = reverse("service-detail", kwargs={"pk": service.id})
    resp = api_client.get(url)
    assert resp.status_code == 200
    materials = resp.data["materials"]
    assert len(materials) == 1
    alternatives = materials[0]["alternatives"]
    assert len(alternatives) == 1
    assert alternatives[0]["alternative_material"] == mat_alt.id
    assert alternatives[0]["alternative_material_name"] == "Shampoo premium"


# --- ReservationMaterialOverride ---

@pytest.fixture
def override_setup(alt_setup):
    api_client, service, mat_default, mat_alt, recipe, customer, vehicle = alt_setup
    ServiceMaterialAlternative.objects.create(service_material=recipe, alternative_material=mat_alt)
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day="2026-08-15",
        status=Reservation.Status.PENDING,
    )
    return api_client, reservation, recipe, mat_alt, mat_default


@pytest.mark.django_db
def test_create_reservation_material_override(override_setup):
    api_client, reservation, recipe, mat_alt, mat_default = override_setup
    url = reverse("reservationmaterialoverride-list")
    data = {
        "reservation": reservation.id,
        "service_material": recipe.id,
        "chosen_material": mat_alt.id,
    }
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 201, resp.data
    assert resp.data["chosen_material"] == mat_alt.id
    assert resp.data["chosen_material_name"] == "Shampoo premium"
    assert resp.data["default_material_name"] == "Shampoo original"


@pytest.mark.django_db
def test_override_with_non_alternative_material_rejected(override_setup):
    api_client, reservation, recipe, mat_alt, mat_default = override_setup
    other_mat = Material.objects.create(
        name="Cera carnauba",
        unit="kg",
        stock_quantity=Decimal("2.00"),
        estimated_unit_cost=Decimal("1200.00"),
    )
    url = reverse("reservationmaterialoverride-list")
    data = {
        "reservation": reservation.id,
        "service_material": recipe.id,
        "chosen_material": other_mat.id,
    }
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 400
    assert "chosen_material" in str(resp.data)


@pytest.mark.django_db
def test_duplicate_override_rejected(override_setup):
    api_client, reservation, recipe, mat_alt, mat_default = override_setup
    ReservationMaterialOverride.objects.create(
        reservation=reservation,
        service_material=recipe,
        chosen_material=mat_alt,
    )
    url = reverse("reservationmaterialoverride-list")
    data = {
        "reservation": reservation.id,
        "service_material": recipe.id,
        "chosen_material": mat_alt.id,
    }
    resp = api_client.post(url, data, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_reservation_detail_includes_material_overrides(override_setup):
    api_client, reservation, recipe, mat_alt, mat_default = override_setup
    ReservationMaterialOverride.objects.create(
        reservation=reservation,
        service_material=recipe,
        chosen_material=mat_alt,
    )
    url = reverse("reservation-detail", kwargs={"pk": reservation.id})
    resp = api_client.get(url)
    assert resp.status_code == 200
    overrides = resp.data.get("material_overrides", [])
    assert len(overrides) == 1
    assert overrides[0]["chosen_material"] == mat_alt.id
    assert overrides[0]["default_material_name"] == "Shampoo original"


@pytest.mark.django_db
def test_list_overrides_filtered_by_reservation(override_setup):
    api_client, reservation, recipe, mat_alt, mat_default = override_setup
    ReservationMaterialOverride.objects.create(
        reservation=reservation,
        service_material=recipe,
        chosen_material=mat_alt,
    )
    url = reverse("reservationmaterialoverride-list") + f"?reservation={reservation.id}"
    resp = api_client.get(url)
    assert resp.status_code == 200
    results = resp.data.get("results", resp.data)
    assert len(results) == 1
