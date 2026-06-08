# Caja: categoria Personal con subcategorias de gastos cotidianos

Fecha: 2026-06-08

## Cambio

La configuracion por defecto de egresos de Caja ahora incluye la categoria `Personal` con subcategorias pensadas para que el usuario anote gastos cotidianos del dia a dia sin mezclarlos con la operacion del negocio.

Subcategorias incluidas: `Comida`, `Transporte`, `Salud`, `Entretenimiento`, `Ropa`, `Hogar`, `Educacion`, `Cuidado personal`, `Suscripciones`, `Mascotas`, `Viajes`, `Otros`.

## Impacto

- Negocios nuevos reciben `Personal` como categoria disponible al crear el primer movimiento de Caja.
- El seed demo (`seed_demo`) resetea perfiles a este nuevo arbol por defecto.
- Perfiles existentes mantienen el arbol que ya tenian; pueden agregar `Personal` y sus subcategorias desde la configuracion o creandolas al cargar un movimiento (mismo flujo que cualquier categoria nueva).
- El contrato API no cambia: `category` y `subcategory` siguen siendo texto libre.

## Archivos modificados

- `backend/core/models.py` - `default_expense_category_tree` agrega `Personal` con sus 12 subcategorias.
- `frontend/lib/page-support.tsx` - `DEFAULT_EXPENSE_CATEGORY_TREE` agrega `Personal` en la misma posicion.

## Validacion

- `cd backend` + `.\.venv\Scripts\python.exe -m pytest backend/tests/test_business_profile.py backend/tests/test_finance_categories_payments.py`
- Tests previos siguen verdes porque usan `in` para chequear membresia y no validan la lista completa.
