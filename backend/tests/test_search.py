import pytest

from catalog.models import Service
from customers.models import Customer, Vehicle
from finance.models import CashMovement
from scheduling.models import Reservation
from tasks.models import Task, TaskPriority

URL = "/api/search/"


@pytest.fixture
def customer(db, default_business):
    return Customer.objects.create(
        business=default_business,
        name="María García",
        phone="1123456789",
        email="maria@example.com",
    )


@pytest.fixture
def service(db, default_business):
    from catalog.models import Sector
    sector = Sector.objects.filter(business=default_business).first()
    return Service.objects.create(
        business=default_business,
        sector=sector,
        name="Lavado full María especial",
        base_price=5000,
    )


class TestGlobalSearchAuth:
    def test_requires_authentication(self, db, api_client):
        from rest_framework.test import APIClient
        response = APIClient().get(URL, {"q": "test"})
        assert response.status_code == 401

    def test_authenticated_user_can_search(self, api_client):
        response = api_client.get(URL, {"q": "test"})
        assert response.status_code == 200

    def test_short_query_returns_empty(self, api_client):
        response = api_client.get(URL, {"q": "a"})
        data = response.json()
        assert response.status_code == 200
        assert data["groups"] == []

    def test_missing_query_returns_empty(self, api_client):
        response = api_client.get(URL)
        data = response.json()
        assert response.status_code == 200
        assert data["groups"] == []


class TestCustomerSearch:
    def test_finds_customer_by_name(self, api_client, customer):
        response = api_client.get(URL, {"q": "María"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "customer" in types
        items = next(g["items"] for g in data["groups"] if g["type"] == "customer")
        assert any(item["id"] == customer.id for item in items)

    def test_finds_customer_by_email(self, api_client, customer):
        response = api_client.get(URL, {"q": "maria@example"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "customer" in types

    def test_does_not_return_other_business_customer(self, api_client, db):
        from core.models import BusinessAccount, BusinessProfile
        other = BusinessAccount.objects.create(name="Otro negocio", slug="otro-negocio")
        BusinessProfile.get_solo(business=other)
        Customer.objects.create(business=other, name="María Ajena", phone="")
        response = api_client.get(URL, {"q": "María Ajena"})
        data = response.json()
        for group in data["groups"]:
            for item in group["items"]:
                assert "Ajena" not in item["label"]

    def test_result_has_required_fields(self, api_client, customer):
        response = api_client.get(URL, {"q": "María"})
        data = response.json()
        items = next(g["items"] for g in data["groups"] if g["type"] == "customer")
        item = items[0]
        assert "id" in item
        assert "label" in item
        assert "sublabel" in item
        assert "detail_path" in item
        assert item["detail_path"].startswith("/customers/")


class TestVehicleSearch:
    def test_finds_vehicle_by_license_plate(self, api_client, customer, default_business):
        vehicle = Vehicle.objects.create(
            business=default_business,
            customer=customer,
            license_plate="ABC123",
            brand="Toyota",
            model="Corolla",
        )
        response = api_client.get(URL, {"q": "ABC123"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "vehicle" in types
        items = next(g["items"] for g in data["groups"] if g["type"] == "vehicle")
        assert any(item["id"] == vehicle.id for item in items)

    def test_finds_vehicle_by_customer_name(self, api_client, customer, default_business):
        Vehicle.objects.create(
            business=default_business,
            customer=customer,
            license_plate="XYZ999",
            brand="Ford",
            model="Focus",
        )
        response = api_client.get(URL, {"q": "María García"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "vehicle" in types


class TestServiceSearch:
    def test_finds_service_by_name(self, api_client, service):
        response = api_client.get(URL, {"q": "Lavado full"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "service" in types
        items = next(g["items"] for g in data["groups"] if g["type"] == "service")
        assert any(item["id"] == service.id for item in items)


class TestEconomySearchGating:
    def test_employee_cannot_see_economy_groups(self, employee_client, customer, default_business):
        CashMovement.objects.create(
            business=default_business,
            movement_type=CashMovement.MovementType.INCOME,
            category="Servicios",
            amount=1000,
            description="Pago de María García",
        )
        response = employee_client.get(URL, {"q": "María"})
        data = response.json()
        economy_types = {"cash_movement", "material", "supplier", "tool", "quote", "debt", "fixed_expense"}
        returned_types = {g["type"] for g in data["groups"]}
        assert returned_types.isdisjoint(economy_types)

    def test_employer_can_see_economy_groups(self, api_client, customer, default_business):
        CashMovement.objects.create(
            business=default_business,
            movement_type=CashMovement.MovementType.INCOME,
            category="Servicios",
            amount=1000,
            description="Pago de María García",
        )
        response = api_client.get(URL, {"q": "María"})
        data = response.json()
        types = {g["type"] for g in data["groups"]}
        assert "cash_movement" in types


class TestCashMovementIndirectSearch:
    def test_finds_cash_movement_via_customer_name(self, api_client, customer, service, default_business):
        from catalog.models import Sector
        from finance.models import Payment
        sector = Sector.objects.filter(business=default_business).first()
        vehicle = Vehicle.objects.create(
            business=default_business,
            customer=customer,
            license_plate="TST001",
            brand="Honda",
            model="Civic",
        )
        reservation = Reservation.objects.create(
            business=default_business,
            customer=customer,
            vehicle=vehicle,
            service=service,
            sector=sector,
            day="2026-01-10",
        )
        # Reservation auto-creates WorkOrder via ensure_reservation_work_order
        work_order = reservation.work_order
        payment = Payment.objects.create(
            business=default_business,
            work_order=work_order,
            amount=5000,
            payment_type=Payment.PaymentType.PAYMENT,
            method="cash",
        )
        CashMovement.objects.create(
            business=default_business,
            movement_type=CashMovement.MovementType.INCOME,
            category="Servicios",
            amount=5000,
            description="",
            payment=payment,
        )
        response = api_client.get(URL, {"q": "María"})
        data = response.json()
        types = {g["type"] for g in data["groups"]}
        assert "cash_movement" in types


class TestTaskSearch:
    def test_finds_task_by_title(self, api_client, default_business):
        task = Task.objects.create(
            business=default_business,
            title="Llamar al contador Federico",
            priority=TaskPriority.HIGH,
        )
        response = api_client.get(URL, {"q": "contador"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "task" in types
        items = next(g["items"] for g in data["groups"] if g["type"] == "task")
        assert any(item["id"] == task.id for item in items)

    def test_finds_task_by_description(self, api_client, default_business):
        task = Task.objects.create(
            business=default_business,
            title="Pendiente generico",
            description="Revisar el stock del lavadero del oeste",
        )
        response = api_client.get(URL, {"q": "lavadero del oeste"})
        data = response.json()
        types = [g["type"] for g in data["groups"]]
        assert "task" in types
        items = next(g["items"] for g in data["groups"] if g["type"] == "task")
        assert any(item["id"] == task.id for item in items)

    def test_finds_task_by_assignee_username(self, api_client, db, default_business, django_user_model):
        from core.models import UserProfile
        worker = django_user_model.objects.create_user(username="lucia", password="x")
        UserProfile.objects.get_or_create(user=worker, defaults={"business": default_business})
        task = Task.objects.create(
            business=default_business,
            title="Cuadrar caja",
            assignee=worker,
        )
        response = api_client.get(URL, {"q": "lucia"})
        data = response.json()
        items = next((g["items"] for g in data["groups"] if g["type"] == "task"), [])
        assert any(item["id"] == task.id for item in items)

    def test_does_not_return_other_business_task(self, api_client, db):
        from core.models import BusinessAccount, BusinessProfile
        other = BusinessAccount.objects.create(name="Negocio ajeno", slug="ajeno-tasks")
        BusinessProfile.get_solo(business=other)
        Task.objects.create(business=other, title="Tarea ajena unica xyzzy")
        response = api_client.get(URL, {"q": "xyzzy"})
        data = response.json()
        for group in data["groups"]:
            if group["type"] != "task":
                continue
            for item in group["items"]:
                assert "ajena" not in item["label"].lower()

    def test_employee_only_sees_own_tasks(
        self, api_client, employee_client, default_business
    ):
        # api_client.user es empleador (group "empleador")
        owner_task = Task.objects.create(
            business=default_business,
            title="Tarea propia del empleado xyzzy",
            assignee=employee_client.user,
        )
        Task.objects.create(
            business=default_business,
            title="Tarea ajena del jefe xyzzy",
            assignee=api_client.user,
        )
        response = employee_client.get(URL, {"q": "xyzzy"})
        data = response.json()
        items = next((g["items"] for g in data["groups"] if g["type"] == "task"), [])
        ids = {item["id"] for item in items}
        assert owner_task.id in ids
        assert all("ajena" not in item["label"].lower() for item in items)

    def test_employer_sees_all_tasks(self, api_client, default_business):
        Task.objects.create(
            business=default_business,
            title="Pendiente del local norte xyzzy",
        )
        Task.objects.create(
            business=default_business,
            title="Pendiente del local sur xyzzy",
        )
        response = api_client.get(URL, {"q": "xyzzy"})
        data = response.json()
        items = next((g["items"] for g in data["groups"] if g["type"] == "task"), [])
        assert len(items) >= 2

    def test_task_result_has_required_fields(self, api_client, default_business):
        Task.objects.create(
            business=default_business,
            title="Llamada importante xyzzy",
            priority=TaskPriority.HIGH,
        )
        response = api_client.get(URL, {"q": "xyzzy"})
        data = response.json()
        items = next(g["items"] for g in data["groups"] if g["type"] == "task")
        item = items[0]
        assert "id" in item
        assert "label" in item
        assert "sublabel" in item
        assert "detail_path" in item
        assert item["detail_path"].startswith("/tasks/")


class TestSearchResponseShape:
    def test_response_has_query_and_groups(self, api_client, customer):
        response = api_client.get(URL, {"q": "María"})
        data = response.json()
        assert "query" in data
        assert "groups" in data
        assert data["query"] == "María"

    def test_no_results_returns_empty_groups(self, api_client):
        response = api_client.get(URL, {"q": "xyzxyzxyz_no_match_ever"})
        data = response.json()
        assert data["groups"] == []

    def test_limit_param_respected(self, api_client, default_business):
        for i in range(10):
            Customer.objects.create(business=default_business, name=f"Cliente Test {i}", phone="")
        response = api_client.get(URL, {"q": "Cliente Test", "limit": "3"})
        data = response.json()
        customer_group = next((g for g in data["groups"] if g["type"] == "customer"), None)
        assert customer_group is not None
        assert len(customer_group["items"]) <= 3
