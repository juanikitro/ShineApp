import os
import re

import dj_database_url
from django.core.exceptions import ImproperlyConfigured


def normalize_database_url(value):
    cleaned = value.strip().strip('"').strip("'")
    cleaned = re.sub(r"//\[([^\]@/?#]+)\]", r"//\1", cleaned)
    cleaned = re.sub(r"@\[([^\]@/?#]+)\]", r"@\1", cleaned)
    cleaned = re.sub(r"postgres\.\[([A-Za-z0-9]+)\]", r"postgres.\1", cleaned)
    cleaned = cleaned.replace("[", "").replace("]", "")
    return cleaned


MIGRATION_DATABASE_URL = os.environ.pop("DATABASE_URL", None)

from .settings import *  # noqa: F401,F403

if MIGRATION_DATABASE_URL:
    os.environ["DATABASE_URL"] = MIGRATION_DATABASE_URL


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise ImproperlyConfigured(f"{name} is required for migration settings.")
    return value


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DEBUG = False
SECRET_KEY = required_env("DJANGO_MIGRATION_SECRET_KEY")

DATABASES = {
    "default": dj_database_url.parse(
        normalize_database_url(required_env("DATABASE_URL")),
        conn_max_age=0,
        ssl_require=env_bool("DATABASE_SSL_REQUIRE", True),
    )
}
