"""Middleware de correlacion de requests.

Asigna (o reutiliza) un `request_id` por request, lo deja disponible en
`core.request_context` para logs y errores, lo devuelve en el header
`X-Request-ID` y lo adjunta al scope de Sentry. Resetea el contexto al inicio de
cada request para que no haya fuga de business/user entre requests servidos por
el mismo worker.
"""

import logging
from time import perf_counter

from core.request_context import new_request_id, set_request_context

REQUEST_ID_META = "HTTP_X_REQUEST_ID"
RESPONSE_HEADER = "X-Request-ID"
MAX_INCOMING_LEN = 64
SLOW_REQUEST_THRESHOLD_MS = 300

logger = logging.getLogger("shineapp.performance")


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
        started_at = perf_counter()
        try:
            response = self.get_response(request)
        except Exception:
            self._log_slow_request(request, request_id, 500, started_at)
            raise
        response[RESPONSE_HEADER] = request_id
        self._log_slow_request(request, request_id, response.status_code, started_at)
        return response

    @staticmethod
    def _log_slow_request(request, request_id, status, started_at):
        elapsed_ms = (perf_counter() - started_at) * 1000
        if elapsed_ms < SLOW_REQUEST_THRESHOLD_MS:
            return
        duration_ms = round(elapsed_ms)
        # No payload, query string, IP ni contexto de actor: solo datos de
        # atribucion operativa. La salida dedicada conserva este contrato.
        logger.info(
            "slow_request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.path,
                "status": status,
                "duration_ms": duration_ms,
            },
        )

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
