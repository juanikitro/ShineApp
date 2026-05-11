# Proveedores 360 operativo

## Cambio

Proveedores pasa de ser un dato auxiliar de compras a una seccion operativa propia. La vista muestra perfil fiscal/contacto, estado, total comprado, cantidad de compras, ultima compra, materiales frecuentes, precios unitarios recientes, compras pendientes de recepcion, comprobantes, egresos de caja y deudas vinculadas.

## Impacto

- Backend: `Supplier` agrega campos opcionales y compatibles: `legal_name`, `category`, `tax_condition` y `website`.
- Backend: `Debt` agrega `supplier` opcional para vincular deuda real con proveedor sin alterar deudas legacy por acreedor de texto.
- API: `/api/suppliers/` devuelve `list_insights` para listados operativos sin romper el dropdown existente.
- API: `/api/suppliers/{id}/history/` expone resumen, compras, recepcion pendiente, materiales, comprobantes, egresos de caja y deudas del proveedor.
- API: `DebtSerializer` acepta `supplier` y expone `supplier_name`.
- Frontend: se agrega la seccion `Proveedores` al shell actual, sin rutas nuevas.
- Frontend: desde el dashboard de proveedor se puede iniciar una compra con proveedor preseleccionado, crear una deuda vinculada, editar el proveedor y revisar historial/documentos.

## Decision

`Material` sigue siendo el catalogo de productos/materiales. La historia operativa de proveedores se deriva de `StockMovement` de tipo compra, y la deuda usa `Debt.supplier` solo cuando hay vinculo real. No se infieren deudas por texto para evitar mezclar acreedores homonimos o legacy.

## Validacion esperada

- Crear un proveedor solo con `name` sigue funcionando.
- Crear una compra desde movimientos mantiene el proveedor y permite crear proveedor rapido desde el desplegable.
- Abrir Proveedores muestra insights de listado.
- Abrir un proveedor muestra compras, materiales frecuentes, precios recientes, recepcion pendiente, comprobantes, caja y deudas.
- Crear compra desde proveedor abre el modal de movimiento con ese proveedor preseleccionado.
- Crear deuda desde proveedor guarda `supplier` y acreedor preseleccionados.
