# Cotizaciones: nombre opcional

Fecha: 2026-07-10

Contexto:
- El campo visible como "Nombre de la cotizacion" edita `public_code`.
- Al vaciarlo, el backend aceptaba el request pero conservaba el nombre anterior.

Cambio:
- `PATCH /api/quotes/{id}/` acepta `public_code` vacio o `null`.
- Un valor vacio limpia el nombre custom y la cotizacion vuelve al identificador fallback.
- La validacion de unicidad se mantiene para nombres no vacios.

Validacion:
- Test backend puntual sobre edicion, limpieza y unicidad de `public_code`.
