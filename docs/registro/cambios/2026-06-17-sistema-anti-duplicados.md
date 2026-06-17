# Sistema de alerta de duplicados

**Fecha:** 2026-06-17

## Qué cambia

Nuevo sistema que detecta registros similares mientras el usuario llena formularios, mostrando un aviso amarillo no-bloqueante antes de guardar.

### Frontend

- **`DuplicateWarning` (nuevo componente):** banner de advertencia con lista de registros similares y botón "Ignorar y continuar". Se renderiza dentro del formulario, sobre el submit.
- **CSS `warn-note`:** nueva clase de alerta en `shell.css` usando tokens `--color-warning-*` existentes.
- **`CustomerForm`:** chequeo debounced (700 ms) contra `/customers/?search=` cuando nombre ≥ 3 chars o teléfono ≥ 8 digits. Se descarta al hacer dismiss; se resetea automáticamente si el usuario cambia los campos.
- **`CashMovementForm`:** chequeo debounced contra `/cash-movements/?date=` cuando amount + category + occurred_at están completos. Filtra client-side por mismo `movement_type` + `category` + `amount`.
- **`ReservationForm`:** usa la lista `reservations` ya cargada (para capacidad) y la filtra por `customer` + `day` en un `useMemo`. Sin llamada extra a la API.

### Backend

- **`CashMovementViewSet`:** agrega `get_queryset` con filtro `?date=YYYY-MM-DD` usando `occurred_at__date`. Sigue el mismo patrón que `ReservationViewSet` con el filtro `?day=`.

## Comportamiento

El aviso es **no-bloqueante**: el usuario puede ignorarlo y guardar igual. Si hace dismiss, el aviso desaparece y no vuelve a aparecer a menos que cambie los campos clave. No requiere migraciones ni cambios de esquema.

## Archivos tocados

- `frontend/app/components/DuplicateWarning.tsx` (nuevo)
- `frontend/app/styles/shell.css` (agrega `.warn-note`)
- `frontend/app/components/forms/CustomerForm.tsx`
- `frontend/app/components/forms/CashMovementForm.tsx`
- `frontend/app/components/forms/ReservationForm.tsx`
- `backend/finance/views.py`
