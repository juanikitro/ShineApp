# Vehiculos con marca y modelo guiados

## Cambio

El formulario de vehiculos usa un desplegable para `Marca` con marcas conocidas y valores historicos ya cargados. Al seleccionar una marca, el campo `Modelo` muestra solo modelos conocidos de esa marca mas los modelos historicos asociados a esa misma marca.

El orden operativo del formulario queda:

1. Marca y modelo.
2. Color y patente.

Si la marca o el modelo no existen en las opciones, el operador puede crearlos desde la busqueda del desplegable y el valor queda cargado en el vehiculo actual.

La patente queda como dato opcional. Si se informa, sigue siendo unica; si no se informa, el vehiculo se identifica por marca/modelo en listados y selectores.

Los listados de vehiculos muestran marca/modelo como titulo cuando no hay patente y el buscador local incluye patente, marca, modelo, color y cliente.

## Alcance

- `brand` y `model` siguen siendo strings libres en `Vehicle`.
- `license_plate` acepta valor vacio y conserva unicidad solo cuando esta presente.
- No agrega endpoints nuevos.
- Aplica al formulario principal, al alta rapida de vehiculo y a la edicion desde detalle.

## Criterio operativo

Si se cambia la marca y el modelo actual no corresponde a la nueva marca, el modelo se limpia para evitar combinaciones inconsistentes.
