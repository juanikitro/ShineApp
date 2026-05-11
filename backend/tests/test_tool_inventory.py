from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_tool_inventory_crud_exposes_investment_value(api_client):
    response = api_client.post(
        reverse("tool-list"),
        {
            "name": "Pulidora orbital",
            "quantity": 2,
            "unit_value": "85000.00",
            "purchased_at": "2026-04-28",
            "notes": "Uso en detailing.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["name"] == "Pulidora orbital"
    assert response.data["quantity"] == 2
    assert response.data["status"] == "in_use"
    assert Decimal(response.data["total_value"]) == Decimal("170000.00")

    update = api_client.patch(
        reverse("tool-detail", args=[response.data["id"]]),
        {
            "quantity": 3,
            "status": "maintenance",
            "unit_value": "90000.00",
        },
        format="json",
    )

    assert update.status_code == 200
    assert update.data["quantity"] == 3
    assert update.data["status"] == "maintenance"
    assert Decimal(update.data["total_value"]) == Decimal("270000.00")

    listed = api_client.get(reverse("tool-list"))
    assert listed.status_code == 200
    payload = listed.data["results"] if isinstance(listed.data, dict) else listed.data
    assert any(item["id"] == response.data["id"] for item in payload)

    delete = api_client.delete(reverse("tool-detail", args=[response.data["id"]]))
    assert delete.status_code == 204

    active = api_client.get(reverse("tool-list"))
    active_payload = active.data["results"] if isinstance(active.data, dict) else active.data
    assert not any(item["id"] == response.data["id"] for item in active_payload)

    inactive = api_client.get(reverse("tool-list"), {"include_inactive": "1"})
    inactive_payload = inactive.data["results"] if isinstance(inactive.data, dict) else inactive.data
    inactive_item = next(item for item in inactive_payload if item["id"] == response.data["id"])
    assert inactive_item["is_active"] is False


@pytest.mark.django_db
def test_tool_inventory_rejects_negative_quantity_and_value(api_client):
    response = api_client.post(
        reverse("tool-list"),
        {
            "name": "Aspiradora",
            "quantity": -1,
            "status": "in_use",
            "unit_value": "-10.00",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "quantity" in response.data
    assert "unit_value" in response.data


@pytest.mark.django_db
def test_tool_inventory_rejects_available_status(api_client):
    response = api_client.post(
        reverse("tool-list"),
        {
            "name": "Hidrolavadora",
            "quantity": 1,
            "status": "available",
            "unit_value": "100000.00",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "status" in response.data
