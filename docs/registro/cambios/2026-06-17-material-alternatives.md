---
fecha: 2026-06-17
tipo: feature
area: catalog, scheduling, inventory
---

# Alternativas de material por servicio y override por reserva

## Qué se agregó

**`ServiceMaterialAlternative`** (catalog): define qué materiales están autorizados como sustitutos de un slot de receta de servicio (`ServiceMaterial`). Por ejemplo, "Shampoo Premium" puede reemplazar a "Shampoo Original" en la receta del servicio "Lavado Premium".

**`ReservationMaterialOverride`** (scheduling): registra la elección concreta de una alternativa en una reserva específica. La validación garantiza que solo se puedan elegir materiales listados en `ServiceMaterialAlternative` para ese slot.

## Contratos API

| Endpoint | Métodos | Descripción |
|---|---|---|
| `/api/service-material-alternatives/` | GET, POST, PATCH, DELETE | CRUD de alternativas por slot de receta |
| `/api/reservation-material-overrides/` | GET, POST, PATCH, DELETE | CRUD de overrides por reserva |

Parámetros de filtro:
- `?service_material=<id>` en `/api/service-material-alternatives/`
- `?reservation=<id>` en `/api/reservation-material-overrides/`

Los endpoints de `GET /api/services/<id>/` y `GET /api/reservations/<id>/` incluyen las alternativas/overrides embebidos (read-only).

## Modelo de datos

```
ServiceMaterial (receta default)
  └── ServiceMaterialAlternative (lista de sustitutos autorizados)
           ↑
ReservationMaterialOverride  ← Reservation
  chosen_material debe estar en ServiceMaterialAlternative del service_material
```

## Validaciones clave

- El material alternativo no puede ser el mismo que el default del slot.
- El override solo acepta materiales que existan en `ServiceMaterialAlternative` para ese slot.
- Unique constraint: un slot solo puede tener un override por reserva.

## Archivos tocados

- `backend/catalog/models.py` — `ServiceMaterialAlternative`
- `backend/scheduling/models.py` — `ReservationMaterialOverride`
- `backend/catalog/migrations/0013_servicematerialalternative.py`
- `backend/scheduling/migrations/0015_reservationmaterialoverride.py`
- `backend/catalog/serializers.py` — `ServiceMaterialAlternativeSerializer`, `alternatives` en `ServiceMaterialSerializer`
- `backend/scheduling/serializers.py` — `ReservationMaterialOverrideSerializer`, `material_overrides` en `ReservationSerializer`
- `backend/catalog/views.py` — `ServiceMaterialAlternativeViewSet`
- `backend/scheduling/views.py` — `ReservationMaterialOverrideViewSet`, prefetch en `ReservationViewSet`
- `backend/config/urls.py` — registro de nuevos ViewSets
- `backend/tests/test_material_alternatives.py` — 10 nuevos tests
