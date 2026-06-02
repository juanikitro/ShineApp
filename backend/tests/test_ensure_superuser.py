from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError


def run_ensure_superuser(**options):
    call_command("ensure_superuser", stdout=StringIO(), stderr=StringIO(), **options)


@pytest.mark.django_db
def test_creates_superuser_from_environment(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_USERNAME", "ops")
    monkeypatch.setenv("DJANGO_SUPERUSER_EMAIL", "ops@shineapp.local")
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "ClaveSegura123")

    run_ensure_superuser()

    user = get_user_model().objects.get(username="ops")
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.email == "ops@shineapp.local"
    assert user.check_password("ClaveSegura123")


@pytest.mark.django_db
def test_is_idempotent_and_does_not_reset_existing_superuser():
    get_user_model().objects.create_superuser(
        username="ops",
        email="ops@shineapp.local",
        password="OriginalClave1",
    )

    run_ensure_superuser(username="ops", email="cambiado@shineapp.local", password="OtraClave456")

    users = get_user_model().objects.filter(username__iexact="ops")
    assert users.count() == 1
    user = users.get()
    assert user.check_password("OriginalClave1")
    assert user.email == "ops@shineapp.local"


@pytest.mark.django_db
def test_does_not_modify_existing_non_superuser():
    get_user_model().objects.create_user(username="ops", password="OriginalClave1")

    run_ensure_superuser(username="ops", password="OtraClave456")

    user = get_user_model().objects.get(username="ops")
    assert user.is_superuser is False
    assert user.is_staff is False
    assert user.check_password("OriginalClave1")


@pytest.mark.django_db
def test_requires_username_and_password():
    with pytest.raises(CommandError):
        run_ensure_superuser(username="", password="")

    assert not get_user_model().objects.filter(is_superuser=True).exists()
