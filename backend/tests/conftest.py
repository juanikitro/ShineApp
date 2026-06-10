import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from catalog.sector_defaults import ensure_default_sectors
from core.models import BusinessAccount, BusinessProfile, UserProfile


@pytest.fixture
def default_business(db):
    business = BusinessAccount.get_default()
    BusinessProfile.get_solo(business=business)
    ensure_default_sectors(business)
    return business


@pytest.fixture
def api_client(db, django_user_model, default_business):
    user = django_user_model.objects.create_user(
        username="admin",
        password="admin123",
    )
    employer_group, _ = Group.objects.get_or_create(name="empleador")
    user.groups.add(employer_group)
    UserProfile.objects.get_or_create(user=user, defaults={"business": default_business})
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client


@pytest.fixture
def employee_client(db, django_user_model, default_business):
    user = django_user_model.objects.create_user(
        username="empleado",
        password="empleado123",
    )
    employee_group, _ = Group.objects.get_or_create(name="empleado")
    user.groups.add(employee_group)
    UserProfile.objects.get_or_create(user=user, defaults={"business": default_business})
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client
