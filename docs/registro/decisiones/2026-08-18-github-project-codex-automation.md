# GitHub Project como fuente de verdad para la entrega asistida por Codex

## Decision

ShineApp administrara el trabajo asistido por Codex con un Project privado de
GitHub, Issues de texto libre y dos tareas programadas: grooming diario a las
10:00 y desarrollo diario a las 11:00, hora Argentina.

GitHub conserva el estado, los comentarios, los PRs, los checks y el historial
de publicacion. Codex usa worktrees aislados y ejecuta solo tareas preparadas,
seguras y dentro de la capacidad diaria acordada. Las decisiones humanas se
solicitan y resuelven en comentarios de la Issue.

La progresion distingue `In development` de `Deploying` y `Done`; una tarea
solo esta terminada cuando el deploy se verifico. La promocion de
`development` a `main` siempre requiere accion humana mediante un draft PR
unico.

## Consecuencias

- No se trata una memoria local ni un chat como autoridad sobre el backlog.
- El grooming puede transformar pedidos libres en tareas ejecutables sin
  sobrescribir el texto original del usuario.
- Las tareas de bajo riesgo pueden integrarse automaticamente en
  `development`, pero las operaciones de alto riesgo pasan a `Human required`.
- Rulesets y `ci-required` son la barrera de merge, no una convencion que el
  agente pueda omitir.
- El detalle operativo, estados, capacidad, labels, comentarios y rollout se
  conserva en el diseno asociado de 2026-08-18.
