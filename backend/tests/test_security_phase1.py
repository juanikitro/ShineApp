"""Regresiones de seguridad — Fase 1.

Cubre: recall publico sin PII, resolucion de IP resistente a X-Forwarded-For
falsificado, bloqueo de FK injection cross-tenant en ServiceMaterial, rechazo de
uploads SVG/markup activo, y deteccion fail-closed de DB productiva en seed_demo.
"""

from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import serializers
from rest_framework.test import APIClient

from catalog.models import Sector, Service
from core.models import BusinessAccount, BusinessProfile, UserProfile
from customers.models import Customer, Vehicle
from inventory.models import Material

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def create_business(name, slug, *, public_landing=False):
    business = BusinessAccount.objects.create(name=name, slug=slug)
    profile = BusinessProfile.objects.create(business=business, name=name)
    if public_landing:
        profile.public_landing_enabled = True
        profile.save(update_fields=["public_landing_enabled"])
    return business


def create_employer(username, business):
    user = get_user_model().objects.create_user(username=username, password="clave12345")
    group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(group)
    UserProfile.objects.create(user=user, business=business)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Recall publico: no debe filtrar PII de clientes ni confirmar existencia.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_public_recall_does_not_leak_customer_pii():
    business = create_business("Recall Test", "recall-test", public_landing=True)
    customer = Customer.objects.create(
        business=business,
        name="Cliente Real",
        phone="+54 11 1234-5678",
        email="real@example.com",
    )
    Vehicle.objects.create(
        business=business,
        customer=customer,
        license_plate="AB123CD",
        brand="Toyota",
        model="Corolla",
    )

    client = APIClient()  # sin autenticacion: endpoint publico
    response = client.post(
        reverse("public-landing-recall", kwargs={"slug": business.slug}),
        {"phone": "+54 11 1234-5678"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["customer_name"] is None
    assert response.data["customer_phone"] is None
    assert response.data["customer_email"] is None
    assert response.data["vehicles"] == []


@pytest.mark.django_db
def test_public_recall_still_requires_phone_or_email():
    business = create_business("Recall Empty", "recall-empty", public_landing=True)
    client = APIClient()
    response = client.post(
        reverse("public-landing-recall", kwargs={"slug": business.slug}),
        {},
        format="json",
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Resolucion de IP: resistente a X-Forwarded-For falsificado por el cliente.
# ---------------------------------------------------------------------------
def test_get_client_ip_takes_proxy_added_ip_not_spoofed():
    from core.request_ip import get_client_ip

    # El cliente manda "1.1.1.1"; el proxy de confianza (Vercel) agrega la IP
    # real a la derecha. Con TRUSTED_PROXY_COUNT=1 debe devolver la de la derecha.
    request = SimpleNamespace(
        META={"HTTP_X_FORWARDED_FOR": "1.1.1.1, 203.0.113.9", "REMOTE_ADDR": "10.0.0.1"}
    )
    assert get_client_ip(request) == "203.0.113.9"


def test_get_client_ip_falls_back_to_real_ip_then_remote_addr():
    from core.request_ip import get_client_ip

    assert get_client_ip(SimpleNamespace(META={"HTTP_X_REAL_IP": "198.51.100.7"})) == "198.51.100.7"
    assert get_client_ip(SimpleNamespace(META={"REMOTE_ADDR": "10.0.0.5"})) == "10.0.0.5"


# ---------------------------------------------------------------------------
# ServiceMaterial: bloquear FK injection cross-tenant en service y material.
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_service_material_rejects_cross_tenant_material(default_business):
    employer_client = create_employer("dueno-a", default_business)
    sector_a = Sector.objects.create(business=default_business, name="Detailing")
    service_a = Service.objects.create(business=default_business, name="Pulido", sector=sector_a, base_price=Decimal("100.00"))

    business_b = create_business("Negocio B", "negocio-b")
    material_b = Material.objects.create(business=business_b, name="Cera Ajena", unit="ml")

    response = employer_client.post(
        reverse("servicematerial-list"),
        {"service": service_a.id, "material": material_b.id, "quantity": "1.0"},
        format="json",
    )

    assert response.status_code == 400
    from catalog.models import ServiceMaterial

    assert not ServiceMaterial.objects.filter(material=material_b).exists()


@pytest.mark.django_db
def test_service_material_rejects_cross_tenant_service(default_business):
    employer_client = create_employer("dueno-a2", default_business)
    material_a = Material.objects.create(business=default_business, name="Cera Propia", unit="ml")

    business_b = create_business("Negocio B2", "negocio-b2")
    sector_b = Sector.objects.create(business=business_b, name="Detailing B")
    service_b = Service.objects.create(business=business_b, name="Pulido B", sector=sector_b, base_price=Decimal("100.00"))

    response = employer_client.post(
        reverse("servicematerial-list"),
        {"service": service_b.id, "material": material_a.id, "quantity": "1.0"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_service_material_allows_same_tenant(default_business):
    employer_client = create_employer("dueno-ok", default_business)
    sector = Sector.objects.create(business=default_business, name="Lavado")
    service = Service.objects.create(business=default_business, name="Lavado Full", sector=sector, base_price=Decimal("50.00"))
    material = Material.objects.create(business=default_business, name="Shampoo", unit="ml")

    response = employer_client.post(
        reverse("servicematerial-list"),
        {"service": service.id, "material": material.id, "quantity": "2.0"},
        format="json",
    )

    assert response.status_code == 201


# ---------------------------------------------------------------------------
# Upload de assets: rechazar SVG y markup activo, aceptar imagenes reales.
# ---------------------------------------------------------------------------
def test_validate_profile_asset_rejects_svg():
    from config.serializers import validate_profile_asset_upload

    svg = SimpleUploadedFile(
        "logo.svg",
        b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        content_type="image/svg+xml",
    )
    with pytest.raises(serializers.ValidationError):
        validate_profile_asset_upload(svg)


def test_validate_profile_asset_rejects_svg_disguised_as_png():
    from config.serializers import validate_profile_asset_upload

    disguised = SimpleUploadedFile(
        "logo.png",
        b"   <svg onload='alert(1)'></svg>",
        content_type="image/png",
    )
    with pytest.raises(serializers.ValidationError):
        validate_profile_asset_upload(disguised)


def test_validate_profile_asset_accepts_real_png():
    from config.serializers import validate_profile_asset_upload

    png = SimpleUploadedFile("logo.png", PNG_BYTES, content_type="image/png")
    assert validate_profile_asset_upload(png) is png


# ---------------------------------------------------------------------------
# seed_demo: fail-closed ante cualquier DB no-local.
# ---------------------------------------------------------------------------
def test_seed_demo_production_like_detects_non_local_db(monkeypatch):
    from core.management.commands.seed_demo import Command

    command = Command()
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings")

    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@db.abcdef.supabase.co:5432/app")
    assert command.production_like_target() is True

    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@my-rds.amazonaws.com:5432/app")
    assert command.production_like_target() is True

    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@localhost:5432/app")
    assert command.production_like_target() is False

    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert command.production_like_target() is False
