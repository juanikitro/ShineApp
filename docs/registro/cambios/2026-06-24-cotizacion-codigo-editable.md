# Cotizacion: codigo/nombre editable

## Cambio

El `public_code` de la cotizacion (lo que muestra el encabezado tipo "COTIZACION 050626-00000S") pasa de ser solo lectura a editable desde el modal de detalle.

### Backend (`backend/quotes/serializers.py`)

- `public_code` deja de estar en `read_only_fields`; se declara como `CharField(required=False, allow_blank=True, max_length=20)`.
- Nuevo `validate_public_code`: recorta espacios y, si hay valor, valida unicidad contra `Quote.all_objects` (incluye soft-deleted, porque la constraint `unique=True` es global y no condicional). En update excluye la propia instancia.
- `create`: si llega vacio se descarta para que el modelo siga autogenerando el codigo (`save()` solo genera cuando `not public_code`).
- `update`: si llega vacio se descarta para conservar el codigo existente (no se sobrescribe con blanco).

### Frontend (`frontend/app/page.tsx`)

- `public_code` agregado a la lista de campos permitidos del payload de detalle de quote (`cleanDetailPayload`).
- Nuevo input "Nombre de la cotizacion" (`maxLength=20`) en el modal de detalle de cotizacion, enlazado via `updateDetailEdit`.

## Alcance

- Sin cambios de modelo ni migracion: el campo ya existia y `save()` ya respetaba un `public_code` provisto.
- El codigo sigue siendo el identificador usado en titulo/encabezado del PDF, nombre de archivo, mensaje de WhatsApp, buscador y etiqueta de papelera; al renombrar, esos lugares reflejan el nuevo valor.
- No es slug de ninguna URL publica, asi que renombrar no rompe links.
- Limite practico: el campo mantiene `max_length=20` (el del modelo). Es para editar el codigo, no para titulos largos.

## Validacion

- Backend: `pytest tests/test_mvp_flows.py -k quote` (14 passed). Nuevo test `test_quote_public_code_is_editable_and_unique` cubre rename, blanco que conserva el codigo y duplicado rechazado (400).
- Frontend: no se pudo correr typecheck/tests/build en el worktree (sin `node_modules`). El cambio es minimo y type-safe (no agrega modulos nuevos, no afecta el gate de cobertura).
