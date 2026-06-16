from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from core.models import BusinessAccount, BusinessProfile, UserProfile


def trial_payload(**overrides):
    payload = {
        "business_name": "King Shine",
        "industry": "Detailing",
        "owner_name": "Juan Perez",
        "email": "dueno@kingshine.test",
        "phone": "+54 11 5555-0101",
        "city": "Buenos Aires",
        "country": "Argentina",
        "password": "ClaveSegura123",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_trial_signup_creates_business_profile_employer_userprofile_and_group():
    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(),
        format="json",
    )

    assert response.status_code == 201, response.data
    business = BusinessAccount.objects.get(slug="king-shine")
    profile = BusinessProfile.objects.get(business=business)
    owner = get_user_model().objects.get(email="dueno@kingshine.test")

    assert business.name == "King Shine"
    assert business.is_active is True
    assert profile.name == "King Shine"
    assert profile.industry == "Detailing"
    assert profile.contact_email == "dueno@kingshine.test"
    assert profile.contact_phone == "+54 11 5555-0101"
    assert profile.city == "Buenos Aires"
    assert profile.country == "Argentina"
    assert profile.subscription_type == BusinessProfile.SubscriptionType.TRIAL
    assert profile.trial_started_at is not None
    assert profile.trial_ends_at is not None
    assert timedelta(days=29) < profile.trial_ends_at - profile.trial_started_at <= timedelta(days=30)
    assert owner.username == "dueno@kingshine.test"
    assert owner.first_name == "Juan"
    assert owner.last_name == "Perez"
    assert owner.check_password("ClaveSegura123")
    assert owner.is_staff is False
    assert owner.is_superuser is False
    assert owner.groups.filter(name="empleador").exists()
    assert UserProfile.objects.get(user=owner).business == business


@pytest.mark.django_db
def test_trial_signup_returns_token_and_user_context_with_trial_state():
    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(email="trial-context@shineapp.test"),
        format="json",
    )

    assert response.status_code == 201, response.data
    owner = get_user_model().objects.get(email="trial-context@shineapp.test")
    assert response.data["token"] == Token.objects.get(user=owner).key
    assert response.data["user"]["business"]["slug"] == "king-shine"
    assert response.data["user"]["role"] == "empleador"
    assert response.data["user"]["can_view_economy"] is True
    assert response.data["user"]["subscription_type"] == "trial"
    assert response.data["user"]["trial_ends_at"]
    assert response.data["user"]["trial_expired"] is False
    assert 29 <= response.data["user"]["trial_days_remaining"] <= 30

    me_client = APIClient()
    me_client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
    me_response = me_client.get(reverse("auth-me"))

    assert me_response.status_code == 200
    assert me_response.data["trial_ends_at"] == response.data["user"]["trial_ends_at"]
    assert me_response.data["trial_expired"] is False


@pytest.mark.django_db
def test_trial_signup_rejects_duplicate_email_with_clear_error():
    get_user_model().objects.create_user(
        username="ventas@shineapp.test",
        email="ventas@shineapp.test",
        password="ClaveSegura123",
    )

    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(email="VENTAS@shineapp.test"),
        format="json",
    )

    assert response.status_code == 400
    assert "email" in response.data
    assert not BusinessAccount.objects.filter(name="King Shine").exists()


@pytest.mark.django_db
def test_trial_signup_resolves_username_collision_deterministically():
    get_user_model().objects.create_user(
        username="colision@shineapp.test",
        email="otro@shineapp.test",
        password="ClaveSegura123",
    )

    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(email="colision@shineapp.test"),
        format="json",
    )

    assert response.status_code == 201, response.data
    owner = get_user_model().objects.get(email="colision@shineapp.test")
    assert owner.username == "colision@shineapp.test-2"
    assert response.data["user"]["username"] == "colision@shineapp.test-2"


@pytest.mark.django_db
def test_trial_signup_invalid_password_fails_without_partial_creation():
    before = timezone.now()

    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(password="123"),
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.data
    assert not BusinessAccount.objects.filter(created_at__gte=before).exists()
    assert not get_user_model().objects.filter(email="dueno@kingshine.test").exists()


@pytest.mark.django_db
def test_trial_signup_sends_welcome_email_with_correct_data(mailoutbox):
    """El email de bienvenida se envia con asunto, negocio y URL correctos."""
    response = APIClient().post(
        reverse("auth-trial-signup"),
        trial_payload(email="welcome@kingshine.test"),
        format="json",
    )

    assert response.status_code == 201, response.data
    assert len(mailoutbox) == 1
    sent = mailoutbox[0]
    assert sent.to == ["welcome@kingshine.test"]
    assert "Bienvenido a ShineApp" in sent.subject
    assert "prueba gratuita" in sent.subject
    assert "King Shine" in sent.body
    assert "https://shineapp-web.vercel.app" in sent.body


@pytest.mark.django_db
def test_trial_signup_returns_201_even_if_smtp_fails():
    """Si el envio del email falla, el signup igual retorna 201 con el token."""
    with patch("notifications.outbox.send_mail", side_effect=Exception("SMTP error")):
        response = APIClient().post(
            reverse("auth-trial-signup"),
            trial_payload(email="smtp-fail@kingshine.test"),
            format="json",
        )

    assert response.status_code == 201, response.data
    assert "token" in response.data
    assert get_user_model().objects.filter(email="smtp-fail@kingshine.test").exists()
