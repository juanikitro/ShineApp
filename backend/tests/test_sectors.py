import pytest
from django.db.models import ProtectedError
from django.urls import reverse

from catalog.models import Sector, Service
from catalog.sector_defaults import ensure_default_sectors
from core.models import BusinessAccount


def _rows(response):
    data = response.data
    return data["results"] if isinstance(data, dict) and "results" in data else data


@pytest.mark.django_db
def test_ensure_default_sectors_is_idempotent(default_business):
    first = ensure_default_sectors(default_business)
    second = ensure_default_sectors(default_business)
    assert set(first) == {"lavadero", "detailing"}
    assert {sector.id for sector in first.values()} == {sector.id for sector in second.values()}
    assert Sector.objects.filter(business=default_business).count() == 2


@pytest.mark.django_db
def test_employer_can_create_sector(api_client, default_business):
    response = api_client.post(
        reverse("sector-list"),
        {"name": "Gomería", "default_capacity": 5, "color": "#ff0000"},
        format="json",
    )
    assert response.status_code == 201, response.data
    assert response.data["key"] == "gomeria"
    assert response.data["default_capacity"] == 5
    sector = Sector.objects.get(business=default_business, key="gomeria")
    assert sector.name == "Gomería"


@pytest.mark.django_db
def test_employee_cannot_create_sector(employee_client):
    response = employee_client.post(reverse("sector-list"), {"name": "Taller"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_sector_list_scoped_to_business(api_client, default_business):
    ensure_default_sectors(default_business)
    other = BusinessAccount.objects.create(name="Otro", slug="otro")
    Sector.objects.create(business=other, key="lubricentro", name="Lubricentro")

    response = api_client.get(reverse("sector-list"))
    assert response.status_code == 200
    keys = {row["key"] for row in _rows(response)}
    assert keys == {"lavadero", "detailing"}


@pytest.mark.django_db
def test_duplicate_name_generates_unique_key(api_client, default_business):
    first = api_client.post(reverse("sector-list"), {"name": "Taller"}, format="json")
    second = api_client.post(reverse("sector-list"), {"name": "Taller"}, format="json")
    assert first.data["key"] == "taller"
    assert second.data["key"] == "taller-2"


@pytest.mark.django_db
def test_cannot_delete_last_active_sector(api_client, default_business):
    sector = Sector.objects.create(business=default_business, key="unico", name="Unico")
    # Dejar a "unico" como el unico sector activo del negocio.
    Sector.objects.filter(business=default_business, is_active=True).exclude(pk=sector.pk).update(is_active=False)
    response = api_client.delete(reverse("sector-detail", args=[sector.id]))
    assert response.status_code == 400
    sector.refresh_from_db()
    assert sector.is_active


@pytest.mark.django_db
def test_delete_sector_soft_deletes(api_client, default_business):
    sectors = ensure_default_sectors(default_business)
    target = sectors["detailing"]
    response = api_client.delete(reverse("sector-detail", args=[target.id]))
    assert response.status_code == 204
    target = Sector.all_objects.get(pk=target.id)
    assert target.deleted_at is not None
    assert not target.is_active
    # Sigue quedando al menos un sector activo (lavadero).
    assert Sector.objects.filter(business=default_business, is_active=True).exists()


@pytest.mark.django_db
def test_cannot_deactivate_last_active_sector(api_client, default_business):
    sector = Sector.objects.create(business=default_business, key="solo", name="Solo")
    Sector.objects.filter(business=default_business, is_active=True).exclude(pk=sector.pk).update(is_active=False)
    response = api_client.patch(
        reverse("sector-detail", args=[sector.id]),
        {"is_active": False},
        format="json",
    )
    assert response.status_code == 400
    sector.refresh_from_db()
    assert sector.is_active


@pytest.mark.django_db
def test_sector_key_is_immutable_on_update(api_client, default_business):
    sector = Sector.objects.create(business=default_business, key="taller", name="Taller")
    response = api_client.patch(
        reverse("sector-detail", args=[sector.id]),
        {"name": "Taller mecánico", "key": "otro"},
        format="json",
    )
    assert response.status_code == 200, response.data
    sector.refresh_from_db()
    assert sector.key == "taller"
    assert sector.name == "Taller mecánico"


@pytest.mark.django_db
def test_sector_protects_hard_delete_with_services(default_business):
    sector = Sector.objects.create(business=default_business, key="con-servicios", name="Con servicios")
    Service.objects.create(
        business=default_business,
        name="Servicio",
        sector=sector,
        base_price=1000,
    )
    with pytest.raises(ProtectedError):
        sector.hard_delete()
