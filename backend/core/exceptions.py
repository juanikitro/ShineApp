"""Exception handler de DRF con request_id y error_code.

Envuelve el handler default de DRF y garantiza que toda respuesta de error
incluya:

- el header `X-Request-ID` (correlacion con logs/Sentry),
- un `error_code` estable legible por el cliente,
- en errores tipo "detail" y en 500, el `request_id` dentro del body.

Para errores de validacion por campo (`{"campo": ["msg"]}`) NO se contamina el
body con claves meta —se romperia el mapeo de errores por campo del frontend—;
ahi el `request_id` viaja solo por header. Las excepciones no manejadas se
loguean (y Sentry las captura si esta activo) y devuelven un mensaje humano sin
filtrar internals.
"""

import logging

from rest_framework import status as drf_status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from core.request_context import get_request_id

logger = logging.getLogger("shineapp.api")

_STATUS_CODE = {
    400: "validation_error",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    406: "not_acceptable",
    409: "conflict",
    415: "unsupported_media_type",
    429: "throttled",
    503: "service_unavailable",
}

UNEXPECTED_MESSAGE = "Ocurrió un error inesperado. Probá de nuevo en unos minutos."


def _error_code_for(exc, status_code) -> str:
    default_code = getattr(exc, "default_code", None)
    if default_code:
        return str(default_code)
    if status_code in _STATUS_CODE:
        return _STATUS_CODE[status_code]
    if status_code and 500 <= status_code < 600:
        return "internal_error"
    return "error"


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    request_id = get_request_id()

    if response is None:
        # No manejada por DRF -> 500 real. Sentry la captura si esta activo.
        request = context.get("request") if context else None
        logger.exception(
            "Unhandled API exception",
            extra={
                "path": getattr(request, "path", ""),
                "method": getattr(request, "method", ""),
            },
        )
        return Response(
            {
                "detail": UNEXPECTED_MESSAGE,
                "error_code": "internal_error",
                "request_id": request_id,
            },
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    error_code = _error_code_for(exc, response.status_code)
    data = response.data
    if isinstance(data, dict) and "detail" in data:
        data.setdefault("error_code", error_code)
        data.setdefault("request_id", request_id)
    elif not isinstance(data, (dict, list)):
        response.data = {
            "detail": data,
            "error_code": error_code,
            "request_id": request_id,
        }
    # Errores por-campo: el body queda intacto; request_id viaja por header.
    if request_id:
        response["X-Request-ID"] = request_id
    return response
