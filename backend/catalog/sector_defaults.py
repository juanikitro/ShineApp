"""Sectores por defecto para negocios nuevos y mapeo del enum legacy.

`ensure_default_sectors` es idempotente (analogo a `BusinessProfile.get_solo`)
y se usa en runtime: alta de negocio (trial signup) y seed de demo. La data
migration de la Fase 1 replica esta logica con modelos historicos.

El mapa `SERVICE_TYPE_TO_SECTOR_KEY` traduce el `service_type` legacy
(`wash`/`detailing`/`combo`) al `key` de sector durante el backfill. Los combos
se asignan a Lavadero para preservar el comportamiento de capacidad actual
(antes los combos contaban contra el cupo de lavado).
"""

from .models import Sector

# Sectores que se crean por defecto para cada negocio nuevo.
DEFAULT_SECTORS = [
    {"key": "lavadero", "name": "Lavadero", "order": 0},
    {"key": "detailing", "name": "Detailing", "order": 1},
]

# Traduccion del enum legacy `Service.service_type` -> `Sector.key`.
SERVICE_TYPE_TO_SECTOR_KEY = {
    "wash": "lavadero",
    "combo": "lavadero",
    "detailing": "detailing",
}


def ensure_default_sectors(business):
    """Garantiza que `business` tenga los sectores por defecto.

    Idempotente: no duplica sectores existentes (comparando por `key`).
    Devuelve un dict `key -> Sector` con todos los sectores por defecto.
    """
    existing = {sector.key: sector for sector in Sector.objects.filter(business=business)}
    result = {}
    for spec in DEFAULT_SECTORS:
        sector = existing.get(spec["key"])
        if sector is None:
            sector = Sector.objects.create(business=business, **spec)
        result[spec["key"]] = sector
    return result
