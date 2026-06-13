import os
from pathlib import Path

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-shineapp-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")
APP_ENVIRONMENT = os.getenv("APP_ENVIRONMENT", "local")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "core",
    "customers",
    "catalog",
    "scheduling",
    "workorders",
    "finance",
    "debts",
    "fixed_expenses",
    "inventory",
    "quotes",
    "dashboard",
    "notifications",
    "tasks",
    "search",
]

MIDDLEWARE = [
    "core.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=0)
    }
elif os.getenv("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "shineapp"),
            "USER": os.getenv("POSTGRES_USER", "shineapp"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "shineapp"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "OPTIONS": {
                "connect_timeout": int(os.getenv("DATABASE_CONNECT_TIMEOUT", "10")),
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

STANDARD_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "es-ar"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "America/Argentina/Buenos_Aires")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:9000,http://127.0.0.1:9000"
).split(",")
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:9000,http://127.0.0.1:9000"
).split(",")
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["core.permissions.ActiveBusinessUser"],
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
}

DEFAULT_DAILY_CAPACITY = int(os.getenv("DEFAULT_DAILY_CAPACITY", "8"))
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@shineapp.local")
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1") == "1"

BUSINESS_NAME = os.getenv("BUSINESS_NAME", "ShineApp")

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:no-reply@shineapp.local")

# Base publica del frontend para links en emails/notificaciones (evita hardcode).
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "https://shineapp-web.vercel.app").rstrip("/")

# Timeouts de dependencias externas (segundos). Evitan requests colgados.
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
PUSH_TIMEOUT_SECONDS = int(os.getenv("PUSH_TIMEOUT_SECONDS", "10"))

# Secret compartido para el endpoint interno de mantenimiento (cron de GitHub
# Actions). Vacio = endpoint deshabilitado (responde 503).
CRON_SECRET = os.getenv("CRON_SECRET", "")

# Retencion de papelera (soft-delete) en dias, usada por purge_trash/mantenimiento.
TRASH_RETENTION_DAYS = int(os.getenv("TRASH_RETENTION_DAYS", "90"))
# El mantenimiento solo purga de verdad si esto esta activado; si no, solo reporta.
MAINTENANCE_PURGE_ENABLED = os.getenv("MAINTENANCE_PURGE_ENABLED", "0") == "1"

# Logging estructurado. LOG_FORMAT=json en prod; texto plano legible en local.
LOG_FORMAT = os.getenv("LOG_FORMAT", "plain").strip().lower()
LOG_LEVEL = os.getenv("DJANGO_LOG_LEVEL", "WARNING").strip().upper()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_context": {"()": "core.logging.RequestContextFilter"},
    },
    "formatters": {
        "json": {"()": "core.logging.JsonFormatter"},
        "plain": {"format": "%(levelname)s %(name)s [rid=%(request_id)s]: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "filters": ["request_context"],
            "formatter": "json" if LOG_FORMAT == "json" else "plain",
        },
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "django.security": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}
