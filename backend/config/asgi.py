import os

from django.core.asgi import get_asgi_application


# Entrypoint de produccion: por defecto usa los settings de produccion (ver
# nota en config/wsgi.py). El dev local arranca via manage.py (config.settings).
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_production")
application = get_asgi_application()
