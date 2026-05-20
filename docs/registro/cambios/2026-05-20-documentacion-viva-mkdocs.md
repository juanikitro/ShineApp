# Documentacion viva con MkDocs Material

## Cambio

Se agrego un sitio navegable de documentacion sobre `docs/` usando MkDocs Material, con configuracion raiz en `mkdocs.yml` y dependencias aisladas en `requirements-docs.txt`.

## Validacion esperada

- `py -3 scripts/check_docs.py --check`
- `py -3 -m mkdocs build --strict`

## Alcance

- `docs/` sigue siendo la fuente de verdad.
- `docs/indice.md` sigue siendo el mapa canonico.
- No se activo deploy automatico de documentacion.
