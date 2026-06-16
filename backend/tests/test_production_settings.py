import importlib
import sys
import types


BASE_PRODUCTION_ENV = {
    "DJANGO_SECRET_KEY": "x" * 64,
    "DJANGO_ALLOWED_HOSTS": "api.shineapp.example",
    "CORS_ALLOWED_ORIGINS": "https://app.shineapp.example",
    "CSRF_TRUSTED_ORIGINS": "https://app.shineapp.example",
    "DATABASE_URL": "postgres://user:pass@example.com:5432/shineapp",
    "DATABASE_SSL_REQUIRE": "1",
    "SUPABASE_STORAGE_ENABLED": "1",
    "SUPABASE_STORAGE_BUCKET": "shineapp-media",
    "SUPABASE_S3_ENDPOINT_URL": "https://example.storage.supabase.co/storage/v1/s3",
    "SUPABASE_S3_REGION_NAME": "sa-east-1",
    "SUPABASE_S3_ACCESS_KEY_ID": "placeholder-access-key",
    "SUPABASE_S3_SECRET_ACCESS_KEY": "placeholder-secret-key",
    "SUPABASE_STORAGE_QUERYSTRING_AUTH": "1",
}


class FakeDjangoIntegration:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


def install_fake_sentry(monkeypatch):
    init_calls = []
    sentry_sdk = types.ModuleType("sentry_sdk")
    sentry_sdk.init = lambda **kwargs: init_calls.append(kwargs)
    integrations = types.ModuleType("sentry_sdk.integrations")
    django = types.ModuleType("sentry_sdk.integrations.django")
    django.DjangoIntegration = FakeDjangoIntegration

    monkeypatch.setitem(sys.modules, "sentry_sdk", sentry_sdk)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations", integrations)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.django", django)
    return init_calls


def import_production_settings(monkeypatch, **env_overrides):
    for key, value in BASE_PRODUCTION_ENV.items():
        monkeypatch.setenv(key, value)
    for key, value in env_overrides.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)

    sys.modules.pop("config.settings_production", None)
    return importlib.import_module("config.settings_production")


def test_production_settings_configures_default_throttling(monkeypatch):
    settings_module = import_production_settings(monkeypatch)

    rest_framework = settings_module.REST_FRAMEWORK

    assert rest_framework["DEFAULT_THROTTLE_CLASSES"] == [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "core.throttling.LoginRateThrottle",
        "core.throttling.PasswordResetRateThrottle",
        "core.throttling.SignupRateThrottle",
    ]
    rates = rest_framework["DEFAULT_THROTTLE_RATES"]
    assert rates["anon"] == "60/min"
    assert rates["user"] == "600/min"
    assert rates["login"] == "10/min"
    assert rates["password_reset"] == "5/min"
    assert rates["signup"] == "5/min"


def test_production_settings_allows_throttle_rates_from_env(monkeypatch):
    settings_module = import_production_settings(
        monkeypatch,
        DJANGO_THROTTLE_ANON_RATE="10/min",
        DJANGO_THROTTLE_USER_RATE="100/min",
        DJANGO_THROTTLE_LOGIN_RATE="3/min",
    )

    rates = settings_module.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    assert rates["anon"] == "10/min"
    assert rates["user"] == "100/min"
    assert rates["login"] == "3/min"


def test_production_settings_initializes_sentry_when_dsn_is_configured(monkeypatch):
    init_calls = install_fake_sentry(monkeypatch)

    import_production_settings(
        monkeypatch,
        SENTRY_DSN="https://public@example.ingest.sentry.io/1",
        SENTRY_ENVIRONMENT="production",
        SENTRY_RELEASE="shineapp@abc123",
        SENTRY_TRACES_SAMPLE_RATE="0.25",
        SENTRY_SEND_DEFAULT_PII="0",
    )

    assert len(init_calls) == 1
    init_kwargs = init_calls[0]
    assert init_kwargs["dsn"] == "https://public@example.ingest.sentry.io/1"
    assert init_kwargs["environment"] == "production"
    assert init_kwargs["release"] == "shineapp@abc123"
    assert init_kwargs["traces_sample_rate"] == 0.25
    assert init_kwargs["send_default_pii"] is False
    assert isinstance(init_kwargs["integrations"][0], FakeDjangoIntegration)


def test_production_settings_skips_sentry_without_dsn(monkeypatch):
    init_calls = install_fake_sentry(monkeypatch)

    import_production_settings(monkeypatch, SENTRY_DSN=None)

    assert init_calls == []
