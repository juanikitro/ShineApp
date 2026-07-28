import pytest
from django.urls import reverse

from core.models import BusinessProfile


@pytest.mark.django_db
def test_business_profile_accepts_a_nullable_business_type(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {"business_type": BusinessProfile.BusinessType.LAVADERO},
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["business_type"] == BusinessProfile.BusinessType.LAVADERO

    response = api_client.patch(
        reverse("business-profile"),
        {"business_type": None},
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["business_type"] is None
    assert BusinessProfile.get_solo().business_type is None


@pytest.mark.django_db
def test_business_profile_rejects_an_unknown_business_type(api_client):
    response = api_client.patch(
        reverse("business-profile"),
        {"business_type": "taller-general"},
        format="json",
    )

    assert response.status_code == 400
    assert "business_type" in response.data
