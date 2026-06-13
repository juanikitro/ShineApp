import os

from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_asgi_application()

# Falla rapido si produccion arranco con settings de dev (DEBUG + secret placeholder).
from config.runtime_guard import enforce_runtime_safety  # noqa: E402

enforce_runtime_safety()
