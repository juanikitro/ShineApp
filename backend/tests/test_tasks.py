from datetime import date, timedelta

import pytest
from django.contrib.auth.models import Group
from django.core import mail
from rest_framework.test import APIClient

from core.models import BusinessAccount, UserProfile
from customers.models import Customer, Vehicle
from tasks.models import Task, TaskPriority, TaskRecurrence, TaskStatus


def _ensure_groups():
    Group.objects.get_or_create(name="empleador")
    Group.objects.get_or_create(name="empleado")


def _make_user(django_user_model, username, role, business=None):
    _ensure_groups()
    user = django_user_model.objects.create_user(username=username, password=f"{username}-pwd-12345")
    group = Group.objects.get(name=role)
    user.groups.add(group)
    UserProfile.objects.create(user=user, business=business or BusinessAccount.get_default())
    return user


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def employer(db, django_user_model):
    return _make_user(django_user_model, "boss", "empleador")


@pytest.fixture
def employee(db, django_user_model):
    return _make_user(django_user_model, "ana", "empleado")


@pytest.fixture
def other_employee(db, django_user_model):
    return _make_user(django_user_model, "luis", "empleado")


@pytest.fixture
def employer_client(employer):
    return _auth_client(employer)


@pytest.fixture
def employee_client(employee):
    return _auth_client(employee)


@pytest.fixture
def other_employee_client(other_employee):
    return _auth_client(other_employee)


def test_employer_creates_task_without_assignee(employer_client):
    response = employer_client.post(
        "/api/tasks/",
        {"title": "Llamar al contador", "priority": "high"},
        format="json",
    )
    assert response.status_code == 201, response.data
    body = response.json()
    assert body["title"] == "Llamar al contador"
    assert body["status"] == TaskStatus.PENDING
    assert body["assignee"] is None
    assert body["created_by_username"] == "boss"


def test_employer_assigns_task_to_employee(employer_client, employee):
    response = employer_client.post(
        "/api/tasks/",
        {"title": "Limpiar deposito", "assignee": employee.id, "priority": "medium"},
        format="json",
    )
    assert response.status_code == 201, response.data
    body = response.json()
    assert body["assignee"] == employee.id
    assert body["assignee_username"] == employee.username


def test_employee_create_task_force_self_assignee(employee_client, employee, other_employee):
    response = employee_client.post(
        "/api/tasks/",
        {"title": "Reordenar estanteria", "assignee": other_employee.id},
        format="json",
    )
    assert response.status_code == 201, response.data
    body = response.json()
    assert body["assignee"] == employee.id


def test_employee_only_sees_own_tasks(
    employer_client, employee_client, employee, other_employee
):
    employer_client.post(
        "/api/tasks/",
        {"title": "Sin asignar"},
        format="json",
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Para Ana", "assignee": employee.id},
        format="json",
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Para Luis", "assignee": other_employee.id},
        format="json",
    )

    response = employee_client.get("/api/tasks/")
    assert response.status_code == 200
    titles = sorted(item["title"] for item in response.json()["results"])
    assert titles == ["Para Ana"]


def test_employer_sees_all_business_tasks(employer_client, employee, other_employee):
    employer_client.post("/api/tasks/", {"title": "Sin asignar"}, format="json")
    employer_client.post(
        "/api/tasks/", {"title": "Para Ana", "assignee": employee.id}, format="json"
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Para Luis", "assignee": other_employee.id},
        format="json",
    )

    response = employer_client.get("/api/tasks/")
    assert response.status_code == 200
    titles = sorted(item["title"] for item in response.json()["results"])
    assert titles == ["Para Ana", "Para Luis", "Sin asignar"]


def test_filter_status_priority_and_assignee(employer_client, employee):
    employer_client.post(
        "/api/tasks/",
        {"title": "Sin asignar baja", "priority": "low"},
        format="json",
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Para Ana alta", "assignee": employee.id, "priority": "high"},
        format="json",
    )

    response = employer_client.get("/api/tasks/?priority=high")
    assert [item["title"] for item in response.json()["results"]] == ["Para Ana alta"]

    response = employer_client.get("/api/tasks/?assignee=unassigned")
    assert [item["title"] for item in response.json()["results"]] == ["Sin asignar baja"]

    response = employer_client.get(f"/api/tasks/?assignee={employee.id}")
    assert [item["title"] for item in response.json()["results"]] == ["Para Ana alta"]


def test_employee_completes_assigned_task(employer_client, employee_client, employee):
    create = employer_client.post(
        "/api/tasks/",
        {"title": "Cargar combustible", "assignee": employee.id},
        format="json",
    )
    task_id = create.json()["id"]

    response = employee_client.post(f"/api/tasks/{task_id}/complete/")
    assert response.status_code == 200, response.data
    body = response.json()
    assert body["status"] == TaskStatus.DONE
    assert body["completed_at"] is not None
    assert body["completed_by_username"] == employee.username

    reopen = employee_client.post(f"/api/tasks/{task_id}/reopen/")
    assert reopen.status_code == 200
    body = reopen.json()
    assert body["status"] == TaskStatus.PENDING
    assert body["completed_at"] is None


def test_employee_cannot_edit_task_assigned_by_employer(
    employer_client, employee_client, employee
):
    create = employer_client.post(
        "/api/tasks/",
        {"title": "Trapos", "assignee": employee.id},
        format="json",
    )
    task_id = create.json()["id"]

    response = employee_client.patch(
        f"/api/tasks/{task_id}/",
        {"title": "Otro titulo"},
        format="json",
    )
    assert response.status_code == 403, response.data

    delete = employee_client.delete(f"/api/tasks/{task_id}/")
    assert delete.status_code == 403


def test_employee_edits_and_deletes_own_task(employee_client, employee):
    create = employee_client.post(
        "/api/tasks/",
        {"title": "Inventario propio"},
        format="json",
    )
    task_id = create.json()["id"]

    response = employee_client.patch(
        f"/api/tasks/{task_id}/",
        {"title": "Inventario propio editado", "priority": "high"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert response.json()["title"] == "Inventario propio editado"
    assert response.json()["priority"] == "high"

    delete = employee_client.delete(f"/api/tasks/{task_id}/")
    assert delete.status_code == 204
    assert not Task.objects.filter(pk=task_id).exists()
    assert Task.all_objects.filter(pk=task_id, deleted_at__isnull=False).exists()


def test_soft_delete_hides_task_from_list(employer_client):
    create = employer_client.post("/api/tasks/", {"title": "Tarea X"}, format="json")
    task_id = create.json()["id"]

    employer_client.delete(f"/api/tasks/{task_id}/")

    response = employer_client.get("/api/tasks/")
    assert all(item["id"] != task_id for item in response.json()["results"])


def test_cross_business_isolation(db, django_user_model):
    other = BusinessAccount.objects.create(name="Otra Empresa", slug="otra")
    employer_a = _make_user(django_user_model, "boss-a", "empleador")
    employer_b = _make_user(django_user_model, "boss-b", "empleador", business=other)

    client_a = _auth_client(employer_a)
    client_b = _auth_client(employer_b)

    client_a.post("/api/tasks/", {"title": "Solo A"}, format="json")
    client_b.post("/api/tasks/", {"title": "Solo B"}, format="json")

    titles_a = [item["title"] for item in client_a.get("/api/tasks/").json()["results"]]
    titles_b = [item["title"] for item in client_b.get("/api/tasks/").json()["results"]]
    assert titles_a == ["Solo A"]
    assert titles_b == ["Solo B"]


def test_listing_orders_by_priority_then_due_date(employer_client, employee):
    today = date.today()
    employer_client.post(
        "/api/tasks/",
        {"title": "Baja", "priority": "low", "due_date": (today + timedelta(days=1)).isoformat()},
        format="json",
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Alta", "priority": "high", "due_date": (today + timedelta(days=10)).isoformat()},
        format="json",
    )
    employer_client.post(
        "/api/tasks/",
        {"title": "Media", "priority": "medium"},
        format="json",
    )

    response = employer_client.get("/api/tasks/?status=pending")
    order = [item["title"] for item in response.json()["results"]]
    assert order[0] == "Alta"
    assert order[1] == "Media"
    assert order[2] == "Baja"


def test_title_is_required(employer_client):
    response = employer_client.post("/api/tasks/", {"description": "Sin titulo"}, format="json")
    assert response.status_code == 400


@pytest.fixture
def business_customer(db):
    return Customer.objects.create(
        business=BusinessAccount.get_default(),
        name="Juan Cliente",
    )


@pytest.fixture
def business_vehicle(business_customer):
    return Vehicle.objects.create(
        business=business_customer.business,
        customer=business_customer,
        license_plate="ABC123",
        brand="Toyota",
        model="Corolla",
    )


def test_employer_can_link_customer_and_vehicle(
    employer_client, business_customer, business_vehicle
):
    response = employer_client.post(
        "/api/tasks/",
        {
            "title": "Llamar al cliente",
            "priority": "medium",
            "customer": business_customer.id,
            "vehicle": business_vehicle.id,
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    body = response.json()
    assert body["customer"] == business_customer.id
    assert body["customer_label"] == "Juan Cliente"
    assert body["vehicle"] == business_vehicle.id
    assert "ABC123" in body["vehicle_label"]
    assert "Corolla" in body["vehicle_label"]


def test_vehicle_must_belong_to_customer(employer_client, business_customer, business_vehicle):
    other_customer = Customer.objects.create(
        business=business_customer.business, name="Otro"
    )
    response = employer_client.post(
        "/api/tasks/",
        {
            "title": "Mismatch",
            "customer": other_customer.id,
            "vehicle": business_vehicle.id,
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "vehicle" in response.data


def test_cross_business_customer_rejected(db, django_user_model, business_customer):
    other_business = BusinessAccount.objects.create(name="Otra", slug="otra")
    employer_b = _make_user(django_user_model, "boss-b", "empleador", business=other_business)
    client_b = _auth_client(employer_b)
    response = client_b.post(
        "/api/tasks/",
        {"title": "Cross", "customer": business_customer.id},
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "customer" in response.data


def test_recurring_task_spawns_next_occurrence_on_complete(employer_client, employee):
    due = date.today() + timedelta(days=1)
    create = employer_client.post(
        "/api/tasks/",
        {
            "title": "Revisar stock",
            "assignee": employee.id,
            "due_date": due.isoformat(),
            "recurrence": "weekly",
        },
        format="json",
    )
    assert create.status_code == 201, create.data
    task_id = create.json()["id"]

    complete = employer_client.post(f"/api/tasks/{task_id}/complete/")
    assert complete.status_code == 200

    pending = Task.objects.filter(title="Revisar stock", status=TaskStatus.PENDING)
    assert pending.count() == 1
    next_task = pending.first()
    assert next_task.id != task_id
    assert next_task.due_date == due + timedelta(weeks=1)
    assert next_task.recurrence == TaskRecurrence.WEEKLY
    assert next_task.assignee_id == employee.id


def test_recurrence_requires_due_date(employer_client):
    response = employer_client.post(
        "/api/tasks/",
        {"title": "Sin fecha", "recurrence": "daily"},
        format="json",
    )
    assert response.status_code == 400, response.data
    assert "recurrence" in response.data


def test_restore_endpoint_undeletes_task(employer_client):
    create = employer_client.post(
        "/api/tasks/",
        {"title": "Restaurar"},
        format="json",
    )
    task_id = create.json()["id"]
    employer_client.delete(f"/api/tasks/{task_id}/")
    assert not Task.objects.filter(pk=task_id).exists()

    response = employer_client.post(f"/api/tasks/{task_id}/restore/")
    assert response.status_code == 200, response.data
    assert Task.objects.filter(pk=task_id).exists()


def test_assignment_sends_email_to_new_assignee(
    employer_client, employee, django_user_model
):
    employee.email = "ana@test.com"
    employee.save(update_fields=["email"])
    mail.outbox.clear()

    response = employer_client.post(
        "/api/tasks/",
        {"title": "Pulir auto", "assignee": employee.id},
        format="json",
    )
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    sent = mail.outbox[0]
    assert sent.to == ["ana@test.com"]
    assert "Pulir auto" in sent.subject


def test_assignment_skips_email_when_no_email(employer_client, employee):
    employee.email = ""
    employee.save(update_fields=["email"])
    mail.outbox.clear()

    employer_client.post(
        "/api/tasks/",
        {"title": "Sin email", "assignee": employee.id},
        format="json",
    )
    assert mail.outbox == []


def test_assignment_skips_email_when_self_assigned(employer_client, employer):
    employer.email = "boss@test.com"
    employer.save(update_fields=["email"])
    mail.outbox.clear()

    employer_client.post(
        "/api/tasks/",
        {"title": "Para mi", "assignee": employer.id},
        format="json",
    )
    assert mail.outbox == []


def test_reassignment_sends_email(employer_client, employee, other_employee):
    employee.email = "ana@test.com"
    employee.save(update_fields=["email"])
    other_employee.email = "luis@test.com"
    other_employee.save(update_fields=["email"])

    create = employer_client.post(
        "/api/tasks/",
        {"title": "Reasignar", "assignee": employee.id},
        format="json",
    )
    task_id = create.json()["id"]
    mail.outbox.clear()

    employer_client.patch(
        f"/api/tasks/{task_id}/",
        {"assignee": other_employee.id},
        format="json",
    )
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["luis@test.com"]


def test_assignee_label_uses_full_name_or_strips_email(
    employer_client, employee, django_user_model
):
    employee.first_name = "Ana"
    employee.last_name = "Lopez"
    employee.save(update_fields=["first_name", "last_name"])
    response = employer_client.post(
        "/api/tasks/",
        {"title": "Con nombre", "assignee": employee.id},
        format="json",
    )
    assert response.json()["assignee_label"] == "Ana Lopez"

    employee.first_name = ""
    employee.last_name = ""
    employee.username = "ana@empresa.com"
    employee.save(update_fields=["first_name", "last_name", "username"])
    response = employer_client.post(
        "/api/tasks/",
        {"title": "Sin nombre", "assignee": employee.id},
        format="json",
    )
    assert response.json()["assignee_label"] == "ana"
