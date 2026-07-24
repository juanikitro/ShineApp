# Paginacion estable en los listados de la app

Fecha: 2026-07-24

Problema:
- Los listados paginados se ordenaban por campos que pueden repetirse. En
  particular, vehiculos con patente vacia tenian el mismo valor de orden.
- Al pedir las paginas una por una, la base podia devolver filas repetidas entre
  paginas y omitir otras. La UI recargaba su lista despues de una alta rapida y
  perdia la opcion recien creada aunque el registro siguiera guardado.

Cambio:
- La paginacion por defecto agrega la clave primaria como ultimo criterio de
  orden cuando el queryset no la incluye.
- Conserva el orden funcional existente y vuelve estables los limites entre
  paginas para todos los listados que usan la paginacion DRF por defecto.

Validacion:
- Test de API con vehiculos sin patente repartidos en varias paginas: cada ID
  se devuelve una sola vez y en un orden reproducible.
