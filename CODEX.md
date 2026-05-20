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
- `docs/contexto/` para no perder el mapa del proyecto,
- `docs/ia/TESTING.md` para cambios de comportamiento o tests,
- `docs/ia/CODEX_TESTING_PROMPT.md` cuando el objetivo sea generar una bateria de tests.

Testing:
- No modificar, borrar, relajar ni saltear tests para hacer pasar codigo.
- Para bugs o cambios de comportamiento, escribir primero un test de regresion o contrato.
- Para cierre amplio usar `scripts/validate.ps1`.
- Para cambios no triviales, generados por IA, helpers compartidos o componentes reutilizables, usar tambien `scripts/test-coverage.ps1`.
- Coverage minimo: 90 backend y 90 frontend en statements, branches, functions y lines sobre el scope configurado.

Fallback si `AGENTS.md` no esta disponible:
- no inventar contratos entre frontend y backend,
- mantener diffs chicos,
- no imponer capas o tooling ajeno al repo,
- agregar tests minimos cuando aplique,
- documentar cambios importantes en `docs/`.
