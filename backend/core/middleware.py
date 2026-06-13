"""Middleware de correlacion de requests.

Asigna (o reutiliza) un `request_id` por request, lo deja disponible en
`core.request_context` para logs y errores, lo devuelve en el header
`X-Request-ID` y lo adjunta al scope de Sentry. Resetea el contexto al inicio de
cada request para que no haya fuga de business/user entre requests servidos por
el mismo worker.
"""

from core.request_context import new_request_id, set_request_context

REQUEST_ID_META = "HTTP_X_REQUEST_ID"
RESPONSE_HEADER = "X-Request-ID"
MAX_INCOMING_LEN = 64


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = (request.META.get(REQUEST_ID_META, "") or "").strip()
        request_id = incoming[:MAX_INCOMING_LEN] or new_request_id()
        # Reset completo: business/user quedan vacios hasta que el request
        # autenticado los resuelva (ver core.permissions.business_for_user).
        set_request_context(request_id=request_id)
        request.request_id = request_id
        self._bind_sentry(request_id)
        response = self.get_response(request)
        response[RESPONSE_HEADER] = request_id
        return response

    @staticmethod
    def _bind_sentry(request_id):
        try:
            import sentry_sdk
        except Exception:  # pragma: no cover - sentry opcional
            return
        try:
            sentry_sdk.set_tag("request_id", request_id)
        except Exception:  # pragma: no cover - defensivo
            pass
