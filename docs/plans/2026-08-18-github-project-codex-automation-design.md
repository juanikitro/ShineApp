# GitHub Project y automatizacion diaria con Codex

## Objetivo

Operar el trabajo de ShineApp desde GitHub como un flujo de producto: el
usuario registra pedidos libres, Codex los prepara, consulta las decisiones que
no puede tomar y ejecuta de forma segura las tareas que ya estan listas.

GitHub Issues y GitHub Project son la fuente de verdad. Los comentarios de cada
Issue son la bitacora auditable de decisiones, planes, validaciones, PRs y
despliegues. No se usa una memoria local como fuente de estado.

## Enfoque elegido

Se adopta un enfoque hibrido:

- GitHub Project concentra el tablero, los campos, las vistas y el auto-add de
  Issues.
- GitHub Actions y rulesets imponen validaciones y bloquean merges inseguros.
- Dos tareas programadas de Codex hacen el grooming y el desarrollo desde
  worktrees aislados.

El Project privado se llamara `ShineApp · Delivery`, sera propiedad de
`juanikitro` y se vinculara a `juanikitro/ShineApp`.

## Modelo de trabajo

### Estados

| Estado | Significado | Quien lo avanza |
| --- | --- | --- |
| `Inbox` | Pedido libre aun sin preparacion tecnica. | Grooming |
| `Human required` | Falta una decision humana expresada en un comentario. | Usuario y grooming |
| `Backlog` | Tarea preparada, segura y elegible para ejecucion. | Grooming |
| `In progress` | Codex reclamo la tarea y trabaja en un worktree. | Desarrollo |
| `Validating` | Existe PR hacia `development` y se esperan o corrigen checks. | Desarrollo y GitHub |
| `In development` | El PR de tarea fue mergeado en `development`. | Desarrollo |
| `Deploying` | Los cambios llegaron a `main`; falta comprobar el deploy. | Grooming |
| `Done` | El deploy fue verificado. La Issue se cierra. | Grooming |
| `Blocked` | Dependencia tecnica o externa impide continuar. | Codex o usuario |

El Project no usa un campo de release separado: la diferencia entre integrado y
publicado se representa exclusivamente con `In development`, `Deploying` y
`Done`.

### Campos y vistas

Campos minimos:

- `Status`: los estados anteriores.
- `Priority`: `P0`, `P1`, `P2`, `P3`; la prioridad es responsabilidad del
  usuario. Si una Issue libre no la indica, grooming asigna `P2` y lo registra
  en la ficha.
- `Size`: `S`, `M`, `L`, `XL`; Codex lo estima despues de una inspeccion breve
  de solo lectura. El usuario puede sobrescribirlo.
- `Work type`: `Bug`, `Feature`, `Improvement`, `Technical debt`, `Docs`.
- `Target date`: opcional; desempata tareas de igual prioridad.

Vistas:

- `Flujo`: board agrupado por `Status`.
- `Backlog PM`: tabla con prioridad, tamano y fecha objetivo.
- `Human required`: filtro por ese estado.
- `Release`: filtro por `In development` y `Deploying`.

Labels de motivo administrados por Codex:

- `reason:business-decision`
- `reason:approval`
- `reason:external-dependency`
- `reason:validation-failed`
- `reason:deploy-failed`

El workflow nativo Auto-add agrega al Project las Issues abiertas nuevas o
actualizadas de `juanikitro/ShineApp`, con filtro `is:issue is:open`. Los
workflows predeterminados que marcan `Done` al cerrar Issues o mergear PRs se
desactivan: `Done` solo puede significar deploy verificado.

## Protocolo de comentarios

El cuerpo escrito por el usuario se preserva sin reescritura. Codex usa:

- Un comentario editable `Codex · Ficha de tarea`, con objetivo, alcance,
  criterios de aceptacion, supuestos, dependencias, tipo, prioridad, tamano y
  riesgo vigentes.
- Comentarios nuevos e inmutables para `Codex · Human required`, `Codex · Plan
  de ejecucion`, `Codex · Validacion`, `Codex · Resultado` y decisiones de
  despliegue.

Cada comentario de Codex incluye una marca interna estable para que ejecuciones
repetidas actualicen la ficha o reconozcan una pregunta pendiente sin duplicar
eventos.

Cuando necesita una decision, Codex mueve la Issue a `Human required`, aplica
un label de motivo, asigna a `juanikitro` y deja una unica pregunta concreta
con contexto y recomendacion. La respuesta humana se escribe en comentarios;
grooming la registra como decision y vuelve a evaluar la Issue.

## Automatizacion de grooming

Corre de lunes a viernes a las 10:00, hora Argentina.

1. Reconciliacion de `Deploying`:
   - deploy verificado: comentario de evidencia, `Done` y cierre de la Issue;
   - deploy fallido: evidencia y `reason:deploy-failed`; la Issue permanece en
     `Deploying`.
2. Revisa `Human required` con nuevas respuestas humanas, registra la decision
   y devuelve la Issue a `Inbox` para procesarla en la misma ejecucion.
3. Revisa `Inbox` sin modificar codigo. Completa o actualiza la ficha despues
   de inspeccionar el contexto tecnico minimo.
4. Si falta una decision humana, pasa a `Human required`; si hay una
   dependencia tecnica, pasa a `Blocked`; si la tarea es segura, tiene alcance
   suficiente y criterios verificables, pasa a `Backlog`.

Una tarea solo puede salir de `Inbox` hacia `Backlog` cuando tiene objetivo,
alcance, criterios de aceptacion, dependencias conocidas y riesgo compatible
con ejecucion desatendida.

## Automatizacion de desarrollo

Corre de lunes a viernes a las 11:00, hora Argentina.

Antes de tomar trabajo nuevo, retoma o resuelve su propia tarea en `In progress`
o `Validating`; no abre trabajo paralelo. Reconsulta GitHub antes de cualquier
mutacion.

Selecciona desde `Backlog` por este orden:

1. `P0`, `P1`, `P2`, `P3`.
2. Fecha objetivo mas cercana; las ausentes quedan al final.
3. `S`, `M`, `L`, `XL`.
4. Issue mas antigua.

La capacidad diaria es de 6 puntos y hasta cinco Issues, ejecutadas una por
vez. Equivalencias: `S=1`, `M=2`, `L=3`, `XL=6`. Por ejemplo, permite un `XL`,
dos `L`, tres `M` o hasta cinco fixes `S`. Solo entra una tarea que quepa en la
capacidad restante; la prioridad no se modifica para favorecerla.

Por cada tarea elegible:

1. Pasa a `In progress` y comenta el plan de ejecucion.
2. Crea un worktree nuevo basado en `origin/development`.
3. Implementa el diff minimo, actualiza documentacion como spec-as-source y
   ejecuta validaciones focalizadas.
4. Abre un PR hacia `development`, comenta enlace y evidencia, y pasa a
   `Validating`.
5. GitHub habilita squash auto-merge solo cuando los checks obligatorios estan
   verdes. Tras confirmar el merge, la Issue pasa a `In development`.

Al final, si `development` tiene cambios frente a `main` y no existe un PR
abierto de esa rama hacia `main`, crea exactamente un draft PR de publicacion.
Ese PR usa merge commit y nunca se mergea ni despliega automaticamente.

## Limites de autonomia

Codex no implementa ni mergea sin aprobacion previa cambios que impliquen:

- migraciones, backfills o datos reales;
- autenticacion, permisos o seguridad;
- caja, pagos, stock u otros efectos financieros;
- secretos, infraestructura, Vercel, Supabase o servicios externos;
- emails o notificaciones reales;
- upgrades grandes de dependencias o refactors amplios;
- publicaciones o despliegues.

Estos casos pasan a `Human required` con una pregunta concreta y plan. Si no
hay otra tarea segura, la ejecucion termina sin modificar codigo.

## Git, CI y reglas de proteccion

- `Validate` debe ejecutarse para PRs hacia `development` y `main`.
- El check agregador existente `ci-required` sera obligatorio en ambas ramas.
- `development` recibira una ruleset que exige PR, `ci-required` verde y
  conversaciones resueltas; no exige aprobacion humana, pero bloquea push
  directo, force-push y borrado.
- Se habilita auto-merge en el repositorio, limitado por el procedimiento de
  Codex a PRs de tareas hacia `development`.
- Los PRs de tarea hacen squash merge; el PR `development` a `main` hace merge
  commit y queda draft hasta accion humana.

## Fallos y evidencia

Una consulta incompleta de Project o GitHub es una parada segura: no se mueve
estado, no se crean ramas, PRs ni comentarios. Si hay conflicto con
`development`, Codex no rebasea ni fuerza: deja `Blocked` con los archivos y la
decision pendiente. Si CI falla, intenta una sola correccion focalizada; si no
puede resolverla, deja `Blocked` con evidencia. Cada resultado enlaza Issue,
PR, SHA, checks y deploy cuando aplique.

## Activacion gradual

1. Crear Project, campos, vistas, labels, auto-add, workflow y rulesets.
2. Probar grooming manual con una Issue libre y una decision humana.
3. Probar desarrollo manual con una Issue `S` inocua: worktree, PR, checks,
   squash merge y draft release PR.
4. Revisar los resultados y recien entonces programar grooming y desarrollo.

## Fuera de alcance inicial

- No hay despliegue automatico a `main`.
- No hay ejecucion paralela de Issues.
- No hay formularios de Issue ni reescritura del cuerpo original del usuario.
- No se usa estado local como fuente de verdad.
