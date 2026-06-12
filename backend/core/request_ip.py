"""Resolución de la IP real del cliente resistente a spoofing de cabeceras.

Detrás de un proxy reverso de confianza (Vercel), la IP genuina del cliente es
el valor que el *propio proxy* agrega a ``X-Forwarded-For``. Cualquier valor que
mande el cliente queda empujado a la IZQUIERDA, así que se cuenta
``TRUSTED_PROXY_COUNT`` saltos desde la derecha (1 == la IP que agregó el proxy).

Tomar ``xff.split(",")[0]`` (el patrón anterior) confía en el primer valor, que
es justamente el que el atacante controla: por eso permitía evadir cualquier
rate-limit por IP y falsificar el ``ip_address`` de auditoría.
"""

from django.conf import settings


def get_client_ip(request):
    """Devuelve la mejor estimación de la IP real del cliente.

    Orden de preferencia:
    1. ``X-Forwarded-For`` contando ``TRUSTED_PROXY_COUNT`` saltos desde la derecha.
    2. ``X-Real-IP`` (lo fija Vercel con la IP del cliente).
    3. ``REMOTE_ADDR``.
    """
    meta = getattr(request, "META", {}) or {}
    trusted = getattr(settings, "TRUSTED_PROXY_COUNT", 1)
    try:
        trusted = int(trusted)
    except (TypeError, ValueError):
        trusted = 1
    if trusted < 1:
        trusted = 1

    forwarded_for = meta.get("HTTP_X_FORWARDED_FOR", "") or ""
    parts = [item.strip() for item in forwarded_for.split(",") if item.strip()]
    if parts:
        index = max(len(parts) - trusted, 0)
        candidate = parts[index]
        if candidate:
            return candidate

    real_ip = (meta.get("HTTP_X_REAL_IP", "") or "").strip()
    if real_ip:
        return real_ip

    return meta.get("REMOTE_ADDR", "") or ""
