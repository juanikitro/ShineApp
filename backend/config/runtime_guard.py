"""Guard de seguridad en arranque.

Corre una sola vez al inicializar el proceso WSGI/ASGI, cuando los settings ya
estan completamente resueltos. Su objetivo es matar el modo de falla silencioso
en el que produccion arranca con `config.settings` (DEBUG + secret de dev) por
faltar `DJANGO_SETTINGS_MODULE=config.settings_production`: en vez de exponer
tracebacks y firmar sesiones con un secret conocido, falla rapido y ruidoso.

No dispara en local/test, ni cuando `settings_production` ya forzo `DEBUG=False`.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

SAFE_ENVIRONMENTS = {"local", "test", "dev", "development"}
DEV_SECRETS = {"change-me", "dev-only-shineapp-secret", "change-me-local-only"}


def enforce_runtime_safety() -> None:
    environment = str(getattr(settings, "APP_ENVIRONMENT", "local") or "local").lower()
    if environment in SAFE_ENVIRONMENTS:
        return

    problems = []
    if getattr(settings, "DEBUG", False):
        problems.append("DEBUG=True")
    secret = getattr(settings, "SECRET_KEY", "") or ""
    if secret in DEV_SECRETS or len(secret) < 50:
        problems.append("DJANGO_SECRET_KEY es un valor de dev/placeholder")

    if problems:
        raise ImproperlyConfigured(
            f"Configuracion insegura para APP_ENVIRONMENT={environment!r}: "
            + "; ".join(problems)
            + ". ¿Falto setear DJANGO_SETTINGS_MODULE=config.settings_production?"
        )
