"""Regresiones de seguridad — Fase 4 (hardening / disclosure).

Cubre el allowlist anti-SSRF de endpoints de Web Push.
"""

from notifications.service import _is_public_https_endpoint, _push_subscription_allowed


def test_push_endpoint_allows_real_https_providers():
    assert _is_public_https_endpoint("https://fcm.googleapis.com/fcm/send/abc") is True
    assert _is_public_https_endpoint("https://updates.push.services.mozilla.com/wpush/v2/xyz") is True
    assert _is_public_https_endpoint("https://web.push.apple.com/abc") is True


def test_push_endpoint_rejects_ssrf_targets():
    # Esquema no-https
    assert _is_public_https_endpoint("http://fcm.googleapis.com/x") is False
    # localhost / metadata / IP privada / loopback
    assert _is_public_https_endpoint("https://localhost/x") is False
    assert _is_public_https_endpoint("https://169.254.169.254/latest/meta-data/") is False
    assert _is_public_https_endpoint("https://10.0.0.5/internal") is False
    assert _is_public_https_endpoint("https://127.0.0.1/x") is False
    # vacios / invalidos
    assert _is_public_https_endpoint("") is False
    assert _is_public_https_endpoint(None) is False


def test_push_subscription_allowed_reads_endpoint():
    assert _push_subscription_allowed({"endpoint": "https://fcm.googleapis.com/fcm/send/abc"}) is True
    assert _push_subscription_allowed({"endpoint": "https://169.254.169.254/"}) is False
    assert _push_subscription_allowed({}) is False
    assert _push_subscription_allowed(None) is False
