# Guia para asistentes (IA)

- Fuente de verdad: `AGENTS.md`.
- Lectura obligatoria antes de implementar: `docs/indice.md`, una guia relevante de `docs/ia/`, archivo objetivo y tests del flujo si existen.
- Para UI, arrancar por `docs/ia/UI_CONTEXT.md` y la surface puntual antes de abrir toda la documentacion de diseno.
- Enfoque: spec-as-source liviano con Markdown dentro del repo.
- Registro recomendado: documentar cambios o decisiones importantes en `docs/` cuando alteren comportamiento, contratos o arquitectura.
- No copiar patrones de SISOC si no existen en este proyecto.
- Validar primero sobre la capa tocada; para cierre amplio usar `scripts/validate.ps1`.
  - backend: `pytest`, `manage.py check`
  - frontend: `npm run test`, `npm run test:coverage`, `npm run build`
  - compose: `docker compose config --quiet`
- Para cambios no triviales o generados por IA, correr tambien `scripts/test-coverage.ps1`.
- No modificar, relajar ni borrar tests para hacer pasar una implementacion. Si un test falla, diagnosticar causa raiz.
- Para generar tests con Codex, usar `docs/ia/CODEX_TESTING_PROMPT.md`.
- Si el checkout no tiene Git inicializado, no inventar pasos de branch, worktree o push.
