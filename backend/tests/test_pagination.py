import pytest
from django.conf import settings
from django.urls import reverse

from core.pagination import stable_ordering_for
from customers.models import Customer, Vehicle


def test_default_pagination_uses_a_stable_tie_breaker():
    assert (
        settings.REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"]
        == "core.pagination.StablePageNumberPagination"
    )


@pytest.mark.django_db
def test_stable_ordering_preserves_existing_primary_key_and_orders_unordered_sets():
    assert stable_ordering_for(Vehicle.objects.all()) == ["license_plate", "id"]
    assert stable_ordering_for(Vehicle.objects.order_by("-id")) == ["-id"]
    assert stable_ordering_for(Vehicle.objects.order_by()) == ["id"]


@pytest.mark.django_db
def test_vehicle_pages_use_primary_key_to_break_equal_license_plate_ties(api_client):
    """All blank-plate vehicles must appear exactly once across API pages."""
    business = api_client.user.profile.business
    customer = Customer.objects.create(business=business, name="Cliente paginado")
    Vehicle.objects.bulk_create(
        [
            Vehicle(
                business=business,
                customer=customer,
                license_plate="",
                brand="Marca",
                model=f"Modelo {index}",
            )
            for index in range(205)
        ]
    )
    created_ids = list(
        Vehicle.objects.filter(customer=customer)
        .order_by("id")
        .values_list("id", flat=True)
    )

    page_ids = []
    for page_number in range(1, 4):
        response = api_client.get(reverse("vehicle-list"), {"page": page_number})

        assert response.status_code == 200, response.data
        page_ids.extend(row["id"] for row in response.data["results"])

    assert page_ids == created_ids
    assert len(page_ids) == len(set(page_ids))
