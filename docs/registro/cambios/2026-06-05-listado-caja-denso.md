# Caja: listado denso con contraparte, orden y filtros rapidos

## Contexto

El listado de movimientos de caja usaba `FinanceRecordCard` (cards altas ~150-180px) por entrada. Solo entraban 3-4 movimientos en pantalla, no se veia de donde venia o a donde iba el dinero (cliente, proveedor, acreedor) sin abrir el detalle, no habia atajos rapidos para filtrar ingresos/egresos/efecto y no habia forma de cambiar el orden. Informacion repetida (fecha y categoria aparecian dos veces por card).

## Cambio

Listado rediseñado como filas compactas centradas en utilidad operativa.

- **Nueva fila compacta `CashEntryRow`** (~52px de alto) por movimiento, con borde lateral coloreado segun direccion:
  - Icono direccion (↑ verde para ingresos, ↓ rojo para egresos)
  - Hora HH:MM
  - Chip de origen con color por tipo (Cobro, Compra, Venta stock, Deuda, Ajuste, Manual)
  - Contraparte con icono: `Cliente: Juan Perez`, `Proveedor: ACME`, `Acreedor: ...`
  - Chip `Solo resultado` cuando no impacta caja
  - Metalinea con clasificacion (categoria / subcategoria), referencia (`Orden #42`, concepto de deuda, material, numero de comprobante), metodo de pago y, si difiere de la referencia, la descripcion libre
  - Monto firmado en color (verde ingreso, rojo egreso)
  - Hover/focus accesible, click abre el detalle y context menu mantiene las acciones rapidas
- **Quick chips encima del listado**: `Todos · Ingresos · Egresos · Solo caja · Solo resultado`. El chip activo se ve en negativo.
- **Selector de orden**: `Mas reciente · Mas antiguo · Mayor monto · Menor monto · Categoria A-Z`.
- **Buscador principal** ampliado: incluye contraparte, referencia y metodo de pago en el match. El placeholder ahora ejemplifica los campos.
- **Filtros avanzados colapsables** detras de un boton `Mas filtros` (tipo, origen, categoria/subcategoria, efecto, rango de monto). El `Limpiar` ahora resetea tambien el chip rapido.
- **Backend enriquece cada entrada** con `counterparty_kind` (customer/supplier/creditor/internal/none), `counterparty_label`, `reference_label` y `payment_method`. `cash_entries_for_day` agrega `select_related` para el cliente del payment, el supplier/customer del stock_movement, el material de la compra y el supplier de la deuda, evitando N+1.

## Archivos modificados

- `backend/finance/serializers.py` — nuevos `SerializerMethodField`: `counterparty_kind`, `counterparty_label`, `reference_label`, `payment_method`
- `backend/finance/views.py` — `cash_entries_for_day` con `select_related` extendido; `debt_payment_entry` agrega los mismos cuatro campos
- `backend/tests/test_mvp_flows.py` — asserts adicionales para contraparte y referencia en `test_cash_daily_separates_cashflow_from_economic_totals`
- `frontend/lib/cash-entry.ts` — helpers `cashCounterpartyKindLabel`, `cashEntryCounterparty`, `cashEntryReferenceLabel`, `cashEntryPaymentMethod`, `cashEntryClassificationLabel`, `cashEntryOccurredTime`, `cashEntryMatchesQuickFilter`, `sortCashEntries`; tipos `CashQuickFilter`/`CashSortKey` y arrays de opciones; query busca tambien contraparte/referencia/metodo
- `frontend/lib/cash-entry.test.mjs` — tests para los nuevos helpers
- `frontend/app/components/cash/CashEntryRow.tsx` — fila compacta nueva
- `frontend/app/components/cash/CashPanel.tsx` — quick bar de chips + sort, search row con boton `Mas filtros`, lista reemplazada por `CashEntryRow`, props sin `cashEntryTitle`/`cashEntryDescription`
- `frontend/app/page.tsx` — estado `cashQuickFilter`/`cashSortKey`, sort + quick filter aplicados al `useMemo`, helpers de title/description sin uso eliminados
- `frontend/app/styles/shell.css` — `.cash-quick-bar`, `.cash-quick-chip`, `.cash-sort`, `.cash-search-row`, `.cash-advanced-toggle`, `.cash-entry-list`, `.cash-entry-row` y modificadores; sustituye los antiguos `.cash-records`/`.cash-entry`

## Validacion

- `backend` pytest sobre finance/cash/debts: 87 passed
- `frontend` vitest completo: 309 passed (incluye 28 nuevos en `cash-entry.test.mjs`)
- `frontend` `npm run build`: ok (page principal 215 kB)
