import os

from django.core.wsgi import get_wsgi_application

# Entrypoint de produccion (Vercel/gunicorn): por defecto usa los settings de
# produccion. Si DJANGO_SETTINGS_MODULE ya esta seteado, ese valor gana
# (setdefault). Asi se evita arrancar el servidor productivo con los settings de
# desarrollo (DEBUG + SECRET_KEY publica). El dev local arranca via manage.py,
# que sigue defaulteando a config.settings.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_production")
application = get_wsgi_application()

# Falla rapido si produccion arranco con settings de dev (DEBUG + secret placeholder).
from config.runtime_guard import enforce_runtime_safety  # noqa: E402

enforce_runtime_safety()

app = application
