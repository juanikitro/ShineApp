import base64
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from io import BytesIO
import re

import pytest
import fitz
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import BusinessProfile
from customers.models import Customer, Vehicle
from customers.serializers import VehicleSerializer
from debts.models import Debt
from finance.models import CashClosure, CashMovement, Payment
from inventory.models import Material, MaterialConsumption, MaterialOpenUnit, MaterialPurchase
from quotes.models import Quote, QuoteItem
from scheduling.models import Reservation, ReservationItem
from workorders.models import WorkOrder


def _set_global_capacity(wash, detailing):
    profile = BusinessProfile.get_solo()
    profile.default_capacity_wash = wash
    profile.default_capacity_detailing = detailing
    profile.save(
        update_fields=["default_capacity_wash", "default_capacity_detailing"]
    )


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="admin", password="admin123")
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def employee_client(db, django_user_model):
    user = django_user_model.objects.create_user(username="empleado", password="empleado123")
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    user.groups.add(employee_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def base_data(db):
    customer = Customer.objects.create(name="Juan Perez", phone="1122334455", email="juan@example.com")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
        color="Gris",
    )
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        estimated_duration_minutes=90,
    )
    return customer, vehicle, service


def response_payload(response):
    return response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data


def create_work_order(
    customer,
    vehicle,
    service,
    *,
    status=Reservation.Status.CONFIRMED,
    total_amount=None,
    day=date(2026, 4, 28),
    **order_fields,
):
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=day,
        status=status,
    )
    order = reservation.work_order
    update_fields = []
    if total_amount is not None:
        order.total_amount = total_amount
        update_fields.append("total_amount")
    for field, value in order_fields.items():
        setattr(order, field, value)
        update_fields.append(field)
    if update_fields:
        order.save(update_fields=update_fields)
    return order


def pdf_text(pdf_content):
    document = fitz.open(stream=pdf_content, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in document)
    finally:
        document.close()


@pytest.mark.django_db
def test_service_icon_is_optional_editable_and_exposed(api_client):
    response = api_client.post(
        reverse("service-list"),
        {
            "name": "Lavado express",
            "service_type": Service.ServiceType.WASH,
            "base_price": "9000.00",
            "estimated_duration_minutes": 45,
            "icon": "🧽",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["icon"] == "🧽"

    updated = api_client.patch(
        reverse("service-detail", args=[response.data["id"]]),
        {"icon": "✨"},
        format="json",
    )

    assert updated.status_code == 200
    assert updated.data["icon"] == "✨"

    cleared = api_client.patch(
        reverse("service-detail", args=[response.data["id"]]),
        {"icon": ""},
        format="json",
    )

    assert cleared.status_code == 200
    assert cleared.data["icon"] == ""


@pytest.mark.django_db
def test_service_icon_travels_to_reservation_and_quote_items(api_client, base_data):
    customer, vehicle, _service = base_data
    service_response = api_client.post(
        reverse("service-list"),
        {
            "name": "Limpieza interior",
            "service_type": Service.ServiceType.DETAILING,
            "base_price": "18000.00",
            "estimated_duration_minutes": 90,
            "icon": "✨",
        },
        format="json",
    )
    service_id = service_response.data["id"]

    reservation = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "items": [{"service": service_id}],
        },
        format="json",
    )

    assert reservation.status_code == 201
    assert reservation.data["items"][0]["service_icon"] == "✨"

    quote = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "items": [{"service": service_id}],
        },
        format="json",
    )

    assert quote.status_code == 201
    assert quote.data["items"][0]["service_icon"] == "✨"


@pytest.mark.django_db
def test_vehicle_can_be_created_without_model_and_keeps_clean_label(api_client):
    customer = Customer.objects.create(name="Ana Lopez")

    response = api_client.post(
        reverse("vehicle-list"),
        {
            "customer": customer.id,
            "license_plate": "cd456ef",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["model"] == ""
    assert response.data["label"] == "CD456EF"


@pytest.mark.django_db
def test_vehicle_can_be_created_without_license_plate():
    customer = Customer.objects.create(name="Cliente sin patente")

    first = VehicleSerializer(
        data={
            "customer": customer.id,
            "brand": "Toyota",
            "model": "Corolla",
            "color": "Blanco",
        }
    )
    second = VehicleSerializer(
        data={
            "customer": customer.id,
            "license_plate": "",
            "brand": "Ford",
            "model": "Focus",
        }
    )

    assert first.is_valid(), first.errors
    first_vehicle = first.save()
    assert first_vehicle.license_plate == ""
    assert str(first_vehicle) == "Toyota Corolla"

    assert second.is_valid(), second.errors
    second_vehicle = second.save()
    assert second_vehicle.license_plate == ""
    assert str(second_vehicle) == "Ford Focus"


@pytest.mark.django_db
def test_vehicle_license_plate_stays_unique_when_present():
    customer = Customer.objects.create(name="Cliente con patente")
    Vehicle.objects.create(customer=customer, license_plate="AB123CD")

    serializer = VehicleSerializer(
        data={
            "customer": customer.id,
            "license_plate": "ab123cd",
            "brand": "Toyota",
        }
    )

    assert not serializer.is_valid()
    assert "license_plate" in serializer.errors


@pytest.mark.django_db
def test_reservation_and_quote_reject_vehicle_from_another_customer(api_client, base_data):
    customer, _vehicle, service = base_data
    other_customer = Customer.objects.create(name="Maria Gomez")
    other_vehicle = Vehicle.objects.create(
        customer=other_customer,
        license_plate="zz999zz",
        model="Gol",
    )

    reservation = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": other_vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
        },
        format="json",
    )
    quote = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": other_vehicle.id,
            "items": [{"service": service.id}],
        },
        format="json",
    )

    assert reservation.status_code == 400
    assert quote.status_code == 400
    assert "vehiculo" in str(reservation.data).lower()
    assert "vehiculo" in str(quote.data).lower()


@pytest.mark.django_db
def test_auth_me_exposes_role_and_can_view_economy(api_client, employee_client):
    employer_response = api_client.get(reverse("auth-me"))
    employee_response = employee_client.get(reverse("auth-me"))

    assert employer_response.status_code == 200
    assert employer_response.data["role"] == "empleador"
    assert employer_response.data["can_view_economy"] is True
    assert employer_response.data["is_active"] is True
    assert employer_response.data["avatar_url"] is None
    assert employer_response.data["phone_country_code"] == "+54"
    assert employer_response.data["phone_number"] == ""
    assert employer_response.data["phone_display"] == ""
    assert employer_response.data["subscription_type"] == "trial"
    assert employer_response.data["subscription_type_label"] == "Prueba"
    assert employer_response.data["date_joined"]
    assert employer_response.data["last_login"] is None
    assert employee_response.status_code == 200
    assert employee_response.data["role"] == "empleado"
    assert employee_response.data["can_view_economy"] is False
    assert employee_response.data["subscription_type"] == "trial"
    assert employee_response.data["phone_country_code"] == "+54"


@pytest.mark.django_db
def test_employer_can_update_own_profile_and_subscription_type(api_client, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        logo = SimpleUploadedFile(
            "avatar.png",
            b"\x89PNG\r\n\x1a\navatar-falso",
            content_type="image/png",
        )

        response = api_client.patch(
            reverse("auth-me"),
            {
                "email": "admin@shineapp.test",
                "phone_country_code": "+598",
                "phone_number": "987654321",
                "subscription_type": "premium",
                "avatar": logo,
            },
            format="multipart",
        )

        assert response.status_code == 200, response.data
        assert response.data["email"] == "admin@shineapp.test"
        assert response.data["phone_country_code"] == "+598"
        assert response.data["phone_number"] == "987654321"
        assert response.data["phone_display"] == "+598 987654321"
        assert response.data["subscription_type"] == "premium"
        assert response.data["subscription_type_label"] == "Premium"
        assert "/media/user-profiles/" in response.data["avatar_url"]


@pytest.mark.django_db
def test_employer_can_update_own_profile_with_pdf_avatar(api_client, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        avatar = SimpleUploadedFile(
            "avatar.pdf",
            b"%PDF-1.4\navatar-falso",
            content_type="application/pdf",
        )

        response = api_client.patch(
            reverse("auth-me"),
            {
                "avatar": avatar,
            },
            format="multipart",
        )

        assert response.status_code == 200, response.data
        assert response.data["avatar_url"].endswith(".pdf")
        assert "/media/user-profiles/" in response.data["avatar_url"]


@pytest.mark.django_db
def test_employee_can_update_profile_but_cannot_change_subscription_type(employee_client):
    response = employee_client.patch(
        reverse("auth-me"),
        {
            "email": "empleado@shineapp.test",
            "phone_country_code": "+56",
            "phone_number": "123456789",
        },
        format="json",
    )

    assert response.status_code == 200, response.data
    assert response.data["email"] == "empleado@shineapp.test"
    assert response.data["phone_country_code"] == "+56"
    assert response.data["phone_number"] == "123456789"
    assert response.data["phone_display"] == "+56 123456789"
    assert response.data["subscription_type"] == "trial"

    forbidden = employee_client.patch(
        reverse("auth-me"),
        {
            "subscription_type": "premium",
        },
        format="json",
    )

    assert forbidden.status_code == 403
    assert "permis" in str(forbidden.data).lower()


@pytest.mark.django_db
def test_employer_can_list_and_create_employee_users(api_client, django_user_model):
    response = api_client.post(
        reverse("auth-employees"),
        {
            "username": "operario",
            "email": "operario@example.com",
            "password": "operario123",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["username"] == "operario"
    assert response.data["email"] == "operario@example.com"
    assert response.data["role"] == "empleado"
    assert response.data["can_view_economy"] is False
    assert "password" not in response.data

    created = django_user_model.objects.get(username="operario")
    assert created.groups.filter(name="empleado").exists()
    assert not created.groups.filter(name="empleador").exists()
    assert created.check_password("operario123")

    list_response = api_client.get(reverse("auth-employees"))
    assert list_response.status_code == 200
    listed = response_payload(list_response)
    assert any(item["username"] == "operario" for item in listed)

    login_client = APIClient()
    login_response = login_client.post(
        reverse("auth-login"),
        {"username": "operario", "password": "operario123"},
        format="json",
    )
    assert login_response.status_code == 200
    assert login_response.data["user"]["role"] == "empleado"
    assert login_response.data["user"]["can_view_economy"] is False
    assert login_response.data["user"]["phone_country_code"] == "+54"
    assert login_response.data["user"]["subscription_type"] == "trial"
    assert login_response.data["user"]["avatar_url"] is None
    assert login_response.data["user"]["last_login"] is not None


@pytest.mark.django_db
def test_employee_cannot_manage_employee_users(employee_client):
    list_response = employee_client.get(reverse("auth-employees"))
    create_response = employee_client.post(
        reverse("auth-employees"),
        {
            "username": "otro",
            "password": "otro123",
        },
        format="json",
    )

    assert list_response.status_code == 403
    assert create_response.status_code == 403


@pytest.mark.django_db
def test_employee_is_denied_financial_endpoints(employee_client, base_data):
    customer, vehicle, service = base_data
    quote = Quote.objects.create(customer=customer, vehicle=vehicle)
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description="Lavado premium",
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    endpoints = [
        (reverse("payment-list"), "get"),
        (reverse("cashmovement-list"), "get"),
        (reverse("cash-daily"), "get"),
        (reverse("cash-close"), "post"),
        (reverse("quote-list"), "get"),
        (reverse("quote-pdf", args=[quote.id]), "get"),
        (reverse("material-list"), "get"),
        (reverse("materialpurchase-list"), "get"),
        (reverse("materialconsumption-list"), "get"),
        (reverse("debt-list"), "get"),
        (reverse("debtpayment-list"), "get"),
        (reverse("customer-history", args=[customer.id]), "get"),
        (reverse("vehicle-history", args=[vehicle.id]), "get"),
        (f"/api/services/{service.id}/history/", "get"),
    ]

    for url, method in endpoints:
        request = getattr(employee_client, method)
        response = request(url, {}, format="json") if method == "post" else request(url)
        assert response.status_code == 403, url


@pytest.mark.django_db
def test_employee_can_access_dashboard_birthdays_without_economy(employee_client):
    today = timezone.localdate()
    birthday = today + timedelta(days=2)
    customer = Customer.objects.create(
        name="Cumple Cliente",
        birthday_month=birthday.month,
        birthday_day=birthday.day,
    )

    response = employee_client.get(reverse("dashboard-summary"))

    assert response.status_code == 200
    assert "sales_total" not in response.data
    assert "today_income" not in response.data
    assert "comparison" not in response.data
    assert "rankings" not in response.data
    assert "receivables_aging" not in response.data
    assert "debt_timing" not in response.data
    assert response.data["birthday_alert_days"] == 3
    assert response.data["birthday_alerts"][0]["id"] == customer.id
    assert response.data["birthday_alerts"][0]["days_until_birthday"] == 2


@pytest.mark.django_db
def test_employer_can_access_financial_endpoints(api_client, base_data):
    customer, vehicle, service = base_data
    quote = Quote.objects.create(customer=customer, vehicle=vehicle)
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description="Lavado premium",
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    urls = [
        reverse("payment-list"),
        reverse("cashmovement-list"),
        reverse("cash-daily"),
        reverse("dashboard-summary"),
        reverse("quote-list"),
        reverse("quote-pdf", args=[quote.id]),
        reverse("material-list"),
        reverse("materialpurchase-list"),
        reverse("materialconsumption-list"),
        reverse("debt-list"),
        reverse("debtpayment-list"),
        reverse("customer-history", args=[customer.id]),
        reverse("vehicle-history", args=[vehicle.id]),
        f"/api/services/{service.id}/history/",
    ]

    for url in urls:
        response = api_client.get(url)
        assert response.status_code != 403, url


@pytest.mark.django_db
def test_customer_accepts_day_month_birthday_and_rejects_invalid_values(api_client):
    valid_response = api_client.post(
        reverse("customer-list"),
        {
            "name": "Cliente con cumple",
            "birthday_month": 4,
            "birthday_day": 15,
        },
        format="json",
    )
    incomplete_response = api_client.post(
        reverse("customer-list"),
        {
            "name": "Cliente incompleto",
            "birthday_month": 4,
        },
        format="json",
    )
    invalid_response = api_client.post(
        reverse("customer-list"),
        {
            "name": "Cliente invalido",
            "birthday_month": 2,
            "birthday_day": 31,
        },
        format="json",
    )

    assert valid_response.status_code == 201
    assert valid_response.data["birthday_month"] == 4
    assert valid_response.data["birthday_day"] == 15
    assert valid_response.data["birthday_label"] == "15/04"
    assert "next_birthday" in valid_response.data
    assert "days_until_birthday" in valid_response.data
    assert incomplete_response.status_code == 400
    assert invalid_response.status_code == 400


@pytest.mark.django_db
def test_customer_birthdays_endpoint_returns_next_three_days(api_client):
    today = timezone.localdate()
    included_day = today + timedelta(days=3)
    excluded_day = today + timedelta(days=4)
    included = Customer.objects.create(
        name="Cumple incluido",
        birthday_month=included_day.month,
        birthday_day=included_day.day,
    )
    Customer.objects.create(
        name="Cumple fuera",
        birthday_month=excluded_day.month,
        birthday_day=excluded_day.day,
    )
    Customer.objects.create(name="Sin cumple")

    response = api_client.get(reverse("customer-birthdays"), {"days": 3})

    assert response.status_code == 200
    assert response.data["days"] == 3
    assert [item["id"] for item in response.data["results"]] == [included.id]
    assert response.data["results"][0]["birthday_label"] == included.birthday_label
    assert response.data["results"][0]["days_until_birthday"] == 3


@pytest.mark.django_db
def test_customer_list_returns_operational_insights_for_employer(api_client, base_data):
    customer, vehicle, service = base_data
    today = timezone.localdate()
    last_visit = timezone.make_aware(
        datetime.combine(today - timedelta(days=8), time(9, 0))
    )
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.READY,
        total_amount=Decimal("20000.00"),
        received_at=last_visit,
    )
    Payment.objects.create(
        work_order=order,
        amount=Decimal("2000.00"),
        method=Payment.Method.CASH,
        paid_at=last_visit,
    )
    upcoming_reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=today + timedelta(days=2),
        start_time=time(10, 30),
        status=Reservation.Status.CONFIRMED,
    )
    quote = Quote.objects.create(
        customer=customer,
        vehicle=vehicle,
        quote_date=today - timedelta(days=1),
        status=Quote.Status.DRAFT,
    )
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    response = api_client.get(reverse("customer-list"))

    assert response.status_code == 200
    payload = response_payload(response)
    item = next(row for row in payload if row["id"] == customer.id)

    assert item["list_insights"] == {
        "last_visit_at": last_visit,
        "days_since_last_visit": 8,
        "last_service_name": service.name,
        "last_vehicle_label": str(vehicle),
        "next_reservation": {
            "id": upcoming_reservation.id,
            "day": today + timedelta(days=2),
            "start_time": time(10, 30),
            "status": Reservation.Status.CONFIRMED,
            "vehicle_label": str(vehicle),
            "service_name": service.name,
        },
        "has_upcoming_reservation": True,
        "needs_follow_up": False,
        "balance_due_total": Decimal("18000.00"),
        "has_balance_due": True,
        "open_quotes_count": 1,
    }


@pytest.mark.django_db
def test_customer_list_hides_economy_fields_for_employee(employee_client, base_data):
    customer, vehicle, service = base_data
    today = timezone.localdate()
    last_visit = timezone.make_aware(
        datetime.combine(today - timedelta(days=5), time(11, 0))
    )
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.IN_PROGRESS,
        total_amount=Decimal("17000.00"),
        received_at=last_visit,
    )
    Payment.objects.create(
        work_order=order,
        amount=Decimal("3000.00"),
        method=Payment.Method.TRANSFER,
        paid_at=last_visit,
    )
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=today + timedelta(days=1),
        start_time=time(14, 0),
        status=Reservation.Status.PENDING,
    )
    quote = Quote.objects.create(
        customer=customer,
        vehicle=vehicle,
        quote_date=today,
        status=Quote.Status.SENT,
    )
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    response = employee_client.get(reverse("customer-list"))

    assert response.status_code == 200
    payload = response_payload(response)
    item = next(row for row in payload if row["id"] == customer.id)

    assert item["list_insights"]["last_visit_at"] == last_visit
    assert item["list_insights"]["days_since_last_visit"] == 5
    assert item["list_insights"]["last_service_name"] == service.name
    assert item["list_insights"]["last_vehicle_label"] == str(vehicle)
    assert item["list_insights"]["has_upcoming_reservation"] is True
    assert item["list_insights"]["needs_follow_up"] is False
    assert "balance_due_total" not in item["list_insights"]
    assert "has_balance_due" not in item["list_insights"]
    assert "open_quotes_count" not in item["list_insights"]


@pytest.mark.django_db
def test_customer_list_marks_customer_without_visits_or_reservations_as_follow_up(
    api_client,
):
    customer = Customer.objects.create(name="Cliente nuevo", phone="1199988877")

    response = api_client.get(reverse("customer-list"))

    assert response.status_code == 200
    payload = response_payload(response)
    item = next(row for row in payload if row["id"] == customer.id)

    assert item["list_insights"]["last_visit_at"] is None
    assert item["list_insights"]["days_since_last_visit"] is None
    assert item["list_insights"]["next_reservation"] is None
    assert item["list_insights"]["has_upcoming_reservation"] is False
    assert item["list_insights"]["needs_follow_up"] is True


@pytest.mark.django_db
def test_customer_history_summarizes_work_payments_and_material_cost(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("20000.00"),
    )
    material = Material.objects.create(
        name="Shampoo",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal("10.00"),
    )
    MaterialConsumption.objects.create(
        work_order=order,
        material=material,
        consumed_at=date(2026, 4, 28),
        quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("1000.00"),
    )
    CashClosure.objects.all().delete()
    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "15000.00",
            "method": "cash",
        },
        format="json",
    )
    assert payment_response.status_code == 201

    response = api_client.get(reverse("customer-history", args=[customer.id]))

    assert response.status_code == 200
    assert response.data["summary"] == {
        "work_orders_count": 1,
        "sales_total": Decimal("20000.00"),
        "billed_total": Decimal("20000.00"),
        "paid_total": Decimal("15000.00"),
        "balance_due_total": Decimal("5000.00"),
        "material_cost_total": Decimal("1000.00"),
        "margin_total": Decimal("19000.00"),
    }
    assert response.data["services"][0]["name"] == service.name
    assert response.data["services"][0]["work_orders_count"] == 1
    assert response.data["work_orders"][0]["payments"][0]["amount"] == Decimal("15000.00")
    assert response.data["work_orders"][0]["material_consumptions"][0]["material_name"] == material.name


@pytest.mark.django_db
def test_customer_history_dashboard_returns_rankings_and_payments_history(api_client, base_data):
    customer, vehicle, service = base_data
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("30000.00"),
        estimated_duration_minutes=180,
    )
    second_vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="zz999zz",
        brand="Toyota",
        model="Hilux",
    )
    ford_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("20000.00"),
    )
    second_ford_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.READY,
        total_amount=Decimal("12000.00"),
    )
    toyota_order = create_work_order(
        customer=customer,
        vehicle=second_vehicle,
        service=ceramic,
        status=WorkOrder.Status.IN_PROGRESS,
        total_amount=Decimal("30000.00"),
    )
    material = Material.objects.create(
        name="Insumo tablero",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal("10.00"),
    )
    MaterialConsumption.objects.create(
        work_order=ford_order,
        material=material,
        consumed_at=date(2026, 4, 28),
        quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("1000.00"),
    )
    MaterialConsumption.objects.create(
        work_order=second_ford_order,
        material=material,
        consumed_at=date(2026, 4, 29),
        quantity=Decimal("50.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("500.00"),
    )
    MaterialConsumption.objects.create(
        work_order=toyota_order,
        material=material,
        consumed_at=date(2026, 4, 30),
        quantity=Decimal("200.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("2000.00"),
    )
    Payment.objects.create(
        work_order=ford_order,
        amount=Decimal("15000.00"),
        method=Payment.Method.CASH,
        paid_at=timezone.make_aware(datetime(2026, 4, 28, 10, 0)),
    )
    Payment.objects.create(
        work_order=second_ford_order,
        amount=Decimal("12000.00"),
        method=Payment.Method.CARD,
        paid_at=timezone.make_aware(datetime(2026, 4, 29, 11, 0)),
    )
    latest_payment = Payment.objects.create(
        work_order=toyota_order,
        amount=Decimal("10000.00"),
        method=Payment.Method.TRANSFER,
        notes="Transferencia parcial",
        paid_at=timezone.make_aware(datetime(2026, 4, 30, 12, 0)),
    )

    response = api_client.get(reverse("customer-history", args=[customer.id]))

    assert response.status_code == 200
    assert response.data["summary"]["sales_total"] == Decimal("62000.00")
    assert response.data["summary"]["paid_total"] == Decimal("37000.00")
    assert response.data["summary"]["balance_due_total"] == Decimal("25000.00")
    assert response.data["services"][0]["name"] == service.name
    assert response.data["services"][0]["work_orders_count"] == 2
    assert response.data["services"][0]["billed_total"] == Decimal("32000.00")
    assert response.data["vehicles_ranking"][0]["id"] == vehicle.id
    assert response.data["vehicles_ranking"][0]["label"] == str(vehicle)
    assert response.data["vehicles_ranking"][0]["brand"] == "Ford"
    assert response.data["vehicles_ranking"][0]["work_orders_count"] == 2
    assert response.data["brands_ranking"][0]["name"] == "Ford"
    assert response.data["brands_ranking"][0]["work_orders_count"] == 2
    assert response.data["brands_ranking"][1]["name"] == "Toyota"
    assert response.data["payments_history"][0]["id"] == latest_payment.id
    assert response.data["payments_history"][0]["amount"] == Decimal("10000.00")
    assert response.data["payments_history"][0]["service"] == ceramic.name
    assert response.data["payments_history"][0]["vehicle"] == str(second_vehicle)
    assert response.data["payments_history"][0]["vehicle_brand"] == "Toyota"
    assert len(response.data["payments_history"]) == 3


@pytest.mark.django_db
def test_customer_history_dashboard_returns_operational_insights_quotes_and_upcoming_reservations(
    api_client, base_data
):
    customer, vehicle, service = base_data
    today = timezone.localdate()
    older_visit = timezone.make_aware(
        datetime.combine(today - timedelta(days=30), time(9, 0))
    )
    middle_visit = timezone.make_aware(
        datetime.combine(today - timedelta(days=20), time(10, 0))
    )
    latest_visit = timezone.make_aware(
        datetime.combine(today - timedelta(days=10), time(11, 0))
    )
    second_vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="xy123zz",
        brand="Toyota",
        model="Corolla",
    )
    polishing = Service.objects.create(
        name="Pulido premium",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("40000.00"),
        estimated_duration_minutes=240,
    )
    first_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
        received_at=older_visit,
    )
    second_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.READY,
        total_amount=Decimal("18000.00"),
        received_at=middle_visit,
    )
    third_order = create_work_order(
        customer=customer,
        vehicle=second_vehicle,
        service=polishing,
        status=WorkOrder.Status.IN_PROGRESS,
        total_amount=Decimal("40000.00"),
        received_at=latest_visit,
    )
    Payment.objects.create(
        work_order=first_order,
        amount=Decimal("15000.00"),
        method=Payment.Method.CASH,
        paid_at=older_visit,
    )
    Payment.objects.create(
        work_order=second_order,
        amount=Decimal("8000.00"),
        method=Payment.Method.CARD,
        paid_at=middle_visit,
    )
    Payment.objects.create(
        work_order=third_order,
        amount=Decimal("10000.00"),
        method=Payment.Method.TRANSFER,
        paid_at=latest_visit,
    )
    upcoming_reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=today + timedelta(days=2),
        start_time=time(15, 0),
        status=Reservation.Status.CONFIRMED,
    )
    Reservation.objects.create(
        customer=customer,
        vehicle=second_vehicle,
        service=polishing,
        day=today - timedelta(days=4),
        start_time=time(8, 0),
        status=Reservation.Status.CONFIRMED,
    )
    latest_quote = Quote.objects.create(
        customer=customer,
        vehicle=second_vehicle,
        quote_date=today - timedelta(days=1),
        status=Quote.Status.SENT,
    )
    QuoteItem.objects.create(
        quote=latest_quote,
        service=polishing,
        description=polishing.name,
        quantity=Decimal("1.00"),
        unit_price=Decimal("40000.00"),
    )
    latest_quote.recalculate()
    old_quote = Quote.objects.create(
        customer=customer,
        vehicle=vehicle,
        quote_date=today - timedelta(days=15),
        status=Quote.Status.DRAFT,
    )
    QuoteItem.objects.create(
        quote=old_quote,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    old_quote.recalculate()
    accepted_quote = Quote.objects.create(
        customer=customer,
        vehicle=vehicle,
        quote_date=today - timedelta(days=40),
        status=Quote.Status.ACCEPTED,
    )
    QuoteItem.objects.create(
        quote=accepted_quote,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=Decimal("14000.00"),
    )
    accepted_quote.recalculate()

    response = api_client.get(reverse("customer-history", args=[customer.id]))

    assert response.status_code == 200
    assert response.data["insights"] == {
        "last_visit_at": latest_visit,
        "days_since_last_visit": 10,
        "last_service_name": polishing.name,
        "last_vehicle_label": str(second_vehicle),
        "average_ticket": Decimal("24333.33"),
        "average_days_between_visits": 10,
        "balance_due_work_orders_count": 2,
        "open_quotes_count": 2,
        "quotes_total": 3,
        "upcoming_reservations_count": 1,
        "preferred_service_name": service.name,
        "preferred_vehicle_label": str(vehicle),
        "preferred_brand_name": "Ford",
        "next_reservation": {
            "id": upcoming_reservation.id,
            "day": today + timedelta(days=2),
            "exit_day": None,
            "start_time": time(15, 0),
            "exit_time": None,
            "status": Reservation.Status.CONFIRMED,
            "vehicle": str(vehicle),
            "vehicle_id": vehicle.id,
            "services": service.name,
        },
    }
    assert response.data["upcoming_reservations"] == [
        {
            "id": upcoming_reservation.id,
            "day": today + timedelta(days=2),
            "start_time": time(15, 0),
            "exit_time": None,
            "status": Reservation.Status.CONFIRMED,
            "vehicle": str(vehicle),
            "vehicle_id": vehicle.id,
            "services": service.name,
            "exit_day": None,
        }
    ]
    assert response.data["recent_quotes"][0]["id"] == latest_quote.id
    assert response.data["recent_quotes"][0]["status"] == Quote.Status.SENT
    assert response.data["recent_quotes"][0]["vehicle"] == str(second_vehicle)
    assert response.data["recent_quotes"][0]["services"] == polishing.name
    assert response.data["recent_quotes"][0]["total"] == Decimal("40000.00")
    assert response.data["recent_quotes"][1]["id"] == old_quote.id


@pytest.mark.django_db
def test_service_history_returns_operational_summary_and_separates_additional_usage(
    api_client, base_data
):
    customer, vehicle, service = base_data
    second_customer = Customer.objects.create(name="Maria Gomez", phone="1133344455")
    second_vehicle = Vehicle.objects.create(
        customer=second_customer,
        license_plate="zz999zz",
        brand="Toyota",
        model="Hilux",
        color="Negro",
    )
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("30000.00"),
        estimated_duration_minutes=180,
    )
    used_first = timezone.make_aware(datetime.combine(timezone.localdate() - timedelta(days=7), time(9, 0)))
    used_last = timezone.make_aware(datetime.combine(timezone.localdate() - timedelta(days=2), time(11, 0)))
    first_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
        received_at=used_first,
    )
    second_order = create_work_order(
        customer=second_customer,
        vehicle=second_vehicle,
        service=service,
        status=WorkOrder.Status.IN_PROGRESS,
        total_amount=Decimal("18000.00"),
        received_at=used_last,
    )
    Payment.objects.create(
        work_order=first_order,
        amount=Decimal("10000.00"),
        method=Payment.Method.CASH,
        paid_at=used_first,
    )
    Payment.objects.create(
        work_order=second_order,
        amount=Decimal("13000.00"),
        method=Payment.Method.TRANSFER,
        paid_at=used_last,
    )
    material = Material.objects.create(
        name="Shampoo premium",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal("10.00"),
    )
    MaterialConsumption.objects.create(
        work_order=first_order,
        material=material,
        consumed_at=used_first.date(),
        quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("1000.00"),
    )
    MaterialConsumption.objects.create(
        work_order=second_order,
        material=material,
        consumed_at=used_last.date(),
        quantity=Decimal("150.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("1500.00"),
    )
    next_reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=timezone.localdate() + timedelta(days=1),
        start_time=time(9, 30),
        status=Reservation.Status.CONFIRMED,
    )
    addon_reservation = Reservation.objects.create(
        customer=second_customer,
        vehicle=second_vehicle,
        service=ceramic,
        day=timezone.localdate() + timedelta(days=3),
        start_time=time(15, 0),
        status=Reservation.Status.PENDING,
    )
    ReservationItem.objects.create(
        reservation=addon_reservation,
        service=ceramic,
        description=ceramic.name,
        quantity=Decimal("1.00"),
        unit_price=ceramic.base_price,
    )
    ReservationItem.objects.create(
        reservation=addon_reservation,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=service.base_price,
    )
    draft_quote = Quote.objects.create(
        customer=customer,
        vehicle=vehicle,
        quote_date=timezone.localdate() - timedelta(days=1),
        status=Quote.Status.DRAFT,
    )
    QuoteItem.objects.create(
        quote=draft_quote,
        service=service,
        description=service.name,
        quantity=Decimal("1.00"),
        unit_price=service.base_price,
    )
    draft_quote.recalculate()
    accepted_quote = Quote.objects.create(
        customer=second_customer,
        vehicle=second_vehicle,
        quote_date=timezone.localdate() - timedelta(days=4),
        status=Quote.Status.ACCEPTED,
    )
    QuoteItem.objects.create(
        quote=accepted_quote,
        service=service,
        description=f"{service.name} combo",
        quantity=Decimal("1.00"),
        unit_price=Decimal("14000.00"),
    )
    accepted_quote.recalculate()

    response = api_client.get(f"/api/services/{service.id}/history/")

    assert response.status_code == 200
    assert response.data["service"]["id"] == service.id
    assert response.data["summary"] == {
        "work_orders_count": 2,
        "active_work_orders_count": 1,
        "upcoming_reservations_count": 1,
        "quotes_total": 2,
        "open_quotes_count": 1,
        "quote_item_usages_count": 2,
        "additional_reservation_items_count": 1,
        "sales_total": Decimal("33000.00"),
        "billed_total": Decimal("33000.00"),
        "paid_total": Decimal("23000.00"),
        "balance_due_total": Decimal("10000.00"),
        "material_cost_total": Decimal("2500.00"),
        "margin_total": Decimal("30500.00"),
    }
    assert response.data["insights"] == {
        "last_used_at": used_last,
        "days_since_last_use": 2,
        "last_customer_name": second_customer.name,
        "last_vehicle_label": str(second_vehicle),
        "average_ticket": Decimal("16500.00"),
        "next_reservation": {
            "id": next_reservation.id,
            "day": timezone.localdate() + timedelta(days=1),
            "exit_day": None,
            "start_time": time(9, 30),
            "exit_time": None,
            "status": Reservation.Status.CONFIRMED,
            "customer": customer.name,
            "customer_id": customer.id,
            "vehicle": str(vehicle),
            "vehicle_id": vehicle.id,
            "services": service.name,
        },
    }
    assert response.data["top_customers"][0]["name"] == second_customer.name
    assert response.data["top_customers"][0]["billed_total"] == Decimal("18000.00")
    assert response.data["top_vehicles"][0]["label"] == str(second_vehicle)
    assert response.data["upcoming_reservations"] == [
        {
            "id": next_reservation.id,
            "day": timezone.localdate() + timedelta(days=1),
            "exit_day": None,
            "start_time": time(9, 30),
            "exit_time": None,
            "status": Reservation.Status.CONFIRMED,
            "customer": customer.name,
            "customer_id": customer.id,
            "vehicle": str(vehicle),
            "vehicle_id": vehicle.id,
            "services": service.name,
        }
    ]
    assert response.data["active_work_orders"][0]["id"] == second_order.id
    assert response.data["active_work_orders"][0]["customer_name"] == second_customer.name
    assert response.data["recent_quotes"][0]["id"] == draft_quote.id
    assert response.data["recent_quotes"][0]["services"] == service.name


@pytest.mark.django_db
def test_employee_operational_endpoints_do_not_expose_money_fields(employee_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )
    order = reservation.work_order
    order.total_amount = Decimal("15000.00")
    order.save(update_fields=["total_amount"])

    service_response = employee_client.get(reverse("service-list"))
    work_order_response = employee_client.get(reverse("workorder-detail", args=[order.id]))
    reservation_response = employee_client.get(reverse("reservation-detail", args=[reservation.id]))
    agenda_response = employee_client.get(reverse("agenda-daily"), {"date": "2026-04-28"})

    assert service_response.status_code == 200
    service_payload = response_payload(service_response)[0]
    for field in [
        "base_price",
        "price_moto",
        "price_auto",
        "price_camioneta",
        "price_combi",
        "price_camion",
    ]:
        assert field not in service_payload
    assert work_order_response.status_code == 200
    for field in ["total_amount", "paid_amount", "balance_due", "material_cost"]:
        assert field not in work_order_response.data
    assert reservation_response.status_code == 200
    for field in ["total_amount", "paid_amount", "balance_due", "material_cost"]:
        assert field not in reservation_response.data["work_order"]
    agenda_order = agenda_response.data["reservations"][0]["work_order"]
    for field in ["total_amount", "paid_amount", "balance_due", "material_cost"]:
        assert field not in agenda_order


@pytest.mark.django_db
def test_reservation_capacity_blocks_overbooking(api_client, base_data):
    customer, vehicle, service = base_data
    _set_global_capacity(1, 1)
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "14:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "capacidad" in str(response.data).lower()


@pytest.mark.django_db
def test_reservation_capacity_not_enforced_when_limit_disabled(api_client, base_data):
    customer, vehicle, service = base_data
    _set_global_capacity(1, 1)
    profile = BusinessProfile.get_solo()
    profile.enforce_capacity_limit = False
    profile.save(update_fields=["enforce_capacity_limit"])
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "14:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 201, response.data


@pytest.mark.django_db
def test_reservation_capacity_separates_wash_and_detailing(api_client, base_data):
    customer, vehicle, wash_service = base_data
    detailing_service = Service.objects.create(
        name="Detailing completo",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("60000.00"),
        estimated_duration_minutes=180,
    )
    _set_global_capacity(1, 1)
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=wash_service,
        day=date(2026, 4, 28),
        start_time=time(9, 0),
        status=Reservation.Status.CONFIRMED,
    )

    detailing_response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": detailing_service.id,
            "day": "2026-04-28",
            "start_time": "11:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert detailing_response.status_code == 201, detailing_response.data

    second_wash_response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": wash_service.id,
            "day": "2026-04-28",
            "start_time": "15:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert second_wash_response.status_code == 400
    assert "lavado" in str(second_wash_response.data).lower()

    second_detailing_response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": detailing_service.id,
            "day": "2026-04-28",
            "start_time": "16:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )
    assert second_detailing_response.status_code == 400
    assert "detailing" in str(second_detailing_response.data).lower()


@pytest.mark.django_db
def test_work_order_can_be_created_from_reservation(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    response = api_client.post(
        reverse("workorder-from-reservation"),
        {"reservation": reservation.id},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["customer"] == customer.id
    assert response.data["vehicle"] == vehicle.id
    assert response.data["service"] == service.id
    assert Decimal(response.data["total_amount"]) == service.base_price
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.CONFIRMED


@pytest.mark.django_db
def test_confirmed_reservation_auto_creates_embedded_work_order(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "status": Reservation.Status.CONFIRMED,
        },
        format="json",
    )

    assert response.status_code == 201
    reservation = Reservation.objects.get(pk=response.data["id"])
    order = WorkOrder.objects.get(reservation=reservation)
    assert order.customer == customer
    assert order.vehicle == vehicle
    assert order.service == service
    assert order.total_amount == service.base_price
    assert response.data["work_order"]["id"] == order.id
    assert response.data["work_order"]["status"] == Reservation.Status.CONFIRMED
    assert Decimal(response.data["work_order"]["balance_due"]) == service.base_price


@pytest.mark.django_db
def test_confirm_action_auto_creates_work_order_once(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.PENDING,
    )

    first_response = api_client.post(reverse("reservation-confirm", args=[reservation.id]), format="json")
    second_response = api_client.post(reverse("reservation-confirm", args=[reservation.id]), format="json")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert WorkOrder.objects.filter(reservation=reservation).count() == 1
    order = WorkOrder.objects.get(reservation=reservation)
    assert first_response.data["work_order"]["id"] == order.id
    assert second_response.data["work_order"]["id"] == order.id


@pytest.mark.django_db
def test_confirm_action_reactivates_canceled_reservation(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CANCELED,
    )

    response = api_client.post(reverse("reservation-confirm", args=[reservation.id]), format="json")

    assert response.status_code == 200
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.CONFIRMED
    order = WorkOrder.objects.get(reservation=reservation)
    assert response.data["status"] == Reservation.Status.CONFIRMED
    assert response.data["work_order"]["id"] == order.id


@pytest.mark.django_db
def test_confirm_action_rejects_canceled_reservation_when_day_is_full(api_client, base_data):
    customer, vehicle, service = base_data
    _set_global_capacity(1, 1)
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(9, 0),
        status=Reservation.Status.CONFIRMED,
    )
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CANCELED,
    )

    response = api_client.post(reverse("reservation-confirm", args=[reservation.id]), format="json")

    assert response.status_code == 400
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.CANCELED
    assert WorkOrder.objects.filter(reservation=reservation).count() == 1
    assert "capacidad" in str(response.data).lower()


@pytest.mark.django_db
def test_delete_canceled_reservation_removes_it(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CANCELED,
    )

    response = api_client.delete(reverse("reservation-detail", args=[reservation.id]))

    assert response.status_code == 204
    assert not Reservation.objects.filter(pk=reservation.pk).exists()


@pytest.mark.django_db
def test_delete_canceled_reservation_with_payment_open_cash_succeeds(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )
    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "cash",
        },
        format="json",
    )
    assert payment_response.status_code == 201
    payment_id = payment_response.data["id"]
    order.reservation.status = Reservation.Status.CANCELED
    order.reservation.save(update_fields=["status", "updated_at"])

    delete_response = api_client.delete(reverse("reservation-detail", args=[order.reservation_id]))

    assert delete_response.status_code == 204
    assert not Reservation.objects.filter(pk=order.reservation_id).exists()
    assert not WorkOrder.objects.filter(pk=order.pk).exists()
    assert not Payment.objects.filter(pk=payment_id).exists()
    assert not CashMovement.objects.filter(payment_id=payment_id).exists()


@pytest.mark.django_db
def test_delete_canceled_reservation_with_payment_closed_cash_returns_400(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )
    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "cash",
        },
        format="json",
    )
    assert payment_response.status_code == 201
    payment_id = payment_response.data["id"]
    payment = Payment.objects.get(pk=payment_id)
    closed_day = payment.paid_at.date() if hasattr(payment.paid_at, "date") else payment.paid_at
    CashClosure.objects.create(
        day=closed_day,
        total_income=Decimal("5000.00"),
        total_expense=Decimal("0.00"),
        balance=Decimal("5000.00"),
    )
    order.reservation.status = Reservation.Status.CANCELED
    order.reservation.save(update_fields=["status", "updated_at"])

    delete_response = api_client.delete(reverse("reservation-detail", args=[order.reservation_id]))

    assert delete_response.status_code == 400
    assert "paid_at" in delete_response.data
    assert Reservation.objects.filter(pk=order.reservation_id).exists()
    assert WorkOrder.objects.filter(pk=order.pk).exists()
    assert Payment.objects.filter(pk=payment_id).exists()
    assert CashMovement.objects.filter(payment_id=payment_id).exists()


@pytest.mark.django_db
def test_delete_canceled_reservation_soft_deletes_cascade_entities(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )
    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "cash",
        },
        format="json",
    )
    payment_id = payment_response.data["id"]
    movement = CashMovement.objects.get(payment_id=payment_id)
    order.reservation.status = Reservation.Status.CANCELED
    order.reservation.save(update_fields=["status", "updated_at"])

    delete_response = api_client.delete(reverse("reservation-detail", args=[order.reservation_id]))

    assert delete_response.status_code == 204
    reservation_dead = Reservation.all_objects.get(pk=order.reservation_id)
    assert reservation_dead.deleted_at is not None
    work_order_dead = WorkOrder.all_objects.get(pk=order.pk)
    assert work_order_dead.deleted_at is not None
    payment_dead = Payment.all_objects.get(pk=payment_id)
    assert payment_dead.deleted_at is not None
    movement_dead = CashMovement.all_objects.get(pk=movement.pk)
    assert movement_dead.deleted_at is not None


@pytest.mark.django_db
def test_vehicle_unique_license_plate_allows_recreate_after_soft_delete(api_client, base_data):
    customer, vehicle, _service = base_data
    plate = vehicle.license_plate

    delete_response = api_client.delete(reverse("vehicle-detail", args=[vehicle.id]))
    assert delete_response.status_code == 204

    create_response = api_client.post(
        reverse("vehicle-list"),
        {
            "customer": customer.id,
            "license_plate": plate,
            "brand": "Ford",
            "model": "EcoSport",
            "color": "Negro",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.data
    assert create_response.data["license_plate"] == plate.upper()


@pytest.mark.django_db
def test_delete_canceled_reservation_with_stock_consumption_returns_400(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )
    material = Material.objects.create(
        name="Shampoo",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal("2.50"),
    )
    MaterialConsumption.objects.create(
        work_order=order,
        material=material,
        consumed_at=date(2026, 4, 28),
        quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("2.50"),
        estimated_total_cost=Decimal("250.00"),
    )
    order.reservation.status = Reservation.Status.CANCELED
    order.reservation.save(update_fields=["status", "updated_at"])

    delete_response = api_client.delete(reverse("reservation-detail", args=[order.reservation_id]))

    assert delete_response.status_code == 400
    assert "inventario" in str(delete_response.data).lower()
    assert Reservation.objects.filter(pk=order.reservation_id).exists()


@pytest.mark.django_db
def test_delete_non_canceled_reservation_is_rejected(api_client, base_data):
    customer, vehicle, service = base_data
    for active_status in (
        Reservation.Status.PENDING,
        Reservation.Status.CONFIRMED,
    ):
        reservation = Reservation.objects.create(
            customer=customer,
            vehicle=vehicle,
            service=service,
            day=date(2026, 4, 28),
            start_time=time(10, 0),
            status=active_status,
        )

        response = api_client.delete(reverse("reservation-detail", args=[reservation.id]))

        assert response.status_code == 400
        assert Reservation.objects.filter(pk=reservation.pk).exists()
        reservation.delete()


@pytest.mark.django_db
def test_reservation_patch_can_move_it_to_another_day_with_capacity(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )
    _set_global_capacity(2, 2)

    response = api_client.patch(
        reverse("reservation-detail", args=[reservation.id]),
        {"day": "2026-04-29"},
        format="json",
    )

    assert response.status_code == 200
    reservation.refresh_from_db()
    assert reservation.day == date(2026, 4, 29)
    assert response.data["day"] == "2026-04-29"


@pytest.mark.django_db
def test_reservation_patch_rejects_move_to_full_day_and_keeps_original_day(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )
    _set_global_capacity(1, 1)
    Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 29),
        start_time=time(12, 0),
        status=Reservation.Status.PENDING,
    )

    response = api_client.patch(
        reverse("reservation-detail", args=[reservation.id]),
        {"day": "2026-04-29"},
        format="json",
    )

    assert response.status_code == 400
    reservation.refresh_from_db()
    assert reservation.day == date(2026, 4, 28)
    assert "capacidad" in str(response.data).lower()


@pytest.mark.django_db
def test_reservation_accepts_optional_exit_day_and_exposes_it(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "exit_day": "2026-04-30",
            "start_time": "10:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["day"] == "2026-04-28"
    assert response.data["exit_day"] == "2026-04-30"
    reservation = Reservation.objects.get(pk=response.data["id"])
    assert reservation.exit_day == date(2026, 4, 30)


@pytest.mark.django_db
def test_reservation_rejects_exit_day_before_entry_day(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "exit_day": "2026-04-27",
            "start_time": "10:00:00",
            "status": Reservation.Status.PENDING,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "egreso" in str(response.data).lower()


@pytest.mark.django_db
def test_daily_agenda_includes_reservations_across_entry_stay_and_exit_days(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = Reservation.objects.create(
        customer=customer,
        vehicle=vehicle,
        service=service,
        day=date(2026, 4, 28),
        exit_day=date(2026, 4, 30),
        start_time=time(10, 0),
        status=Reservation.Status.CONFIRMED,
    )

    entry_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-28"})
    stay_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-29"})
    exit_response = api_client.get(reverse("agenda-daily"), {"date": "2026-04-30"})
    after_response = api_client.get(reverse("agenda-daily"), {"date": "2026-05-01"})

    assert entry_response.status_code == 200
    assert stay_response.status_code == 200
    assert exit_response.status_code == 200
    assert after_response.status_code == 200
    assert [item["id"] for item in entry_response.data["reservations"]] == [reservation.id]
    assert [item["id"] for item in stay_response.data["reservations"]] == [reservation.id]
    assert [item["id"] for item in exit_response.data["reservations"]] == [reservation.id]
    assert after_response.data["reservations"] == []


@pytest.mark.django_db
def test_payment_creates_cash_income_and_updates_debt(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )

    response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "cash",
        },
        format="json",
    )

    assert response.status_code == 201
    order.refresh_from_db()
    assert order.paid_amount == Decimal("5000.00")
    assert order.balance_due == Decimal("10000.00")
    movement = CashMovement.objects.get(payment_id=response.data["id"])
    assert movement.movement_type == CashMovement.MovementType.INCOME
    assert movement.amount == Decimal("5000.00")


@pytest.mark.django_db
def test_payment_delete_removes_cash_income_and_restores_balance(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("15000.00"),
    )
    response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "5000.00",
            "payment_type": "deposit",
            "method": "cash",
        },
        format="json",
    )
    assert response.status_code == 201

    delete_response = api_client.delete(reverse("payment-detail", args=[response.data["id"]]))

    assert delete_response.status_code == 204
    assert not Payment.objects.filter(id=response.data["id"]).exists()
    assert not CashMovement.objects.filter(payment_id=response.data["id"]).exists()
    order.refresh_from_db()
    assert order.paid_amount == Decimal("0.00")
    assert order.balance_due == Decimal("15000.00")


@pytest.mark.django_db
def test_material_purchase_and_consumption_adjust_stock_and_cost(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Shampoo neutro",
        unit="ml",
        stock_quantity=Decimal("0.00"),
        estimated_unit_cost=Decimal("2.50"),
    )

    purchase = api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": "2026-04-28",
            "quantity": "1000.00",
            "total_cost": "2500.00",
            "affects_cash": True,
        },
        format="json",
    )
    assert purchase.status_code == 201
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("1000.00")
    assert material.estimated_unit_cost == Decimal("2.50")
    assert Decimal(purchase.data["total_cost"]) / Decimal(purchase.data["quantity"]) == material.estimated_unit_cost
    assert CashMovement.objects.filter(material_purchase_id=purchase.data["id"], movement_type="expense").exists()

    consumption = api_client.post(
        reverse("materialconsumption-list"),
        {
            "work_order": order.id,
            "material": material.id,
            "consumed_at": "2026-04-28",
            "quantity": "120.00",
        },
        format="json",
    )
    assert consumption.status_code == 201
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("880.00")
    assert Decimal(consumption.data["estimated_total_cost"]) == Decimal("300.00")

    api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": "2026-04-29",
            "quantity": "1000.00",
            "total_cost": "4000.00",
            "affects_cash": False,
        },
        format="json",
    )
    material.refresh_from_db()
    assert material.estimated_unit_cost == Decimal("4.00")

    api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": "2026-04-27",
            "quantity": "1000.00",
            "total_cost": "1000.00",
            "affects_cash": False,
        },
        format="json",
    )
    material.refresh_from_db()
    assert material.estimated_unit_cost == Decimal("4.00")


@pytest.mark.django_db
def test_material_purchase_update_and_delete_keep_stock_and_cash_in_sync(api_client):
    material = Material.objects.create(
        name="Shampoo neutro",
        unit="ml",
        stock_quantity=Decimal("0.00"),
        estimated_unit_cost=Decimal("0.00"),
    )

    purchase = api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": "2026-04-28",
            "quantity": "100.00",
            "total_cost": "500.00",
            "affects_cash": True,
        },
        format="json",
    )
    assert purchase.status_code == 201

    response = api_client.patch(
        reverse("materialpurchase-detail", args=[purchase.data["id"]]),
        {"quantity": "150.00", "total_cost": "900.00"},
        format="json",
    )

    assert response.status_code == 200
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("150.00")
    assert material.estimated_unit_cost == Decimal("6.00")
    movement = CashMovement.objects.get(material_purchase_id=purchase.data["id"])
    assert movement.amount == Decimal("900.00")

    response = api_client.patch(
        reverse("materialpurchase-detail", args=[purchase.data["id"]]),
        {"affects_cash": False},
        format="json",
    )

    assert response.status_code == 200
    assert not CashMovement.objects.filter(material_purchase_id=purchase.data["id"]).exists()

    response = api_client.delete(reverse("materialpurchase-detail", args=[purchase.data["id"]]))

    assert response.status_code == 204
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("0.00")
    assert material.estimated_unit_cost == Decimal("0.00")
    assert not MaterialPurchase.objects.filter(pk=purchase.data["id"]).exists()


@pytest.mark.django_db
def test_material_consumption_update_and_delete_keep_stock_in_sync(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Shampoo neutro",
        unit="ml",
        stock_quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("2.00"),
    )

    consumption = api_client.post(
        reverse("materialconsumption-list"),
        {
            "work_order": order.id,
            "material": material.id,
            "consumed_at": "2026-04-28",
            "quantity": "20.00",
        },
        format="json",
    )
    assert consumption.status_code == 201

    response = api_client.patch(
        reverse("materialconsumption-detail", args=[consumption.data["id"]]),
        {"quantity": "30.00"},
        format="json",
    )

    assert response.status_code == 200
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("70.00")
    assert Decimal(response.data["estimated_total_cost"]) == Decimal("60.00")

    response = api_client.delete(reverse("materialconsumption-detail", args=[consumption.data["id"]]))

    assert response.status_code == 204
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("100.00")
    assert not MaterialConsumption.objects.filter(pk=consumption.data["id"]).exists()


@pytest.mark.django_db
def test_material_list_exposes_usage_metrics_for_work_orders(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Shampoo neutro",
        unit="ml",
        stock_quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("2.50"),
    )

    consumption = api_client.post(
        reverse("materialconsumption-list"),
        {
            "work_order": order.id,
            "material": material.id,
            "consumed_at": "2026-04-28",
            "quantity": "25.00",
        },
        format="json",
    )
    assert consumption.status_code == 201

    response = api_client.get(reverse("material-list"))

    assert response.status_code == 200
    payload = response.data["results"] if isinstance(response.data, dict) else response.data
    item = next(item for item in payload if item["id"] == material.id)
    assert item["usage_count"] == 1
    assert Decimal(item["total_consumed_quantity"]) == Decimal("25.00")
    assert Decimal(item["total_consumed_estimated_cost"]) == Decimal("62.50")
    assert item["last_consumed_at"] == "2026-04-28"
    assert Decimal(item["stock_value"]) == Decimal("187.50")


@pytest.mark.django_db
def test_material_open_unit_can_be_used_across_jobs_before_stock_is_discounted(api_client, base_data):
    customer, vehicle, service = base_data
    first_order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    second_order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Ceramico",
        unit="botella",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("10000.00"),
    )

    opened = api_client.post(
        reverse("materialopenunit-list"),
        {
            "material": material.id,
            "opened_at": "2026-05-01",
            "opened_by_work_order": first_order.id,
            "observations": "Primera botella abierta",
        },
        format="json",
    )

    assert opened.status_code == 201
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("5.00")
    assert opened.data["status"] == "open"
    assert opened.data["work_orders_count"] == 0
    assert opened.data["duration_days"] is None

    first_use = api_client.post(
        reverse("materialopenunit-consume", args=[opened.data["id"]]),
        {
            "work_order": first_order.id,
            "consumed_at": "2026-05-01",
            "observations": "Apertura y primer uso",
        },
        format="json",
    )
    second_use = api_client.post(
        reverse("materialopenunit-consume", args=[opened.data["id"]]),
        {
            "work_order": second_order.id,
            "consumed_at": "2026-05-03",
            "observations": "Segundo uso parcial",
        },
        format="json",
    )

    assert first_use.status_code == 201
    assert second_use.status_code == 201
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("5.00")
    assert Decimal(first_use.data["quantity"]) == Decimal("0.00")
    assert first_use.data["open_unit"] == opened.data["id"]
    assert first_use.data["consumption_mode"] == "open_unit"
    assert Decimal(first_use.data["estimated_total_cost"]) == Decimal("0.00")

    detail = api_client.get(reverse("materialopenunit-detail", args=[opened.data["id"]]))
    assert detail.status_code == 200
    assert detail.data["work_orders_count"] == 2
    assert detail.data["consumptions_count"] == 2
    assert len(detail.data["consumptions"]) == 2
    assert detail.data["duration_days"] is None

    finished = api_client.post(
        reverse("materialopenunit-finish", args=[opened.data["id"]]),
        {"finished_at": "2026-05-04"},
        format="json",
    )

    assert finished.status_code == 200
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("4.00")
    assert finished.data["status"] == "finished"
    assert finished.data["work_orders_count"] == 2
    assert finished.data["consumptions_count"] == 2
    assert finished.data["duration_days"] == 4

    material_response = api_client.get(reverse("material-detail", args=[material.id]))
    assert material_response.status_code == 200
    assert material_response.data["open_units_active_count"] == 0
    assert material_response.data["open_units_finished_count"] == 1
    assert Decimal(material_response.data["average_jobs_per_finished_unit"]) == Decimal("2.00")
    assert Decimal(material_response.data["average_days_per_finished_unit"]) == Decimal("4.00")


@pytest.mark.django_db
def test_direct_material_consumption_keeps_discounting_stock_with_open_units(api_client, base_data):
    customer, vehicle, service = base_data
    direct_order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    open_unit_order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Ceramico",
        unit="botella",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("10000.00"),
    )
    opened = MaterialOpenUnit.objects.create(
        material=material,
        opened_at="2026-05-01",
        opened_by_work_order=open_unit_order,
        estimated_unit_cost_at_open=Decimal("10000.00"),
    )

    direct = api_client.post(
        reverse("materialconsumption-list"),
        {
            "work_order": direct_order.id,
            "material": material.id,
            "consumed_at": "2026-05-02",
            "quantity": "1.00",
        },
        format="json",
    )
    open_unit_use = api_client.post(
        reverse("materialopenunit-consume", args=[opened.id]),
        {
            "work_order": open_unit_order.id,
            "consumed_at": "2026-05-03",
            "observations": "Uso desde botella abierta",
        },
        format="json",
    )

    assert direct.status_code == 201
    assert open_unit_use.status_code == 201
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("4.00")
    assert direct.data["open_unit"] is None
    assert direct.data["consumption_mode"] == "direct"
    assert Decimal(direct.data["estimated_total_cost"]) == Decimal("10000.00")
    assert open_unit_use.data["open_unit"] == opened.id
    assert open_unit_use.data["consumption_mode"] == "open_unit"


@pytest.mark.django_db
def test_finished_open_unit_cannot_receive_more_consumption(api_client, base_data):
    customer, vehicle, service = base_data
    order = create_work_order(customer=customer, vehicle=vehicle, service=service)
    material = Material.objects.create(
        name="Ceramico",
        unit="botella",
        stock_quantity=Decimal("1.00"),
        estimated_unit_cost=Decimal("10000.00"),
    )
    opened = MaterialOpenUnit.objects.create(
        material=material,
        opened_at="2026-05-01",
        finished_at="2026-05-02",
        status=MaterialOpenUnit.Status.FINISHED,
        estimated_unit_cost_at_open=Decimal("10000.00"),
    )

    response = api_client.post(
        reverse("materialopenunit-consume", args=[opened.id]),
        {"work_order": order.id, "consumed_at": "2026-05-03"},
        format="json",
    )

    assert response.status_code == 400
    assert "status" in response.data


@pytest.mark.django_db
def test_cash_daily_auto_closes_previous_days(api_client):
    previous_day = date(2026, 4, 27)
    current_day = date(2026, 4, 28)
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        amount=Decimal("10000.00"),
        occurred_at=timezone.make_aware(datetime.combine(previous_day, time(10, 0))),
    )
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.EXPENSE,
        category="Materiales",
        amount=Decimal("2500.00"),
        occurred_at=timezone.make_aware(datetime.combine(previous_day, time(18, 0))),
    )

    response = api_client.get(reverse("cash-daily"), {"date": current_day.isoformat()})

    assert response.status_code == 200
    closure = CashClosure.objects.get(day=previous_day)
    assert closure.total_income == Decimal("10000.00")
    assert closure.total_expense == Decimal("2500.00")
    assert closure.balance == Decimal("7500.00")


@pytest.mark.django_db
def test_cash_daily_separates_cashflow_from_economic_totals(api_client, base_data):
    customer, vehicle, service = base_data
    cash_day = date(2026, 5, 9)
    paid_at = timezone.make_aware(datetime.combine(cash_day, time(10, 0)))
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("100000.00"),
    )
    material = Material.objects.create(
        name="Shampoo",
        unit="litro",
        stock_quantity=Decimal("0.00"),
        estimated_unit_cost=Decimal("0.00"),
    )

    payment_response = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "100000.00",
            "payment_type": "payment",
            "method": "transfer",
            "paid_at": paid_at.isoformat(),
        },
        format="json",
    )
    purchase_response = api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": cash_day.isoformat(),
            "quantity": "2.00",
            "total_cost": "10000.00",
            "affects_cash": True,
        },
        format="json",
    )
    debt_response = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Pulidora financiada",
            "creditor": "Proveedor",
            "principal_amount": "30000.00",
            "origin_date": cash_day.isoformat(),
        },
        format="json",
    )
    debt_payment_response = api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": debt_response.data["id"],
            "amount": "7000.00",
            "paid_at": cash_day.isoformat(),
            "method": "cash",
        },
        format="json",
    )

    assert payment_response.status_code == 201, payment_response.data
    assert purchase_response.status_code == 201, purchase_response.data
    assert debt_response.status_code == 201, debt_response.data
    assert debt_payment_response.status_code == 201, debt_payment_response.data

    response = api_client.get(reverse("cash-daily"), {"date": cash_day.isoformat()})

    assert response.status_code == 200
    assert Decimal(response.data["economic_totals"]["income"]) == Decimal("100000.00")
    assert Decimal(response.data["economic_totals"]["expense"]) == Decimal("40000.00")
    assert Decimal(response.data["economic_totals"]["balance"]) == Decimal("60000.00")
    assert Decimal(response.data["cashflow_totals"]["income"]) == Decimal("100000.00")
    assert Decimal(response.data["cashflow_totals"]["expense"]) == Decimal("17000.00")
    assert Decimal(response.data["cashflow_totals"]["balance"]) == Decimal("83000.00")

    entries_by_kind = {item["source_kind"]: item for item in response.data["entries"]}
    assert entries_by_kind["payment"]["cashflow_effect"] is True
    assert entries_by_kind["payment"]["economic_effect"] is True
    assert entries_by_kind["material_purchase"]["cashflow_effect"] is True
    assert entries_by_kind["material_purchase"]["economic_effect"] is True
    assert entries_by_kind["debt_origin"]["cashflow_effect"] is False
    assert entries_by_kind["debt_origin"]["economic_effect"] is True
    assert entries_by_kind["debt_payment"]["cashflow_effect"] is True
    assert entries_by_kind["debt_payment"]["economic_effect"] is False
    assert entries_by_kind["debt_payment"]["signed_amount"] == "-7000.00"

    payment_entry = entries_by_kind["payment"]
    assert payment_entry["counterparty_kind"] == "customer"
    assert payment_entry["counterparty_label"] == customer.name
    assert payment_entry["reference_label"] == f"Orden #{order.id}"
    assert payment_entry["payment_method"]

    purchase_entry = entries_by_kind["material_purchase"]
    assert purchase_entry["counterparty_kind"] == "supplier"
    assert purchase_entry["reference_label"] == material.name

    debt_origin_entry = entries_by_kind["debt_origin"]
    assert debt_origin_entry["counterparty_kind"] == "creditor"
    assert debt_origin_entry["counterparty_label"] == "Proveedor"
    assert debt_origin_entry["reference_label"] == "Pulidora financiada"

    debt_payment_entry_data = entries_by_kind["debt_payment"]
    assert debt_payment_entry_data["counterparty_kind"] == "creditor"
    assert debt_payment_entry_data["counterparty_label"] == "Proveedor"
    assert debt_payment_entry_data["reference_label"] == "Pulidora financiada"
    assert debt_payment_entry_data["payment_method"]


@pytest.mark.django_db
def test_cash_close_creates_snapshot_and_rejects_duplicate(api_client):
    cash_day = date(2026, 5, 9)
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        amount=Decimal("12000.00"),
        occurred_at=timezone.make_aware(datetime.combine(cash_day, time(11, 0))),
    )

    response = api_client.post(reverse("cash-close"), {"date": cash_day.isoformat()}, format="json")
    duplicate = api_client.post(reverse("cash-close"), {"date": cash_day.isoformat()}, format="json")

    assert response.status_code == 201, response.data
    assert Decimal(response.data["total_income"]) == Decimal("12000.00")
    assert Decimal(response.data["cashflow_income"]) == Decimal("12000.00")
    assert duplicate.status_code == 400
    assert "cerrad" in str(duplicate.data).lower()
    closure = CashClosure.objects.get(day=cash_day)
    assert closure.total_income == Decimal("12000.00")
    assert closure.cashflow_income == Decimal("12000.00")


@pytest.mark.django_db
def test_cash_reopen_removes_closure_and_rejects_if_not_closed(api_client):
    cash_day = date(2026, 5, 9)
    CashClosure.objects.create(
        day=cash_day,
        total_income=Decimal("5000.00"),
        total_expense=Decimal("1000.00"),
        balance=Decimal("4000.00"),
        cashflow_income=Decimal("5000.00"),
        cashflow_expense=Decimal("1000.00"),
        cashflow_balance=Decimal("4000.00"),
    )

    reopen = api_client.post(reverse("cash-reopen"), {"date": cash_day.isoformat()}, format="json")
    assert reopen.status_code == 200, reopen.data
    assert reopen.data["date"] == cash_day.isoformat()
    assert not CashClosure.objects.filter(day=cash_day).exists()

    second = api_client.post(reverse("cash-reopen"), {"date": cash_day.isoformat()}, format="json")
    assert second.status_code == 400
    assert "cerrad" in str(second.data).lower()


@pytest.mark.django_db
def test_cash_daily_after_reopen_returns_open_state(api_client):
    cash_day = date(2026, 5, 9)
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        amount=Decimal("1000.00"),
        occurred_at=timezone.make_aware(datetime.combine(cash_day, time(10, 0))),
    )
    CashClosure.objects.create(
        day=cash_day,
        total_income=Decimal("1000.00"),
        total_expense=Decimal("0.00"),
        balance=Decimal("1000.00"),
        cashflow_income=Decimal("1000.00"),
        cashflow_expense=Decimal("0.00"),
        cashflow_balance=Decimal("1000.00"),
    )

    api_client.post(reverse("cash-reopen"), {"date": cash_day.isoformat()}, format="json")

    daily = api_client.get(reverse("cash-daily"), {"date": cash_day.isoformat()})
    assert daily.status_code == 200
    assert daily.data["is_closed"] is False


@pytest.mark.django_db
def test_cash_daily_for_future_day_keeps_today_open(api_client):
    today = date.today()
    tomorrow = today + timedelta(days=1)
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.INCOME,
        category="Pago",
        amount=Decimal("1000.00"),
        occurred_at=timezone.make_aware(datetime.combine(today, time(10, 0))),
    )

    future = api_client.get(reverse("cash-daily"), {"date": tomorrow.isoformat()})
    assert future.status_code == 200
    assert not CashClosure.objects.filter(day=today).exists()

    daily = api_client.get(reverse("cash-daily"), {"date": today.isoformat()})
    assert daily.status_code == 200
    assert daily.data["is_closed"] is False


@pytest.mark.django_db
def test_closed_cash_day_blocks_every_cash_impact_path(api_client, base_data):
    customer, vehicle, service = base_data
    closed_day = date(2026, 5, 8)
    CashClosure.objects.create(
        day=closed_day,
        total_income=Decimal("0.00"),
        total_expense=Decimal("0.00"),
        balance=Decimal("0.00"),
    )
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        total_amount=Decimal("50000.00"),
    )
    material = Material.objects.create(
        name="Cera",
        unit="litro",
        stock_quantity=Decimal("0.00"),
        estimated_unit_cost=Decimal("0.00"),
    )
    open_debt = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Compra abierta",
            "principal_amount": "10000.00",
            "origin_date": "2026-05-09",
        },
        format="json",
    )
    assert open_debt.status_code == 201, open_debt.data

    closed_datetime = timezone.make_aware(datetime.combine(closed_day, time(12, 0))).isoformat()
    payment = api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "1000.00",
            "paid_at": closed_datetime,
        },
        format="json",
    )
    movement = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "expense",
            "category": "Egreso manual",
            "subcategory": "General",
            "amount": "1000.00",
            "occurred_at": closed_datetime,
        },
        format="json",
    )
    debt = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Deuda cerrada",
            "principal_amount": "1000.00",
            "origin_date": closed_day.isoformat(),
        },
        format="json",
    )
    debt_payment = api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": open_debt.data["id"],
            "amount": "1000.00",
            "paid_at": closed_day.isoformat(),
        },
        format="json",
    )
    purchase = api_client.post(
        reverse("materialpurchase-list"),
        {
            "material": material.id,
            "purchased_at": closed_day.isoformat(),
            "quantity": "1.00",
            "total_cost": "1000.00",
            "affects_cash": True,
        },
        format="json",
    )

    for blocked in [payment, movement, debt, debt_payment, purchase]:
        assert blocked.status_code == 400
        assert "cerrad" in str(blocked.data).lower()


@pytest.mark.django_db
def test_cash_adjustment_references_closed_day_without_changing_its_closure(api_client):
    closed_day = date(2026, 5, 8)
    adjustment_day = date(2026, 5, 9)
    CashClosure.objects.create(
        day=closed_day,
        total_income=Decimal("10000.00"),
        total_expense=Decimal("3000.00"),
        balance=Decimal("7000.00"),
    )

    response = api_client.post(
        reverse("cashmovement-list"),
        {
            "movement_type": "expense",
            "category": "Ajuste de cierre",
            "subcategory": "Ajuste de cierre",
            "amount": "500.00",
            "occurred_at": timezone.make_aware(datetime.combine(adjustment_day, time(9, 0))).isoformat(),
            "description": "Diferencia detectada al revisar cierre anterior.",
            "adjusts_closed_day": closed_day.isoformat(),
        },
        format="json",
    )
    closed_response = api_client.get(reverse("cash-daily"), {"date": closed_day.isoformat()})
    current_response = api_client.get(reverse("cash-daily"), {"date": adjustment_day.isoformat()})

    assert response.status_code == 201, response.data
    assert response.data["source_kind"] == "adjustment"
    assert response.data["adjusts_closed_day"] == closed_day.isoformat()
    assert Decimal(closed_response.data["closure"]["balance"]) == Decimal("7000.00")
    assert Decimal(current_response.data["cashflow_totals"]["expense"]) == Decimal("500.00")
    assert current_response.data["entries"][0]["source_kind"] == "adjustment"


@pytest.mark.django_db
def test_customer_accepts_optional_fiscal_data(api_client):
    response = api_client.post(
        reverse("customer-list"),
        {
            "name": "Cliente fiscal",
            "tax_id": "20-44535030-4",
            "billing_address": "Parana 158",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["tax_id"] == "20445350304"
    assert response.data["billing_address"] == "Parana 158"


@pytest.mark.django_db
def test_quote_creation_snapshots_defaults_and_calculates_commercial_totals(api_client):
    profile = BusinessProfile.get_solo()
    profile.name = "THE KING SHINE"
    profile.address = "Parana 158"
    profile.cuit = "20445350304"
    profile.vat_condition = BusinessProfile.VatCondition.RESPONSABLE_INSCRIPTO
    profile.contact_phone = "2345 45-5007"
    profile.contact_email = "ventas@kingshine.test"
    profile.default_quote_validity_days = 7
    profile.default_quote_tax_rate = Decimal("21.00")
    profile.default_quote_discount_rate = Decimal("10.00")
    profile.default_quote_terms = "Precios validos para el estado inspeccionado."
    profile.default_quote_payment_instructions = "Alias: king.shine"
    profile.save()
    customer = Customer.objects.create(
        name="Juan",
        phone="1122334455",
        email="juan@example.com",
        tax_id="20-30405060-7",
        billing_address="Calle 123",
    )
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Fiat",
        model="Cronos",
    )
    service = Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("100.00"),
    )

    response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "quote_date": "2026-05-08",
            "observations": "Habia una abolladura previa.",
            "items": [
                {
                    "service": service.id,
                    "quantity": "2.00",
                    "unit_price": "100.00",
                }
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert re.fullmatch(r"080526-[A-Z0-9]{6}", response.data["public_code"])
    assert response.data["valid_until"] == "2026-05-15"
    assert response.data["business_name"] == "THE KING SHINE"
    assert response.data["business_address"] == "Parana 158"
    assert response.data["business_cuit"] == "20445350304"
    assert response.data["business_vat_condition_label"] == "Responsable inscripto"
    assert response.data["business_contact_phone"] == "2345 45-5007"
    assert response.data["business_contact_email"] == "ventas@kingshine.test"
    assert response.data["customer_snapshot_name"] == "Juan"
    assert response.data["customer_snapshot_tax_id"] == "20304050607"
    assert response.data["customer_snapshot_billing_address"] == "Calle 123"
    assert response.data["vehicle_snapshot_label"] == "AB123CD - Fiat Cronos"
    assert response.data["tax_rate"] == "21.00"
    assert response.data["discount_rate"] == "10.00"
    assert response.data["subtotal"] == "200.00"
    assert response.data["discount_amount"] == "20.00"
    assert response.data["taxable_amount"] == "180.00"
    assert response.data["tax_amount"] == "37.80"
    assert response.data["total"] == "217.80"
    assert response.data["terms"] == "Precios validos para el estado inspeccionado."
    assert response.data["payment_instructions"] == "Alias: king.shine"
    assert response.data["status_label"] == "Sin enviar"
    assert response.data["has_reservation"] is False
    quote = Quote.objects.get(pk=response.data["id"])
    assert quote.customer_snapshot_tax_id == "20304050607"

    profile.name = "OTRO NEGOCIO"
    profile.default_quote_tax_rate = Decimal("0.00")
    profile.save()
    quote.refresh_from_db()

    assert quote.business_name == "THE KING SHINE"
    assert quote.tax_rate == Decimal("21.00")


@pytest.mark.django_db
def test_quote_can_be_marked_sent_and_downloaded_with_sent_status(api_client, base_data):
    customer, vehicle, service = base_data
    quote = Quote.objects.create(customer=customer, vehicle=vehicle)
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description="Lavado premium",
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    sent_response = api_client.post(reverse("quote-mark-sent", args=[quote.id]), format="json")

    assert sent_response.status_code == 200, sent_response.data
    assert sent_response.data["status"] == Quote.Status.SENT
    assert sent_response.data["status_label"] == "Enviado"
    assert sent_response.data["sent_at"] is not None

    quote.status = Quote.Status.DRAFT
    quote.sent_at = None
    quote.save(update_fields=["status", "sent_at", "updated_at"])
    pdf_response = api_client.get(reverse("quote-pdf-mark-sent", args=[quote.id]))

    assert pdf_response.status_code == 200
    assert pdf_response["Content-Type"] == "application/pdf"
    quote.refresh_from_db()
    assert quote.status == Quote.Status.SENT
    assert quote.sent_at is not None


@pytest.mark.django_db
def test_quote_pdf_endpoint_returns_pdf(api_client, base_data):
    customer, vehicle, service = base_data
    service.notes = "Incluye llantas y secado manual."
    service.save(update_fields=["notes", "updated_at"])
    quote = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "observations": "Incluye descontaminado.",
            "items": [
                {
                    "service": service.id,
                    "description": "Lavado premium",
                    "quantity": "1.00",
                    "unit_price": "15000.00",
                }
            ],
        },
        format="json",
    )
    assert quote.status_code == 201

    response = api_client.get(reverse("quote-pdf", args=[quote.data["id"]]))

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    pdf_content = b"".join(response.streaming_content)
    visible_text = pdf_text(pdf_content)
    assert len(pdf_content) > 6000
    assert b"/Subtype /Image" in pdf_content
    assert "ShineApp" in visible_text
    assert "Incluye llantas y secado manual." in visible_text
    assert "LOGO" not in visible_text
    assert "<b>" not in visible_text
    assert "&lt;b&gt;" not in visible_text
    assert "<br/>" not in visible_text
    assert "&lt;br" not in visible_text
    assert "Terminos y condiciones" not in visible_text
    assert "Instrucciones de pago" not in visible_text


@pytest.mark.django_db
def test_quote_pdf_hides_empty_optional_data_and_zero_commercial_rows(api_client, base_data):
    customer, vehicle, service = base_data
    customer.phone = ""
    customer.email = ""
    customer.save(update_fields=["phone", "email", "updated_at"])
    quote = Quote.objects.create(customer=customer, vehicle=vehicle)
    QuoteItem.objects.create(
        quote=quote,
        service=service,
        description="Lavado premium",
        quantity=Decimal("1.00"),
        unit_price=Decimal("15000.00"),
    )
    quote.recalculate()

    response = api_client.get(reverse("quote-pdf", args=[quote.id]))

    assert response.status_code == 200
    pdf_content = b"".join(response.streaming_content)
    visible_text = pdf_text(pdf_content)
    assert "Telefono" not in visible_text
    assert "Email" not in visible_text
    assert "CUIT/DNI" not in visible_text
    assert "Domicilio fiscal" not in visible_text
    assert "Reserva vinculada" not in visible_text
    assert "Observaciones" not in visible_text
    assert "Descuento global" not in visible_text
    assert "Base imponible" not in visible_text
    assert "IVA (" not in visible_text
    assert "Terminos y condiciones" not in visible_text
    assert "Instrucciones de pago" not in visible_text


@pytest.mark.django_db
def test_quote_pdf_embeds_readable_business_logo(api_client, base_data, tmp_path):
    png_logo = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    )
    with override_settings(MEDIA_ROOT=tmp_path):
        profile = BusinessProfile.get_solo()
        profile.logo = SimpleUploadedFile("logo.png", png_logo, content_type="image/png")
        profile.save(update_fields=["logo", "updated_at"])
        customer, vehicle, service = base_data
        quote = Quote.objects.create(customer=customer, vehicle=vehicle)
        QuoteItem.objects.create(
            quote=quote,
            service=service,
            description="Lavado premium",
            quantity=Decimal("1.00"),
            unit_price=Decimal("15000.00"),
        )
        quote.recalculate()

        response = api_client.get(reverse("quote-pdf", args=[quote.id]))

    assert response.status_code == 200
    pdf_content = b"".join(response.streaming_content)
    visible_text = pdf_text(pdf_content)
    assert b"/Subtype /Image" in pdf_content
    assert "LOGO" not in visible_text


@pytest.mark.django_db
def test_quote_pdf_embeds_pdf_business_logo(api_client, base_data, tmp_path):
    from reportlab.pdfgen import canvas

    logo_buffer = BytesIO()
    logo_canvas = canvas.Canvas(logo_buffer, pagesize=(120, 80))
    logo_canvas.setFillColorRGB(0.05, 0.12, 0.42)
    logo_canvas.roundRect(18, 18, 84, 44, 12, stroke=0, fill=1)
    logo_canvas.setFillColorRGB(1, 1, 1)
    logo_canvas.setFont("Helvetica-Bold", 20)
    logo_canvas.drawCentredString(60, 34, "KS")
    logo_canvas.save()
    logo_buffer.seek(0)

    with override_settings(MEDIA_ROOT=tmp_path):
        profile = BusinessProfile.get_solo()
        profile.logo = SimpleUploadedFile("thekingshine.logo.pdf", logo_buffer.getvalue(), content_type="application/pdf")
        profile.save(update_fields=["logo", "updated_at"])
        customer, vehicle, service = base_data
        quote = Quote.objects.create(customer=customer, vehicle=vehicle)
        QuoteItem.objects.create(
            quote=quote,
            service=service,
            description="Lavado premium",
            quantity=Decimal("1.00"),
            unit_price=Decimal("15000.00"),
        )
        quote.recalculate()

        response = api_client.get(reverse("quote-pdf", args=[quote.id]))

    assert response.status_code == 200
    pdf_content = b"".join(response.streaming_content)
    visible_text = pdf_text(pdf_content)
    assert b"/Subtype /Image" in pdf_content
    assert "LOGO" not in visible_text


@pytest.mark.django_db
def test_quote_accepts_multiple_services_with_default_and_edited_prices(api_client, base_data):
    customer, vehicle, service = base_data
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("45000.00"),
        estimated_duration_minutes=180,
    )

    response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "items": [
                {
                    "service": service.id,
                    "description": "Lavado premium promocional",
                    "quantity": "1.00",
                    "unit_price": "12000.00",
                },
                {
                    "service": ceramic.id,
                    "quantity": "1.00",
                },
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    assert len(response.data["items"]) == 2
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("12000.00")
    assert Decimal(response.data["items"][1]["unit_price"]) == ceramic.base_price
    assert Decimal(response.data["total"]) == Decimal("57000.00")


@pytest.mark.django_db
def test_reservation_accepts_multiple_services_and_keeps_primary_service(api_client, base_data):
    customer, vehicle, service = base_data
    service.notes = "Incluye interior y aspirado."
    service.save(update_fields=["notes", "updated_at"])
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("45000.00"),
        estimated_duration_minutes=180,
        notes="Requiere descontaminado previo.",
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "items": [
                {"service": service.id, "quantity": "1.00"},
                {"service": ceramic.id, "quantity": "1.00"},
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["service"] == service.id
    assert response.data["service_name"] == "Lavado premium, Sellado ceramico"
    assert len(response.data["items"]) == 2
    assert Decimal(response.data["items"][0]["unit_price"]) == service.base_price
    assert response.data["items"][0]["service_notes"] == "Incluye interior y aspirado."
    assert response.data["items"][1]["service_notes"] == "Requiere descontaminado previo."
    reservation = Reservation.objects.get(pk=response.data["id"])
    assert reservation.service_id == service.id


@pytest.mark.django_db
def test_reservation_legacy_service_payload_creates_single_item(api_client, base_data):
    customer, vehicle, service = base_data

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["service"] == service.id
    assert len(response.data["items"]) == 1
    assert response.data["items"][0]["service"] == service.id
    assert Decimal(response.data["items"][0]["unit_price"]) == service.base_price


@pytest.mark.django_db
def test_confirmed_multiservice_reservation_creates_work_order_with_combined_total(api_client, base_data):
    customer, vehicle, service = base_data
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("45000.00"),
        estimated_duration_minutes=180,
    )

    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "status": Reservation.Status.CONFIRMED,
            "items": [
                {"service": service.id, "quantity": "1.00"},
                {"service": ceramic.id, "quantity": "1.00"},
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    reservation = Reservation.objects.get(pk=response.data["id"])
    order = WorkOrder.objects.get(reservation=reservation)
    assert order.service_id == service.id
    assert order.total_amount == Decimal("60000.00")
    assert Decimal(response.data["work_order"]["total_amount"]) == Decimal("60000.00")


@pytest.mark.django_db
def test_reservation_quote_action_is_idempotent_and_copies_items(api_client, base_data):
    customer, vehicle, service = base_data
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("45000.00"),
        estimated_duration_minutes=180,
    )
    reservation_response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "notes": "Cliente pide retirar a la tarde.",
            "items": [
                {"service": service.id, "quantity": "1.00"},
                {"service": ceramic.id, "quantity": "1.00"},
            ],
        },
        format="json",
    )
    reservation_id = reservation_response.data["id"]

    first = api_client.post(reverse("reservation-quote", args=[reservation_id]), format="json")
    second = api_client.post(reverse("reservation-quote", args=[reservation_id]), format="json")

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.data["id"] == second.data["id"]
    assert first.data["reservation"] == reservation_id
    assert first.data["reservation_day"] == "2026-04-28"
    assert first.data["reservation_start_time"] == "10:00:00"
    assert len(first.data["items"]) == 2
    assert Decimal(first.data["total"]) == Decimal("60000.00")
    assert Quote.objects.filter(reservation_id=reservation_id).count() == 1


@pytest.mark.django_db
def test_free_quote_without_reservation_date_exposes_service_notes(api_client, base_data):
    customer, vehicle, service = base_data
    service.notes = "Incluye llantas y secado manual."
    service.save(update_fields=["notes", "updated_at"])

    response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "items": [{"service": service.id}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["reservation"] is None
    assert response.data["reservation_day"] is None
    assert response.data["reservation_start_time"] is None
    assert response.data["items"][0]["service_notes"] == "Incluye llantas y secado manual."


@pytest.mark.django_db
def test_quote_to_reservation_requires_day_then_creates_reservation_with_items(api_client, base_data):
    customer, vehicle, service = base_data
    ceramic = Service.objects.create(
        name="Sellado ceramico",
        service_type=Service.ServiceType.DETAILING,
        base_price=Decimal("45000.00"),
        estimated_duration_minutes=180,
    )
    quote_response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "items": [
                {"service": service.id, "quantity": "1.00"},
                {"service": ceramic.id, "quantity": "1.00"},
            ],
        },
        format="json",
    )
    quote_id = quote_response.data["id"]

    missing_day = api_client.post(reverse("quote-reservation", args=[quote_id]), {}, format="json")
    created = api_client.post(
        reverse("quote-reservation", args=[quote_id]),
        {
            "day": "2026-04-29",
            "start_time": "11:30:00",
            "exit_time": "15:45:00",
        },
        format="json",
    )

    assert missing_day.status_code == 400
    assert "day" in missing_day.data
    assert created.status_code == 201
    assert created.data["customer"] == customer.id
    assert created.data["vehicle"] == vehicle.id
    assert created.data["day"] == "2026-04-29"
    assert created.data["start_time"] == "11:30:00"
    assert created.data["exit_time"] == "15:45:00"
    assert len(created.data["items"]) == 2
    quote = Quote.objects.get(pk=quote_id)
    assert quote.reservation_id == created.data["id"]
    assert quote.reservation_day == date(2026, 4, 29)


@pytest.mark.django_db
def test_dashboard_summary_exposes_operational_metrics(api_client, base_data):
    customer, vehicle, service = base_data
    metric_day = date(2026, 4, 10)
    order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("15000.00"),
    )
    WorkOrder.objects.filter(pk=order.pk).update(
        created_at=timezone.make_aware(datetime.combine(metric_day, time(10, 0)))
    )
    api_client.post(
        reverse("payment-list"),
        {
            "work_order": order.id,
            "amount": "15000.00",
            "payment_type": "payment",
            "method": "card",
            "paid_at": timezone.make_aware(datetime.combine(metric_day, time(11, 0))).isoformat(),
        },
        format="json",
    )

    response = api_client.get(reverse("dashboard-summary"), {"from": "2026-04-01", "to": "2026-04-30"})

    assert response.status_code == 200
    assert Decimal(response.data["sales_total"]) == Decimal("15000.00")
    assert response.data["work_orders_count"] == 1
    assert Decimal(response.data["average_ticket"]) == Decimal("15000.00")
    assert response.data["work_orders_by_status"]["delivered"] == 1


@pytest.mark.django_db
def test_dashboard_summary_exposes_economic_direction_metrics(api_client, base_data):
    customer, vehicle, service = base_data
    material = Material.objects.create(
        name="Shampoo",
        unit="ml",
        stock_quantity=Decimal("1000.00"),
        estimated_unit_cost=Decimal("10.00"),
    )
    metric_day = date(2026, 4, 10)
    previous_day = date(2026, 3, 10)
    current_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("20000.00"),
    )
    previous_order = create_work_order(
        customer=customer,
        vehicle=vehicle,
        service=service,
        status=WorkOrder.Status.DELIVERED,
        total_amount=Decimal("10000.00"),
        day=previous_day,
    )
    WorkOrder.objects.filter(pk=current_order.pk).update(
        created_at=timezone.make_aware(datetime.combine(metric_day, time(10, 0)))
    )
    WorkOrder.objects.filter(pk=previous_order.pk).update(
        created_at=timezone.make_aware(datetime.combine(previous_day, time(10, 0)))
    )
    MaterialConsumption.objects.create(
        work_order=current_order,
        material=material,
        consumed_at=date(2026, 4, 12),
        quantity=Decimal("300.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("3000.00"),
    )
    MaterialConsumption.objects.create(
        work_order=previous_order,
        material=material,
        consumed_at=date(2026, 3, 12),
        quantity=Decimal("100.00"),
        estimated_unit_cost=Decimal("10.00"),
        estimated_total_cost=Decimal("1000.00"),
    )
    MaterialPurchase.objects.create(
        material=material,
        purchased_at=date(2026, 4, 16),
        quantity=Decimal("50.00"),
        total_cost=Decimal("2500.00"),
    )
    api_client.post(
        reverse("payment-list"),
        {
            "work_order": current_order.id,
            "amount": "15000.00",
            "payment_type": "payment",
            "method": "card",
            "paid_at": timezone.make_aware(datetime.combine(metric_day, time(11, 0))).isoformat(),
        },
        format="json",
    )
    api_client.post(
        reverse("payment-list"),
        {
            "work_order": previous_order.id,
            "amount": "7000.00",
            "payment_type": "payment",
            "method": "transfer",
            "paid_at": timezone.make_aware(datetime.combine(previous_day, time(11, 0))).isoformat(),
        },
        format="json",
    )
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.EXPENSE,
        category="Servicios",
        subcategory="Otros",
        amount=Decimal("500.00"),
        occurred_at=timezone.make_aware(datetime.combine(date(2026, 4, 13), time(12, 0))),
    )
    CashMovement.objects.create(
        movement_type=CashMovement.MovementType.EXPENSE,
        category="Servicios",
        subcategory="Otros",
        amount=Decimal("300.00"),
        occurred_at=timezone.make_aware(datetime.combine(date(2026, 3, 13), time(12, 0))),
    )
    debt_response = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Alquiler taller",
            "creditor": "Propietario",
            "principal_amount": "4000.00",
            "origin_date": "2026-04-14",
            "due_date": "2026-04-20",
            "expense_category": "Servicios",
            "expense_subcategory": "Alquiler",
        },
        format="json",
    )
    api_client.post(
        reverse("debtpayment-list"),
        {
            "debt": debt_response.data["id"],
            "amount": "1000.00",
            "paid_at": "2026-04-15",
            "method": "cash",
        },
        format="json",
    )
    due_soon = Debt.objects.create(
        concept="Seguro taller",
        creditor="Aseguradora",
        principal_amount=Decimal("2500.00"),
        origin_date=date.today(),
        due_date=date.today() + timedelta(days=3),
    )

    response = api_client.get(reverse("dashboard-summary"), {"from": "2026-04-01", "to": "2026-04-30"})
    expected_receivable_age = (date.today() - metric_day).days

    assert response.status_code == 200
    assert Decimal(response.data["sales_total"]) == Decimal("15000.00")
    assert Decimal(response.data["collected_total"]) == Decimal("15000.00")
    assert Decimal(response.data["billed_total"]) == Decimal("20000.00")
    assert Decimal(response.data["balance_due_total"]) == Decimal("5000.00")
    assert response.data["work_orders_with_balance_due_count"] == 1
    assert Decimal(response.data["material_cost_total"]) == Decimal("3000.00")
    assert Decimal(response.data["estimated_margin_total"]) == Decimal("17000.00")
    assert Decimal(response.data["cashflow_income_total"]) == Decimal("15000.00")
    assert Decimal(response.data["cashflow_expense_total"]) == Decimal("1500.00")
    assert Decimal(response.data["cashflow_balance"]) == Decimal("13500.00")
    assert Decimal(response.data["material_purchases_total"]) == Decimal("2500.00")
    assert Decimal(response.data["overdue_debts_total"]) == Decimal("3000.00")
    assert response.data["overdue_debts_count"] == 1
    assert response.data["has_activity"] is True
    top_receivable = response.data["top_receivables"][0]
    assert top_receivable["customer_id"] == customer.id
    assert top_receivable["customer_name"] == "Juan Perez"
    assert Decimal(top_receivable["balance_due_total"]) == Decimal("5000.00")
    assert top_receivable["work_orders_count"] == 1
    assert top_receivable["oldest_balance_days"] == expected_receivable_age
    assert top_receivable["work_orders"][0]["id"] == current_order.id
    assert top_receivable["work_orders"][0]["created_on"] == "2026-04-10"
    assert top_receivable["work_orders"][0]["customer_name"] == "Juan Perez"
    assert top_receivable["work_orders"][0]["vehicle_label"] == "AB123CD - Ford Focus"
    assert top_receivable["work_orders"][0]["service_name"] == "Lavado premium"
    assert Decimal(top_receivable["work_orders"][0]["total_amount"]) == Decimal("20000.00")
    assert Decimal(top_receivable["work_orders"][0]["paid_amount"]) == Decimal("15000.00")
    assert Decimal(top_receivable["work_orders"][0]["balance_due"]) == Decimal("5000.00")
    assert top_receivable["work_orders"][0]["age_days"] == expected_receivable_age
    receivable_aging = {bucket["id"]: bucket for bucket in response.data["receivables_aging"]}
    assert Decimal(receivable_aging["31_plus"]["amount"]) == Decimal("5000.00")
    assert receivable_aging["31_plus"]["count"] == 1
    assert Decimal(receivable_aging["0_7"]["amount"]) == Decimal("0.00")
    alerts_by_id = {alert["id"]: alert for alert in response.data["economic_alerts"]}
    assert alerts_by_id["receivables"]["severity"] == "warning"
    assert alerts_by_id["receivables"]["action_label"] == "Cobrar trabajos"
    assert Decimal(alerts_by_id["receivables"]["amount"]) == Decimal("5000.00")
    assert alerts_by_id["overdue_debts"]["severity"] == "danger"
    assert alerts_by_id["overdue_debts"]["action_label"] == "Ver deudas"
    assert Decimal(alerts_by_id["overdue_debts"]["amount"]) == Decimal("3000.00")
    assert response.data["debt_timing"]["overdue"]["count"] == 1
    assert Decimal(response.data["debt_timing"]["overdue"]["amount"]) == Decimal("3000.00")
    assert response.data["debt_timing"]["due_soon"]["count"] == 1
    assert Decimal(response.data["debt_timing"]["due_soon"]["amount"]) == Decimal("2500.00")
    assert response.data["debt_timing"]["due_soon"]["debts"][0]["id"] == due_soon.id
    assert response.data["debt_timing"]["due_soon"]["debts"][0]["days_until_due"] == 3
    assert response.data["margin_basis"]["mode"] == "materials_only"
    assert response.data["margin_basis"]["included_costs"] == ["Materiales consumidos imputados a trabajos"]
    assert "Mano de obra" in response.data["margin_basis"]["excluded_costs"]
    assert response.data["data_quality"]["state"] == "ready"
    assert response.data["data_quality"]["has_current_activity"] is True
    assert response.data["data_quality"]["has_previous_activity"] is True
    assert Decimal(response.data["cost_breakdown"]["billed_total"]) == Decimal("20000.00")
    assert Decimal(response.data["cost_breakdown"]["collected_total"]) == Decimal("15000.00")
    assert Decimal(response.data["cost_breakdown"]["cashflow_expense_total"]) == Decimal("1500.00")
    comparison = response.data["comparison"]
    assert Decimal(comparison["billed_total"]["delta"]) == Decimal("10000.00")
    assert Decimal(comparison["billed_total"]["delta_percent"]) == Decimal("100.00")
    assert comparison["billed_total"]["polarity"] == "higher-is-good"
    assert Decimal(comparison["balance_due_total"]["delta"]) == Decimal("2000.00")
    assert comparison["balance_due_total"]["polarity"] == "higher-is-bad"
    rankings = response.data["rankings"]
    assert rankings["top_customers_by_billed"][0]["customer_id"] == customer.id
    assert Decimal(rankings["top_customers_by_billed"][0]["billed_total"]) == Decimal("20000.00")
    assert rankings["top_services_by_billed"][0]["service_name"] == "Lavado premium"
    assert rankings["top_work_orders_by_margin"][0]["id"] == current_order.id
    assert Decimal(rankings["top_work_orders_by_margin"][0]["estimated_margin"]) == Decimal("17000.00")
    assert rankings["top_materials_by_cost"][0]["material_id"] == material.id
    assert rankings["top_materials_by_cost"][0]["material_name"] == "Shampoo"
    assert Decimal(rankings["top_materials_by_cost"][0]["estimated_total_cost"]) == Decimal("3000.00")
    insight_ids = {insight["id"] for insight in response.data["economic_insights"]}
    assert {"collection_gap", "cash_vs_economic", "margin_basis"}.issubset(insight_ids)
    assert response.data["previous_period"]["from"] == "2026-03-02"
    assert response.data["previous_period"]["to"] == "2026-03-31"
    assert response.data["previous_period"]["has_activity"] is True
    assert Decimal(response.data["previous_period"]["billed_total"]) == Decimal("10000.00")
    assert Decimal(response.data["previous_period"]["collected_total"]) == Decimal("7000.00")
    assert Decimal(response.data["previous_period"]["balance_due_total"]) == Decimal("3000.00")
    assert Decimal(response.data["previous_period"]["material_cost_total"]) == Decimal("1000.00")
    assert Decimal(response.data["previous_period"]["estimated_margin_total"]) == Decimal("9000.00")
    assert Decimal(response.data["previous_period"]["cashflow_balance"]) == Decimal("6700.00")


@pytest.mark.django_db
def test_dashboard_summary_marks_empty_economic_period_without_false_zero(api_client):
    response = api_client.get(reverse("dashboard-summary"), {"from": "2026-02-01", "to": "2026-02-28"})

    assert response.status_code == 200
    assert response.data["has_activity"] is False
    assert response.data["data_quality"]["state"] == "empty"
    assert response.data["data_quality"]["message"] == "No hay trabajos, pagos ni movimientos economicos en el periodo."
    assert response.data["economic_alerts"] == []
    assert response.data["top_receivables"] == []
    assert all(Decimal(bucket["amount"]) == Decimal("0.00") for bucket in response.data["receivables_aging"])
