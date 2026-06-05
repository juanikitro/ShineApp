from decimal import Decimal

import pytest
from django.urls import reverse

from catalog.models import Service
from core.models import BusinessAccount, BusinessProfile
from customers.models import Customer, Vehicle
from scheduling.models import Reservation


@pytest.fixture
def base_data(db, default_business):
    customer = Customer.objects.create(
        business=default_business,
        name="Juan Perez",
        phone="1122334455",
        email="juan@example.com",
    )
    vehicle = Vehicle.objects.create(
        business=default_business,
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
        color="Gris",
    )
    service = Service.objects.create(
        business=default_business,
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    return customer, vehicle, service


def _make_reservation(business, customer, vehicle, service, status=Reservation.Status.PENDING, day="2026-04-28"):
    return Reservation.objects.create(
        business=business,
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=day,
        status=status,
    )


@pytest.mark.django_db
def test_helpers_compute_next_active_status(default_business):
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_pending = False
    profile.reservation_use_in_progress = False
    profile.reservation_use_ready = True
    profile.save()

    assert Reservation.initial_status_for_profile(profile) == Reservation.Status.CONFIRMED
    assert (
        Reservation.next_active_status(Reservation.Status.CONFIRMED, profile)
        == Reservation.Status.READY
    )
    assert (
        Reservation.next_active_status(Reservation.Status.READY, profile)
        == Reservation.Status.DELIVERED
    )
    assert (
        Reservation.normalize_status_for_profile(Reservation.Status.IN_PROGRESS, profile)
        == Reservation.Status.READY
    )


@pytest.mark.django_db
def test_create_reservation_defaults_to_confirmed_when_pending_disabled(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_pending = False
    profile.save()

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["status"] == Reservation.Status.CONFIRMED


@pytest.mark.django_db
def test_validate_status_normalizes_disabled_status(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_in_progress = False
    profile.save()

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "status": Reservation.Status.IN_PROGRESS,
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["status"] == Reservation.Status.READY


@pytest.mark.django_db
def test_cancel_action_deletes_reservation_when_canceled_disabled(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_canceled = False
    profile.save()

    reservation = _make_reservation(
        default_business,
        customer,
        vehicle,
        service,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(reverse("reservation-cancel", args=[reservation.id]))

    assert response.status_code == 204
    assert not Reservation.objects.filter(pk=reservation.id).exists()


@pytest.mark.django_db
def test_destroy_allows_direct_delete_when_canceled_disabled(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_canceled = False
    profile.save()

    reservation = _make_reservation(
        default_business,
        customer,
        vehicle,
        service,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.delete(reverse("reservation-detail", args=[reservation.id]))

    assert response.status_code == 204
    assert not Reservation.objects.filter(pk=reservation.id).exists()


@pytest.mark.django_db
def test_destroy_still_requires_canceled_when_flag_enabled(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    reservation = _make_reservation(
        default_business,
        customer,
        vehicle,
        service,
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.delete(reverse("reservation-detail", args=[reservation.id]))

    assert response.status_code == 400
    assert Reservation.objects.filter(pk=reservation.id).exists()


@pytest.mark.django_db
def test_disabling_status_via_profile_migrates_existing_reservations(api_client, base_data, default_business):
    customer, vehicle, service = base_data
    in_progress = _make_reservation(
        default_business,
        customer,
        vehicle,
        service,
        status=Reservation.Status.IN_PROGRESS,
    )
    canceled = _make_reservation(
        default_business,
        customer,
        vehicle,
        service,
        status=Reservation.Status.CANCELED,
        day="2026-05-01",
    )

    response = api_client.patch(
        reverse("business-profile"),
        {
            "reservation_use_in_progress": False,
            "reservation_use_canceled": False,
        },
        format="json",
    )

    assert response.status_code == 200, response.data
    in_progress.refresh_from_db()
    assert in_progress.status == Reservation.Status.READY
    assert not Reservation.objects.filter(pk=canceled.pk).exists()


@pytest.mark.django_db
def test_required_statuses_cannot_be_disabled_via_helpers(default_business):
    profile = BusinessProfile.get_solo(business=default_business)
    profile.reservation_use_pending = False
    profile.reservation_use_in_progress = False
    profile.reservation_use_ready = False
    profile.save()

    flow = Reservation.enabled_flow_statuses(profile)
    assert Reservation.Status.CONFIRMED in flow
    assert Reservation.Status.DELIVERED in flow
    assert Reservation.Status.PENDING not in flow
    assert Reservation.next_active_status(Reservation.Status.CONFIRMED, profile) == Reservation.Status.DELIVERED
