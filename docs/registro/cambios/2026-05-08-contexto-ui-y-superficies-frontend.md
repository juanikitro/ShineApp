# Contexto UI minimo y superficies frontend particionadas

## Que cambio

- Se acoto la lectura obligatoria para tareas de UI con `docs/ia/UI_CONTEXT.md`.
- `AGENTS.md` y `docs/ia/CONTEXT_HYGIENE.md` pasaron a tratar la documentacion larga de diseno como contexto condicional, no como lectura base para cualquier retoque visual.
- El frontend quedo documentado con una separacion mas explicita entre:
  - `frontend/app/page.tsx` para orquestacion
  - `frontend/lib/page-support.tsx` para helpers y soporte compartido
  - `frontend/app/styles/*.css` para estilos por superficie

## Por que

El repo estaba forzando demasiada carga de contexto en tareas puntuales:
- demasiadas guias antes de tocar UI,
- una hoja global muy grande,
- una pagina principal con demasiado soporte embebido.

La meta es bajar tokens y tiempo de exploracion sin cambiar contratos ni comportamiento.

## Impacto esperado

- menos lectura obligatoria por tarea de frontend,
- mejor entrypoint para abrir solo la surface tocada,
- menor incentivo a cargar `page.tsx` y `globals.css` completos cuando no hace falta.
