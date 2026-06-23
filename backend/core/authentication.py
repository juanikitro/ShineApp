"""Autenticacion por token con expiracion absoluta.

El token DRF vive en localStorage del frontend (decision: mitigar en sitio en
vez de migrar a cookie httpOnly). Para acotar el impacto de un robo de token, se
le pone una ventana de validez configurable: un token mas viejo que
``AUTH_TOKEN_TTL_SECONDS`` se rechaza y se borra. El login refresca el reloj.
"""

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


def auth_token_ttl_seconds():
    try:
        return int(getattr(settings, "AUTH_TOKEN_TTL_SECONDS", 0) or 0)
    except (TypeError, ValueError):
        return 0


def auth_token_is_expired(token, *, now=None):
    ttl = auth_token_ttl_seconds()
    if ttl <= 0:
        return False
    created = getattr(token, "created", None)
    if created is None:
        return False
    now = now or timezone.now()
    return (now - created).total_seconds() > ttl


class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if auth_token_is_expired(token):
            token.delete()
            raise AuthenticationFailed("El token expiro. Inicia sesion de nuevo.")
        return user, token
