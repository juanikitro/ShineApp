import json
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse

from core.models import BusinessProfile


@pytest.mark.django_db
def test_employer_can_get_and_update_business_profile(api_client, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        initial = api_client.get(reverse("business-profile"))

        assert initial.status_code == 200
        assert initial.data["name"] == "ShineApp"
        assert initial.data["logo_url"] is None
        assert initial.data["subscription_type"] == "trial"
        assert initial.data["subscription_type_label"] == "Prueba"
        assert initial.data["use_reservation_times"] is True
        assert initial.data["show_stay_days_in_agenda"] is True
        assert initial.data["allow_overlapping_reservations"] is False
        assert initial.data["enforce_capacity_limit"] is True
        assert initial.data["default_capacity_wash"] == 8
        assert initial.data["default_capacity_detailing"] == 8
        assert initial.data["address"] == ""
        assert initial.data["maps_url"] == ""
        assert initial.data["default_quote_validity_days"] == 7
        assert initial.data["default_quote_tax_rate"] == "0.00"
        assert initial.data["default_quote_discount_rate"] == "0.00"
        assert initial.data["default_quote_terms"] == ""
        assert initial.data["default_quote_payment_instructions"] == ""
        assert "Pago" in initial.data["income_category_tree"]
        assert "Efectivo" in initial.data["income_category_tree"]["Pago"]
        assert "Inversion" in initial.data["expense_category_tree"]
        assert "Herramientas" in initial.data["expense_category_tree"]["Inversion"]
        assert BusinessProfile.objects.count() == 1

        income_category_tree = {
            "Venta": ["Productos"],
            "Pago": ["Efectivo"],
        }
        expense_category_tree = {
            "Servicios": ["Agua", "Luz"],
            "Inversion": ["Herramientas"],
        }
        logo = SimpleUploadedFile(
            "logo.png",
            b"\x89PNG\r\n\x1a\nlogo-falso",
            content_type="image/png",
        )
        response = api_client.patch(
            reverse("business-profile"),
            {
                "name": "Brillo Total",
                "cuit": "20-30405060-7",
                "vat_condition": BusinessProfile.VatCondition.MONOTRIBUTO,
                "contact_phone": "11 5555-2222",
                "contact_email": "contacto@brillototal.com",
                "use_reservation_times": False,
                "show_stay_days_in_agenda": False,
                "address": "Parana 158",
                "maps_url": "https://maps.app.goo.gl/demo",
                "default_quote_validity_days": 10,
                "default_quote_tax_rate": "21.00",
                "default_quote_discount_rate": "5.50",
                "default_quote_terms": "Precios sujetos a inspeccion del vehiculo.",
                "default_quote_payment_instructions": "Alias: brillo.total",
                "income_category_tree": json.dumps(income_category_tree),
                "expense_category_tree": json.dumps(expense_category_tree),
                "logo": logo,
            },
            format="multipart",
        )

        assert response.status_code == 200, response.data
        assert response.data["name"] == "Brillo Total"
        assert response.data["cuit"] == "20304050607"
        assert (
            response.data["vat_condition"]
            == BusinessProfile.VatCondition.MONOTRIBUTO
        )
        assert response.data["vat_condition_label"] == "Monotributo"
        assert response.data["contact_phone"] == "11 5555-2222"
        assert response.data["contact_email"] == "contacto@brillototal.com"
        assert response.data["use_reservation_times"] is False
        assert response.data["show_stay_days_in_agenda"] is False
        assert response.data["address"] == "Parana 158"
        assert response.data["maps_url"] == "https://maps.app.goo.gl/demo"
        assert response.data["default_quote_validity_days"] == 10
        assert response.data["default_quote_tax_rate"] == "21.00"
        assert response.data["default_quote_discount_rate"] == "5.50"
        assert response.data["default_quote_terms"] == "Precios sujetos a inspeccion del vehiculo."
        assert response.data["default_quote_payment_instructions"] == "Alias: brillo.total"
        assert response.data["income_category_tree"] == income_category_tree
        assert response.data["expense_category_tree"] == expense_category_tree
        assert "/media/business-profile/" in response.data["logo_url"]

        profile = BusinessProfile.get_solo()
        assert profile.name == "Brillo Total"
        assert profile.cuit == "20304050607"
        assert profile.use_reservation_times is False
        assert profile.show_stay_days_in_agenda is False
        assert profile.address == "Parana 158"
        assert profile.maps_url == "https://maps.app.goo.gl/demo"
        assert profile.default_quote_validity_days == 10
        assert profile.default_quote_tax_rate == Decimal("21.00")
        assert profile.default_quote_discount_rate == Decimal("5.50")
        assert profile.default_quote_terms == "Precios sujetos a inspeccion del vehiculo."
        assert profile.default_quote_payment_instructions == "Alias: brillo.total"
        assert profile.income_category_tree == income_category_tree
        assert profile.expense_category_tree == expense_category_tree
        assert profile.logo.name.startswith("business-profile/")


@pytest.mark.django_db
def test_business_profile_persists_allow_overlapping_reservations(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {"allow_overlapping_reservations": True},
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["allow_overlapping_reservations"] is True

    profile = BusinessProfile.get_solo()
    assert profile.allow_overlapping_reservations is True


@pytest.mark.django_db
def test_business_profile_persists_capacity_settings(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {
            "enforce_capacity_limit": False,
            "default_capacity_wash": 4,
            "default_capacity_detailing": 2,
        },
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["enforce_capacity_limit"] is False
    assert response.data["default_capacity_wash"] == 4
    assert response.data["default_capacity_detailing"] == 2

    profile = BusinessProfile.get_solo()
    assert profile.enforce_capacity_limit is False
    assert profile.default_capacity_wash == 4
    assert profile.default_capacity_detailing == 2


@pytest.mark.django_db
def test_business_profile_rejects_negative_capacity(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {"default_capacity_wash": -1},
        format="json",
    )

    assert response.status_code == 400
    assert "default_capacity_wash" in response.data


@pytest.mark.django_db
def test_business_profile_rejects_invalid_maps_url(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {"maps_url": "no-es-una-url"},
        format="json",
    )

    assert response.status_code == 400
    assert "maps_url" in response.data


@pytest.mark.django_db
def test_business_profile_rejects_invalid_expense_category_tree(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {
            "expense_category_tree": {
                "Servicios": ["Luz", ""],
                "": ["Sin categoria"],
            },
        },
        format="json",
    )

    assert response.status_code == 400
    assert "expense_category_tree" in response.data


@pytest.mark.django_db
def test_business_profile_rejects_invalid_income_category_tree(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {
            "income_category_tree": {
                "Pago": ["Efectivo", ""],
                "": ["Sin categoria"],
            },
        },
        format="json",
    )

    assert response.status_code == 400
    assert "income_category_tree" in response.data


@pytest.mark.django_db
def test_employer_can_update_business_profile_with_pdf_logo(api_client, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        logo = SimpleUploadedFile(
            "logo.pdf",
            b"%PDF-1.4\nlogo-falso",
            content_type="application/pdf",
        )

        response = api_client.patch(
            reverse("business-profile"),
            {
                "name": "Brillo Total",
                "logo": logo,
            },
            format="multipart",
        )

        assert response.status_code == 200, response.data
        assert response.data["logo_url"].endswith(".pdf")
        assert "/media/business-profile/" in response.data["logo_url"]

        profile = BusinessProfile.get_solo()
        assert profile.logo.name.startswith("business-profile/")
        assert profile.logo.name.endswith(".pdf")


@pytest.mark.django_db
def test_employee_cannot_access_business_profile(employee_client):
    get_response = employee_client.get(reverse("business-profile"))
    patch_response = employee_client.patch(
        reverse("business-profile"),
        {"name": "No autorizado"},
        format="json",
    )

    assert get_response.status_code == 403
    assert patch_response.status_code == 403
