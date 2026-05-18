import os
import re

import dj_database_url
from django.core.exceptions import ImproperlyConfigured


def normalize_database_url(value):
    return re.sub(r"@\[([A-Za-z0-9.-]+)\](:|/|$)", r"@\1\2", value)


if os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = normalize_database_url(os.environ["DATABASE_URL"])

from .settings import *  # noqa: F401,F403


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
        required_env("DATABASE_URL"),
        conn_max_age=0,
        ssl_require=env_bool("DATABASE_SSL_REQUIRE", True),
    )
}
