# Logica de dominio en modulos de app; serializers solo orquestan

## Contexto

El backend esta razonablemente sano, pero la **ubicacion de la logica de
negocio es inconsistente**:

- Side-effects en metodos de modelo (envueltos en `transaction.atomic`) en
  `debts`, `finance`, `scheduling`, `quotes`, `workorders`, `fixed_expenses`.
- Side-effects en `serializers.create/update` en `inventory` y `notifications`.
- El **motor de mutacion de stock** vive como funciones modulo dentro de
  `inventory/serializers.py` (`apply_stock_movement_lines`,
  `reverse_stock_movement_effects`), y `StockMovementSerializer.validate`
  carga reglas de negocio por `movement_type`.
- `config/views.py` define 9 serializers (auth, signup, perfil, empleados)
  **dentro del archivo de views**; la app `config` no tiene `serializers.py`,
  rompiendo la convencion que siguen las otras 13 apps.

Para tocar un side-effect hay que adivinar la capa, y la logica critica de
stock esta donde nadie la busca.

## Decision

- **La logica de dominio vive en `models.py` o en un modulo `*.py` por app.**
  Hay precedente claro y consistente: `finance/cash.py`,
  `fixed_expenses/materialization.py`, `workorders/metrics.py`,
  `customers/birthdays.py`, `dashboard/views.py` (funciones puras).
- **Los serializers validan y orquestan**, no implementan el dominio.
- **Cada app tiene su `serializers.py`.**
- Acciones concretas del refactor (behavior-preserving):
  - Mover el motor de stock a `inventory/stock.py`; el serializer queda fino.
  - Crear `config/serializers.py` y dividir `config/views.py` por
    responsabilidad (`auth_views.py`, `account_views.py`).
- **No se introduce una capa `services/` obligatoria.** `AGENTS.md` lo prohibe
  explicitamente; los modulos `*.py` por app ya cubren la necesidad sin imponer
  una estructura nueva.

## Alternativas consideradas

- **Capa `services/` global**: contradice `AGENTS.md` y agrega ceremonia.
- **Dejarlo como esta**: mantiene la inconsistencia y la baja descubribilidad
  de la logica de stock.

## Consecuencias

- Mejor descubribilidad y un solo lugar donde buscar cada side-effect.
- Cambios **behavior-preserving**: no cambia la API publica ni el OpenAPI schema.
- Los tests existentes deben pasar sin modificacion.

## Validacion esperada

- `pytest` de `inventory` y de auth/`config` verdes sin cambios de assert.
- El OpenAPI schema generado es identico antes y despues de mover el codigo.
- `manage.py makemigrations --check --dry-run` no genera migraciones nuevas.
