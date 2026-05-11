# Materiales con movimientos de stock

## Cambio

Materiales deja de operar compras y consumos como acciones sueltas del catalogo. El contrato principal pasa a ser `StockMovement`, con lineas multi-producto para compras, stock inicial, consumos y ventas. `Material` se mantiene como catalogo enriquecido de producto/material.

## Impacto

- Backend: `Material` agrega categoria, SKU opcional unico, presentacion, stock minimo y notas operativas existentes.
- Backend: se agrega `Supplier` como modulo simple de proveedores activos.
- Backend: se agrega `StockMovement` con tipo, fecha, proveedor, cliente, reserva, comprobante, adjunto, flags de caja/recepcion, total y notas.
- Backend: se agrega `StockMovementLine` para material, cantidad, precio unitario, total, costo estimado y delta de stock.
- API: se publican `/api/suppliers/` y `/api/stock-movements/`.
- API: si se adjunta comprobante, el movimiento acepta `multipart/form-data` con `lines` como JSON string.
- Caja: compra con `affects_cash=true` crea egreso; venta crea ingreso; stock inicial no impacta caja.
- Stock: stock inicial suma, compra suma solo si `products_received=true`, consumo y venta descuentan.
- Trabajos: consumo por reserva confirmada o completada resuelve el trabajo asociado y alimenta el costo de materiales.
- Frontend: Materiales expone `Nuevo movimiento`, proveedores y un modal operativo con lineas multi-producto, comprobante, recepcion, caja y metodo de cobro.

## Decision

No se crea un modelo `Producto` separado y no se migran historicos legacy. `stock_quantity` queda como valor sincronizado para listados rapidos; los endpoints legacy de compras y consumos se conservan para compatibilidad inmediata, pero la UI principal usa movimientos.

## Validacion esperada

- Una compra pendiente queda visible sin aumentar stock.
- Una compra recibida aumenta stock y puede crear egreso de caja.
- Un stock inicial aumenta stock sin caja.
- Una venta exige cliente, descuenta todas sus lineas y crea ingreso.
- Un consumo exige reserva operable, descuenta stock y actualiza el costo del trabajo.
- Editar o eliminar movimientos revierte efectos anteriores y vuelve a aplicar stock/caja.
- Si el dia de caja afectado esta cerrado, no se permite editar ni eliminar el movimiento.
- El comprobante opcional se serializa con URL cuando existe.
