import os

from django.core.wsgi import get_wsgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()

# Falla rapido si produccion arranco con settings de dev (DEBUG + secret placeholder).
from config.runtime_guard import enforce_runtime_safety  # noqa: E402

enforce_runtime_safety()

app = application
