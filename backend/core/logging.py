"""Formatter JSON y filtro de contexto para logs estructurados.

`RequestContextFilter` inyecta request_id/business_id/user_id (desde
`core.request_context`) en cada `LogRecord`. `JsonFormatter` los emite como JSON
de una linea, apto para los runtime logs de Vercel y para ingestion por un
agregador externo. Se selecciona por entorno via `LOG_FORMAT` (`json` en
produccion, texto plano legible en local).

Este modulo solo depende de la stdlib y de `core.request_context` (sin modelos),
para poder configurarse en `dictConfig` durante la carga de settings, antes de
que el registro de apps este listo.
"""

import datetime as _dt
import json
import logging

from core.request_context import current_context


class RequestContextFilter(logging.Filter):
    """Agrega request_id/business_id/user_id al record para cualquier formatter."""

    def filter(self, record: logging.LogRecord) -> bool:
        ctx = current_context()
        record.request_id = ctx["request_id"]
        record.business_id = ctx["business_id"]
        record.user_id = ctx["user_id"]
        return True


# Atributos estandar de LogRecord: lo que no este aca se considera "extra" y se
# vuelca al JSON (salvo internos con guion bajo).
_RESERVED = set(vars(logging.makeLogRecord({})).keys()) | {
    "message",
    "asctime",
    "request_id",
    "business_id",
    "user_id",
}


class JsonFormatter(logging.Formatter):
    """Serializa cada record como un objeto JSON de una linea."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": _dt.datetime.fromtimestamp(
                record.created, tz=_dt.UTC
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key in ("request_id", "business_id", "user_id"):
            value = getattr(record, key, "")
            if value:
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)
        for key, value in record.__dict__.items():
            if key in _RESERVED or key in payload or key.startswith("_"):
                continue
            try:
                json.dumps(value)
                payload[key] = value
            except (TypeError, ValueError):
                payload[key] = str(value)
        return json.dumps(payload, ensure_ascii=False, default=str)
