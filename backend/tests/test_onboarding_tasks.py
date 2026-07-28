import importlib
from decimal import Decimal

import pytest
from django.apps import apps
from django.db import IntegrityError, transaction
from catalog.models import Service
from core.models import BusinessProfile
from customers.models import Customer, Vehicle
from finance.models import Payment
from notifications.models import PublicRequest
from scheduling.models import Reservation
from tasks.models import Task, TaskStatus
from tasks.onboarding import onboarding_states, sync_onboarding_tasks
from whatsapp.models import WhatsAppConfig


def test_sync_onboarding_tasks_creates_each_step_once(default_business):
    first = sync_onboarding_tasks(default_business)
    second = sync_onboarding_tasks(default_business)

    assert set(first) == {
        "business",
        "services",
        "turnera",
        "whatsapp",
        "agenda",
        "cash-dashboard",
    }
    assert Task.objects.filter(business=default_business, onboarding_step_id__isnull=False).count() == 6
    assert Task.objects.filter(business=default_business, onboarding_step_id__isnull=False).values_list(
        "onboarding_step_id", flat=True
    ).distinct().count() == 6
    assert second["business"].id == first["business"].id


def test_active_onboarding_task_constraint_allows_only_one_step_per_business(default_business):
    sync_onboarding_tasks(default_business)

    with pytest.raises(IntegrityError), transaction.atomic():
        Task.objects.create(
            business=default_business,
            onboarding_step_id="business",
            title="Duplicada",
        )


def test_data_migration_is_idempotent_for_missing_tasks(default_business):
    Task.objects.filter(business=default_business, onboarding_step_id__isnull=False).delete()
    migration = importlib.import_module("tasks.migrations.0005_task_onboarding_step")

    migration.create_missing_onboarding_tasks(apps, None)
    migration.create_missing_onboarding_tasks(apps, None)

    assert Task.objects.filter(business=default_business, onboarding_step_id__isnull=False).count() == 6


def test_onboarding_states_follow_real_business_facts(default_business):
    profile = BusinessProfile.get_solo(default_business)
    profile.name = "Taller real"
    profile.contact_phone = "+54 11 5555 5555"
    profile.public_landing_enabled = True
    profile.allow_public_booking_requests = True
    profile.save()
    sectors = {
        sector.key: sector
        for sector in default_business.sectors.filter(is_active=True)
    }
    for key, name in {
        "lavadero": "Lavado real",
        "detailing": "Detailing real",
        "lubricentro": "Cambio de aceite real",
    }.items():
        Service.objects.create(
            business=default_business,
            sector=sectors[key],
            name=name,
            base_price=Decimal("1000"),
        )
    WhatsAppConfig.objects.create(
        business=default_business,
        is_enabled=True,
        provider=WhatsAppConfig.Provider.FAKE,
        phone_number_display="+54 11 5555 5555",
    )
    reservation = Reservation.objects.create(
        business=default_business,
        customer=Customer.objects.create(business=default_business, name="Cliente real"),
        vehicle=Vehicle.objects.create(
            business=default_business,
            customer=Customer.objects.filter(business=default_business).latest("id"),
            license_plate="ABC123",
        ),
        service=Service.objects.filter(business=default_business).first(),
        sector=sectors["lavadero"],
        day="2026-07-28",
    )
    Payment.objects.create(
        business=default_business,
        work_order=reservation.work_order,
        amount=Decimal("1000"),
    )

    states = onboarding_states(default_business)

    assert all(states.values())


def test_dismissed_onboarding_step_soft_deletes_its_task(default_business):
    sync_onboarding_tasks(default_business)
    profile = BusinessProfile.get_solo(default_business)
    profile.onboarding_dismissed_step_ids = ["whatsapp"]
    profile.save(update_fields=["onboarding_dismissed_step_ids"])

    sync_onboarding_tasks(default_business)

    assert not Task.objects.filter(business=default_business, onboarding_step_id="whatsapp").exists()
    assert Task.all_objects.filter(
        business=default_business,
        onboarding_step_id="whatsapp",
        deleted_at__isnull=False,
    ).exists()


def test_public_request_marks_the_first_operation_done(default_business):
    PublicRequest.objects.create(
        business=default_business,
        request_type=PublicRequest.RequestType.BOOKING,
        customer_name="Consulta publica",
    )

    tasks = sync_onboarding_tasks(default_business)

    assert tasks["agenda"].status == TaskStatus.DONE


def test_manual_complete_rejects_pending_onboarding_requirement(api_client, default_business):
    tasks = sync_onboarding_tasks(default_business)

    response = api_client.post(f"/api/tasks/{tasks['services'].id}/complete/")

    assert response.status_code == 400
    assert "servicios" in response.data["detail"].lower()
    tasks["services"].refresh_from_db()
    assert tasks["services"].status == TaskStatus.PENDING


def test_task_api_exposes_read_only_onboarding_step_id(api_client, default_business):
    task = sync_onboarding_tasks(default_business)["business"]

    response = api_client.get(f"/api/tasks/{task.id}/")

    assert response.status_code == 200
    assert response.data["onboarding_step_id"] == "business"
