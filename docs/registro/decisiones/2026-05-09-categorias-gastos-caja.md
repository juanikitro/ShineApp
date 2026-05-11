# Categorias configurables de Caja

Fecha: 2026-05-09

## Decision

Caja guarda `category` y `subcategory` como textos simples por compatibilidad tecnica, pero la operacion no los carga como campos libres. La UI usa desplegables dependientes: primero categoria y luego subcategoria filtrada por esa categoria. Si la combinacion no existe, el usuario puede crearla y queda registrada en el arbol configurable del negocio segun el tipo de movimiento: `income_category_tree` para ingresos y `expense_category_tree` para egresos.

La configuracion inicial de egresos incluye categorias operativas por defecto:
- Alquiler
- Inversion
- Servicios
- Materiales e insumos
- Mantenimiento
- Impuestos y tasas
- Administracion
- Marketing y ventas
- Deudas
- Ajustes
- Otros

Cada categoria tiene subcategorias por defecto. Por ejemplo, `Inversion` incluye herramientas, maquinarias y remodelaciones; `Servicios` incluye agua, alquiler, comida, gas, internet, luz, sueldo y telefono.

La configuracion inicial de ingresos incluye las categorias de caja operativas existentes:
- Pago
- Sena
- Adelanto
- Prestamo
- Inversion
- Venta
- Pago de orden
- Otros

Las categorias de cobro incluyen subcategorias por medio de pago (`Efectivo`, `Tarjeta`, `Transferencia`, `Otro`) y las categorias generales usan subcategorias simples como `General` o aportes de capital.

## Impacto automatico en Caja

Los movimientos que llegan desde otros modulos se clasifican en backend:
- Cobros de orden: `Pago` o `Sena`, con subcategoria segun medio de pago.
- Ventas de stock: `Venta`, con subcategoria segun medio de pago.
- Compras de materiales: `Materiales e insumos`, con subcategoria igual al material comprado.
- Deudas originales: usan `expense_category` y `expense_subcategory` propias de la deuda; por defecto `Servicios / Otros`.
- Pagos de deuda en la vista diaria: `Deudas / Pago de deuda`.
- Ajustes compensatorios: `Ajustes / Ajuste de cierre`.

## Criterio

La app ofrece categorias profesionales y editables sin convertir Caja en un sistema contable pesado. Los registros historicos siguen siendo compatibles, pero las altas operativas nuevas pueden trabajar con combinaciones categoria-subcategoria para evitar carga desordenada.
