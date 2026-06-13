import os
import sys

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F401,F403


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    value = os.getenv(name)
    if value in {None, ""}:
        return default
    return int(value)


def env_float(name, default):
    value = os.getenv(name)
    if value in {None, ""}:
        return default
    return float(value)


def env_csv(name):
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise ImproperlyConfigured(f"{name} is required for production settings.")
    return value


DEBUG = False
APP_ENVIRONMENT = os.getenv("APP_ENVIRONMENT", "production")
AUTH_PASSWORD_VALIDATORS = STANDARD_PASSWORD_VALIDATORS  # noqa: F405

SECRET_KEY = required_env("DJANGO_SECRET_KEY")
if SECRET_KEY in {"change-me", "dev-only-shineapp-secret"} or len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a real production secret.")

SENTRY_DSN = os.getenv("SENTRY_DSN", "").strip()
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", APP_ENVIRONMENT).strip() or APP_ENVIRONMENT
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", "").strip()
SENTRY_TRACES_SAMPLE_RATE = env_float("SENTRY_TRACES_SAMPLE_RATE", 0.0)
SENTRY_SEND_DEFAULT_PII = env_bool("SENTRY_SEND_DEFAULT_PII", False)

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_options = {
        "dsn": SENTRY_DSN,
        "environment": SENTRY_ENVIRONMENT,
        "integrations": [DjangoIntegration()],
        "send_default_pii": SENTRY_SEND_DEFAULT_PII,
        "traces_sample_rate": SENTRY_TRACES_SAMPLE_RATE,
    }
    if SENTRY_RELEASE:
        sentry_options["release"] = SENTRY_RELEASE
    sentry_sdk.init(**sentry_options)

ALLOWED_HOSTS = env_csv("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must list the API hostnames.")

CORS_ALLOWED_ORIGINS = env_csv("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = env_csv("CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGIN_REGEXES = env_csv("CORS_ALLOWED_ORIGIN_REGEXES")
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must list the web origins.")
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured("CSRF_TRUSTED_ORIGINS must list the web origins.")

DATABASES = {
    "default": dj_database_url.parse(
        required_env("DATABASE_URL"),
        conn_max_age=env_int("DATABASE_CONN_MAX_AGE", 300),
        conn_health_checks=env_bool("DATABASE_CONN_HEALTH_CHECKS", True),
        ssl_require=env_bool("DATABASE_SSL_REQUIRE", True),
    )
}

REST_FRAMEWORK = dict(REST_FRAMEWORK)  # noqa: F405
throttle_classes = list(REST_FRAMEWORK.get("DEFAULT_THROTTLE_CLASSES", []))
for throttle_class in (
    "rest_framework.throttling.AnonRateThrottle",
    "rest_framework.throttling.UserRateThrottle",
    # Throttles estrictos por scope para endpoints sensibles (se autodesactivan
    # en las vistas que no declaran el scope).
    "core.throttling.LoginRateThrottle",
    "core.throttling.PasswordResetRateThrottle",
    "core.throttling.SignupRateThrottle",
):
    if throttle_class not in throttle_classes:
        throttle_classes.append(throttle_class)
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = throttle_classes

throttle_rates = dict(REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
throttle_rates["anon"] = os.getenv("DJANGO_THROTTLE_ANON_RATE", "60/min")
throttle_rates["user"] = os.getenv("DJANGO_THROTTLE_USER_RATE", "600/min")
throttle_rates["login"] = os.getenv("DJANGO_THROTTLE_LOGIN_RATE", "10/min")
throttle_rates["password_reset"] = os.getenv("DJANGO_THROTTLE_PASSWORD_RESET_RATE", "5/min")
throttle_rates["signup"] = os.getenv("DJANGO_THROTTLE_SIGNUP_RATE", "5/min")
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = throttle_rates

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 60)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405

MIDDLEWARE = list(MIDDLEWARE)  # noqa: F405
security_middleware = "django.middleware.security.SecurityMiddleware"
whitenoise_middleware = "whitenoise.middleware.WhiteNoiseMiddleware"
if whitenoise_middleware not in MIDDLEWARE:
    try:
        insert_at = MIDDLEWARE.index(security_middleware) + 1
    except ValueError:
        insert_at = 0
    MIDDLEWARE.insert(insert_at, whitenoise_middleware)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {
            "location": MEDIA_ROOT,  # noqa: F405
            "base_url": MEDIA_URL,  # noqa: F405
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

SUPABASE_STORAGE_ENABLED = env_bool("SUPABASE_STORAGE_ENABLED", True)
SUPABASE_STORAGE_QUERYSTRING_AUTH = env_bool("SUPABASE_STORAGE_QUERYSTRING_AUTH", False)
SUPABASE_STORAGE_PUBLIC_URL = os.getenv("SUPABASE_STORAGE_PUBLIC_URL", "").rstrip("/")

if SUPABASE_STORAGE_ENABLED:
    if not SUPABASE_STORAGE_QUERYSTRING_AUTH and not SUPABASE_STORAGE_PUBLIC_URL:
        raise ImproperlyConfigured(
            "SUPABASE_STORAGE_PUBLIC_URL is required when public media URLs are unsigned."
        )

    STORAGES["default"] = {
        "BACKEND": "core.storage.SupabaseS3Storage",
        "OPTIONS": {
            "bucket_name": required_env("SUPABASE_STORAGE_BUCKET"),
            "access_key": required_env("SUPABASE_S3_ACCESS_KEY_ID"),
            "secret_key": required_env("SUPABASE_S3_SECRET_ACCESS_KEY"),
            "endpoint_url": required_env("SUPABASE_S3_ENDPOINT_URL"),
            "region_name": required_env("SUPABASE_S3_REGION_NAME"),
            "addressing_style": "path",
            "signature_version": "s3v4",
            "file_overwrite": False,
            "querystring_auth": SUPABASE_STORAGE_QUERYSTRING_AUTH,
            "location": os.getenv("SUPABASE_STORAGE_LOCATION", "media").strip("/"),
        },
    }

    MEDIA_URL = f"{SUPABASE_STORAGE_PUBLIC_URL}/" if SUPABASE_STORAGE_PUBLIC_URL else "/media/"

# ---------------------------------------------------------------------------
# Logging — sends Django error tracebacks to stdout (captured by Vercel)
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

# Startup diagnostic — visible on every cold start in Vercel runtime logs.
print(
    "[shineapp:startup]"
    f" SUPABASE_STORAGE_ENABLED={os.getenv('SUPABASE_STORAGE_ENABLED', '(not set)')!r}"
    f" storage_backend={STORAGES['default']['BACKEND']!r}"
    f" SUPABASE_STORAGE_QUERYSTRING_AUTH={os.getenv('SUPABASE_STORAGE_QUERYSTRING_AUTH', '(not set)')!r}",
    file=sys.stderr,
)
