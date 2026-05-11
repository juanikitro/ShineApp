# CODEX.md

Instrucciones especificas para Codex en ShineApp.

Fuente de verdad:
- `AGENTS.md`

Arranque minimo:
1. Leer `AGENTS.md`.
2. Leer `docs/indice.md`.
3. Leer archivo objetivo + tests del flujo.
4. Elegir una sola guia de `docs/ia/` segun la tarea.
5. Expandir contexto solo si hace falta.

Usar:
- `docs/ia/CONTEXT_HYGIENE.md` para decidir que abrir,
- `docs/contexto/` para no perder el mapa del proyecto.

Fallback si `AGENTS.md` no esta disponible:
- no inventar contratos entre frontend y backend,
- mantener diffs chicos,
- no imponer capas o tooling ajeno al repo,
- agregar tests minimos cuando aplique,
- documentar cambios importantes en `docs/`.
