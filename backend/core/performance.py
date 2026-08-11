"""Telemetria acotada para investigar rutas lentas sin registrar datos de negocio."""

import logging
from time import perf_counter


SLOW_REQUEST_THRESHOLD_MS = 300

logger = logging.getLogger("shineapp.performance")


def elapsed_ms(started_at):
    return round((perf_counter() - started_at) * 1000)


def log_slow_route_profile(*, request_id, route, started_at, stages_ms):
    """Emite un perfil agregado solo para trabajo de ruta que supera el umbral.

    ``route`` y las claves de ``stages_ms`` deben ser etiquetas estaticas. Asi el
    evento se puede correlacionar con ``slow_request`` sin exponer slug, negocio,
    payload ni parametros de la request.
    """
    duration_ms = elapsed_ms(started_at)
    if duration_ms < SLOW_REQUEST_THRESHOLD_MS:
        return
    logger.info(
        "slow_route_profile",
        extra={
            "request_id": request_id,
            "route": route,
            "duration_ms": duration_ms,
            "stages_ms": stages_ms,
        },
    )
