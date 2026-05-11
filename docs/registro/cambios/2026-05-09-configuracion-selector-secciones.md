# Configuracion con selector por secciones

## Cambio

`Configuracion` deja de mostrar todos sus bloques en una grilla unica y suma un selector segmentado para alternar entre:

- Negocio
- Cotizaciones
- Caja
- Agenda
- Usuarios

Cada seccion conserva sus controles y acciones existentes, pero se muestra una sola a la vez para reducir longitud visual y facilitar el escaneo.

Actualizacion:
- En `Caja`, el listado de categorias/subcategorias tiene altura acotada y scroll propio.
- La creacion y edicion de clasificaciones de egreso se hace en popup.

## Criterio

Se mantiene un unico item `Configuracion` en el sidebar principal. La separacion queda dentro del detalle porque son parametros administrativos de baja frecuencia, no modulos operativos equivalentes a Agenda, Caja o Clientes.
