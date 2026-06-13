"""Throttles por scope para endpoints sensibles (login, reset, signup).

Se agregan a ``DEFAULT_THROTTLE_CLASSES`` solo en produccion. Para las vistas
que no declaran ``throttle_scope == self.scope``, ``get_cache_key`` devuelve
None (no throttlea), por lo que no afectan al resto de la API. La IP del cliente
la resuelve ``get_ident`` usando ``NUM_PROXIES`` (ver core/request_ip.py).
"""

from rest_framework.throttling import SimpleRateThrottle


class _ScopedAnonThrottle(SimpleRateThrottle):
    scope = None

    def get_cache_key(self, request, view):
        if getattr(view, "throttle_scope", None) != self.scope:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginRateThrottle(_ScopedAnonThrottle):
    scope = "login"


class PasswordResetRateThrottle(_ScopedAnonThrottle):
    scope = "password_reset"


class SignupRateThrottle(_ScopedAnonThrottle):
    scope = "signup"
