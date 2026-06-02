from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APIClient

from catalog.models import Service
from core.models import VehicleType
from customers.models import Customer, Vehicle
from scheduling.models import Reservation
from workorders.models import WorkOrder


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
def customer(db):
    return Customer.objects.create(name="Juan Perez", phone="1122334455")


@pytest.fixture
def priced_service(db):
    return Service.objects.create(
        name="Lavado premium",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("15000.00"),
        price_moto=Decimal("8000.00"),
        price_auto=Decimal("15000.00"),
        price_camioneta=Decimal("20000.00"),
        price_combi=Decimal("25000.00"),
        price_camion=Decimal("30000.00"),
        estimated_duration_minutes=90,
    )


def make_vehicle(customer, vehicle_type, plate):
    return Vehicle.objects.create(customer=customer, license_plate=plate, vehicle_type=vehicle_type)


def payload_list(response):
    data = response.data
    return data["results"] if isinstance(data, dict) and "results" in data else data


# --- price_for() resolution -------------------------------------------------


@pytest.mark.django_db
def test_price_for_resolves_each_vehicle_type(priced_service):
    assert priced_service.price_for(VehicleType.MOTO) == Decimal("8000.00")
    assert priced_service.price_for(VehicleType.AUTO) == Decimal("15000.00")
    assert priced_service.price_for(VehicleType.CAMIONETA) == Decimal("20000.00")
    assert priced_service.price_for(VehicleType.COMBI) == Decimal("25000.00")
    assert priced_service.price_for(VehicleType.CAMION) == Decimal("30000.00")


@pytest.mark.django_db
def test_price_for_falls_back_to_base_when_type_missing_or_unset(db):
    service = Service.objects.create(
        name="Solo base",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("12000.00"),
        price_moto=Decimal("5000.00"),
    )
    assert service.price_for(VehicleType.CAMIONETA) == Decimal("12000.00")  # tipo sin precio -> base
    assert service.price_for("") == Decimal("12000.00")  # sin tipo -> base
    assert service.price_for(None) == Decimal("12000.00")
    assert service.price_for("tractor") == Decimal("12000.00")  # tipo desconocido -> base
    assert service.price_for(VehicleType.MOTO) == Decimal("5000.00")  # tipo con precio -> ese precio


@pytest.mark.django_db
def test_price_for_respects_zero_typed_price(db):
    service = Service.objects.create(
        name="Promo moto",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("10000.00"),
        price_moto=Decimal("0.00"),
    )
    assert service.price_for(VehicleType.MOTO) == Decimal("0.00")


# --- reservas / ordenes -----------------------------------------------------


@pytest.mark.django_db
def test_reservation_uses_vehicle_type_price_for_work_order_total(api_client, customer, priced_service):
    vehicle = make_vehicle(customer, VehicleType.MOTO, "moto001")
    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": priced_service.id,
            "day": "2026-04-28",
            "start_time": "10:00:00",
            "status": Reservation.Status.CONFIRMED,
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("8000.00")
    order = WorkOrder.objects.get(reservation_id=response.data["id"])
    assert order.total_amount == Decimal("8000.00")


@pytest.mark.django_db
def test_reservation_items_priced_by_vehicle_type(api_client, customer, priced_service):
    vehicle = make_vehicle(customer, VehicleType.CAMIONETA, "cam001")
    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "11:00:00",
            "items": [{"service": priced_service.id, "quantity": "1.00"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("20000.00")


@pytest.mark.django_db
def test_reservation_without_type_price_falls_back_to_base(api_client, customer):
    service = Service.objects.create(
        name="Solo base",
        service_type=Service.ServiceType.WASH,
        base_price=Decimal("13000.00"),
        estimated_duration_minutes=60,
    )
    vehicle = make_vehicle(customer, VehicleType.COMBI, "combi001")
    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "12:00:00",
            "items": [{"service": service.id, "quantity": "1.00"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("13000.00")


@pytest.mark.django_db
def test_reservation_explicit_unit_price_overrides_type_price(api_client, customer, priced_service):
    vehicle = make_vehicle(customer, VehicleType.MOTO, "moto002")
    response = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "day": "2026-04-28",
            "start_time": "13:00:00",
            "items": [{"service": priced_service.id, "quantity": "1.00", "unit_price": "3000.00"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("3000.00")


@pytest.mark.django_db
def test_reservation_reprices_items_when_vehicle_changes(api_client, customer, priced_service):
    moto = make_vehicle(customer, VehicleType.MOTO, "moto003")
    combi = make_vehicle(customer, VehicleType.COMBI, "combi003")
    create = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": moto.id,
            "day": "2026-04-28",
            "start_time": "14:00:00",
            "items": [{"service": priced_service.id, "quantity": "1.00"}],
        },
        format="json",
    )
    assert create.status_code == 201
    assert Decimal(create.data["items"][0]["unit_price"]) == Decimal("8000.00")

    update = api_client.patch(
        reverse("reservation-detail", args=[create.data["id"]]),
        {
            "vehicle": combi.id,
            "items": [{"service": priced_service.id, "quantity": "1.00"}],
        },
        format="json",
    )

    assert update.status_code == 200
    assert Decimal(update.data["items"][0]["unit_price"]) == Decimal("25000.00")
    order = WorkOrder.objects.get(reservation_id=create.data["id"])
    assert order.total_amount == Decimal("25000.00")


# --- cotizaciones -----------------------------------------------------------


@pytest.mark.django_db
def test_quote_items_priced_by_vehicle_type(api_client, customer, priced_service):
    vehicle = make_vehicle(customer, VehicleType.COMBI, "combi010")
    response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "items": [{"service": priced_service.id, "quantity": "1.00"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("25000.00")


@pytest.mark.django_db
def test_quote_without_vehicle_falls_back_to_base_price(api_client, customer, priced_service):
    response = api_client.post(
        reverse("quote-list"),
        {
            "customer": customer.id,
            "items": [{"service": priced_service.id, "quantity": "1.00"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["unit_price"]) == Decimal("15000.00")


# --- serializer de servicios: gating y validacion ---------------------------


@pytest.mark.django_db
def test_employee_cannot_see_vehicle_type_prices(employee_client, priced_service):
    response = employee_client.get(reverse("service-list"))

    assert response.status_code == 200
    service_payload = payload_list(response)[0]
    for field in [
        "base_price",
        "price_moto",
        "price_auto",
        "price_camioneta",
        "price_combi",
        "price_camion",
    ]:
        assert field not in service_payload


@pytest.mark.django_db
def test_employer_sees_vehicle_type_prices(api_client, priced_service):
    response = api_client.get(reverse("service-list"))

    assert response.status_code == 200
    service_payload = payload_list(response)[0]
    assert Decimal(service_payload["price_moto"]) == Decimal("8000.00")
    assert Decimal(service_payload["price_combi"]) == Decimal("25000.00")
    assert Decimal(service_payload["price_camion"]) == Decimal("30000.00")


@pytest.mark.django_db
def test_service_create_persists_vehicle_type_prices(api_client):
    response = api_client.post(
        reverse("service-list"),
        {
            "name": "Lavado full",
            "service_type": Service.ServiceType.WASH,
            "base_price": "10000.00",
            "price_moto": "6000.00",
            "price_auto": "10000.00",
            "price_camioneta": "14000.00",
            "price_combi": "18000.00",
            "price_camion": "22000.00",
            "estimated_duration_minutes": 60,
        },
        format="json",
    )

    assert response.status_code == 201
    service = Service.objects.get(pk=response.data["id"])
    assert service.price_moto == Decimal("6000.00")
    assert service.price_combi == Decimal("18000.00")
    assert service.price_camion == Decimal("22000.00")


@pytest.mark.django_db
def test_service_create_without_vehicle_type_prices_keeps_null_and_falls_back(api_client):
    response = api_client.post(
        reverse("service-list"),
        {
            "name": "Solo base",
            "service_type": Service.ServiceType.WASH,
            "base_price": "10000.00",
            "estimated_duration_minutes": 60,
        },
        format="json",
    )

    assert response.status_code == 201
    service = Service.objects.get(pk=response.data["id"])
    assert service.price_moto is None
    assert service.price_for(VehicleType.MOTO) == Decimal("10000.00")


@pytest.mark.django_db
def test_service_rejects_negative_vehicle_type_price(api_client):
    response = api_client.post(
        reverse("service-list"),
        {
            "name": "Negativo",
            "service_type": Service.ServiceType.WASH,
            "base_price": "10000.00",
            "price_moto": "-5000.00",
            "estimated_duration_minutes": 60,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "price_moto" in response.data


# --- serializer de vehiculos ------------------------------------------------


@pytest.mark.django_db
def test_vehicle_serializer_exposes_vehicle_type_and_label(api_client, customer):
    vehicle = make_vehicle(customer, VehicleType.CAMIONETA, "cam999")
    response = api_client.get(reverse("vehicle-detail", args=[vehicle.id]))

    assert response.status_code == 200
    assert response.data["vehicle_type"] == "camioneta"
    assert response.data["vehicle_type_label"] == "Camioneta"


@pytest.mark.django_db
def test_vehicle_defaults_to_auto_type(api_client, customer):
    response = api_client.post(
        reverse("vehicle-list"),
        {"customer": customer.id, "license_plate": "new001"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["vehicle_type"] == "auto"
