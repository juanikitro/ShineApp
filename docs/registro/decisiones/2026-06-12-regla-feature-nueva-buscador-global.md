# Regla: toda feature nueva con entidad propia debe estar en el buscador global

## Decisión

Todo modulo nuevo que introduzca una entidad de negocio consultable (modelo Django con ViewSet/listado o concepto visible en el SPA) debe quedar integrado al buscador global antes de cerrar la tarea. Una entidad de negocio que no aparece en `/search/` se considera **incompleta** y bloquea el cierre del PR.

Esta regla aplica tanto a la IA como a contribuidores humanos.

## Alcance

Aplica a:

- Modelos nuevos con su propia superficie en el SPA (panel, lista, dashboard).
- Modelos existentes que pasen a ser navegables y todavia no esten en `/search/`.
- Cambios de identificadores publicos (slug, codigo) que afecten lo que se muestra como `label`/`sublabel`.

No aplica a:

- Modelos puramente tecnicos: auditoria, tokens, snapshots, occurrences derivadas.
- Joins/tablas pivote sin pagina propia.
- Datasets de configuracion sin instancias por negocio.

Si la entidad nueva queda fuera por alguno de estos motivos, dejalo explicito en el cambio.

## Minimo exigible por entidad

En `backend/search/views.py`:

```python
def _search_<entidad>(business, q, limit, *, user=None, is_economy=True):
    qs = (
        <Modelo>.objects.filter(business=business)
        .select_related(...)
        .filter(Q(<campo>__icontains=q) | ...)[:limit]
    )
    return [
        {
            "id": obj.id,
            "label": <texto principal>,
            "sublabel": <contexto secundario o "">,
            "detail_path": f"/<seccion>/{obj.id}",
        }
        for obj in qs
    ]
```

Y registrar la tupla `(type, label, fn)` en `_PUBLIC_SEARCHERS` o `_ECONOMY_SEARCHERS` segun el rol que pueda verla. Si la visibilidad depende del usuario (por ejemplo, empleado solo ve sus tareas), el helper recibe `user` y `is_economy` y aplica el filtro adicional.

En el frontend (`frontend/app/page.tsx`):

- Agregar el `groupType` a `searchResultTargets` con `section`, `detailTitle` y `apiPath`.
- Si la seccion no usa modal de detalle (el panel edita en linea), early-return en `openSearchResult` despues de `handleSectionChange`.

En `frontend/app/components/search/SearchResultsPanel.tsx`:

- Agregar el icono al map `GROUP_ICONS` para que el grupo plegable lo muestre.

Tests:

- En `backend/tests/test_search.py`, cubrir al menos: encuentra por campo principal, no cruza negocio, respeta `limit`, y si aplica, gating por rol (employee vs employer).

## Motivo

El buscador global es la entrada universal del sistema: cuando un modulo nuevo no esta indexado ahi, el usuario lo descubre tarde y los flujos cruzados (encontrar una tarea desde la pantalla de un cliente, abrir una cotizacion sin entrar a la seccion) se rompen. El costo de sumar el searcher es chico; el costo de descubrir el hueco semanas despues es que cada modulo queda como isla.

Disparador concreto: el modulo `tasks` se integro al backend y al frontend pero quedo fuera de `/search/`. Esta regla evita repetirlo.

## Como validar

Antes de cerrar cualquier tarea con entidad nueva consultable:

```powershell
# desde backend/
py -3 -m pytest tests/test_search.py -k <entidad>
```

Y prueba visual desde `?section=search&q=<termino>`: el grupo nuevo aparece con el icono correcto y el click abre la seccion (con su modal si corresponde).

Si la entidad queda fuera del buscador por alguna razon valida (ver Alcance), dejalo escrito en la entrega.

## Referencias

- `backend/search/views.py`: helpers `_search_*`, listas `_PUBLIC_SEARCHERS`/`_ECONOMY_SEARCHERS`, vista `GlobalSearchView`.
- `frontend/app/page.tsx`: `searchResultTargets` y `openSearchResult`.
- `frontend/app/components/search/SearchResultsPanel.tsx`: `GROUP_ICONS`.
- `docs/registro/cambios/2026-06-11-buscador-global-integrado-al-spa.md`: contrato actual del buscador en el SPA.
- `docs/registro/cambios/2026-06-12-buscador-global-cubre-tareas.md`: aplicacion de esta regla a `tasks`.
