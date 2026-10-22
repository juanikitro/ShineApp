# Detalle generico: jerarquia escaneable

## Cambio visible

Los modales de detalle genericos ahora separan visualmente la informacion del
registro, muestran la cantidad de datos disponibles y organizan los campos en
dos columnas cuando hay espacio. Los textos narrativos conservan ancho completo
para evitar cortes y la vista vuelve a una sola columna en mobile.

## Alcance

- Aplica solo a `DetailModal` y no altera `ModalFrame` ni los modales de alta o
  edicion.
- El detalle especializado de movimientos de caja conserva su presentacion
  propia.
- Se mantienen iconos, estados, foco, cierre y accion de editar existentes.
- Los estados sin tono propio (activo, inactivo, en uso, etc.) se muestran como
  chip neutro en lugar de texto suelto desalineado.

## Validacion

- Tests focalizados cubren campos normales, estado, contenido narrativo, vacio,
  registros extensos (conteo y campos largos a ancho completo), detalle de caja,
  cierre y transicion a formulario de edicion.
