import os
from pathlib import Path

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-shineapp-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

# Fail-secure: nunca arrancar en una plataforma gestionada (Vercel) con la
# SECRET_KEY publica de desarrollo. Convierte una mala config (correr los
# settings de dev en produccion) en un fallo ruidoso en vez de un servidor
# inseguro silencioso. No afecta tests ni dev local (sin VERCEL en el entorno).
if os.getenv("VERCEL") and SECRET_KEY == "dev-only-shineapp-secret":
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "Negandose a arrancar en Vercel con la SECRET_KEY publica de desarrollo. "
        "Configura DJANGO_SETTINGS_MODULE=config.settings_production y un "
        "DJANGO_SECRET_KEY real."
    )

# Cantidad de proxies de confianza por delante (Vercel = 1). Lo usa el helper
# core.request_ip.get_client_ip y el throttling de DRF (NUM_PROXIES) para tomar
# la IP real del cliente y no un X-Forwarded-For falsificado.
TRUSTED_PROXY_COUNT = int(os.getenv("DJANGO_NUM_PROXIES", "1"))

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
        "core.authentication.ExpiringTokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["core.permissions.ActiveBusinessUser"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
    # DRF usa NUM_PROXIES para resolver la IP del cliente en el throttling,
    # contando proxies desde la derecha del X-Forwarded-For (Vercel = 1).
    "NUM_PROXIES": TRUSTED_PROXY_COUNT,
}

# Expiracion absoluta del token DRF (mitigacion del token en localStorage).
# 0 = sin expiracion. Default 30 dias, alineado con el TTL del cliente.
AUTH_TOKEN_TTL_SECONDS = int(os.getenv("DJANGO_AUTH_TOKEN_TTL_SECONDS", str(30 * 24 * 60 * 60)))

# Lockout de cuenta por intentos fallidos de login (cache). 0 = desactivado.
LOGIN_LOCKOUT_THRESHOLD = int(os.getenv("DJANGO_LOGIN_LOCKOUT_THRESHOLD", "8"))
LOGIN_LOCKOUT_WINDOW_SECONDS = int(os.getenv("DJANGO_LOGIN_LOCKOUT_WINDOW_SECONDS", "900"))

# Enforcement de suscripcion/trial vencido como gate de acceso a la API.
# Default OFF: se activa cuando billing y los datos de plan esten listos, sin
# riesgo de bloquear clientes reales. Solo bloquea negocios en TRIAL vencido.
ENFORCE_SUBSCRIPTION_ACCESS = os.getenv("DJANGO_ENFORCE_SUBSCRIPTION_ACCESS", "0") == "1"

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
