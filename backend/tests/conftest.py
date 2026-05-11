import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient


@pytest.fixture
def api_client(db, django_user_model):
    user = django_user_model.objects.create_user(
        username="admin",
        password="admin123",
    )
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def employee_client(db, django_user_model):
    user = django_user_model.objects.create_user(
        username="empleado",
        password="empleado123",
    )
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    user.groups.add(employee_group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client
