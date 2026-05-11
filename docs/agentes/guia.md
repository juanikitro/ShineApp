# Guia para asistentes (IA)

- Fuente de verdad: `AGENTS.md`.
- Lectura obligatoria antes de implementar: `docs/indice.md`, una guia relevante de `docs/ia/`, archivo objetivo y tests del flujo si existen.
- Para UI, arrancar por `docs/ia/UI_CONTEXT.md` y la surface puntual antes de abrir toda la documentacion de diseno.
- Enfoque: spec-as-source liviano con Markdown dentro del repo.
- Registro recomendado: documentar cambios o decisiones importantes en `docs/` cuando alteren comportamiento, contratos o arquitectura.
- No copiar patrones de SISOC si no existen en este proyecto.
- Validar primero sobre la capa tocada; para cierre amplio usar `scripts/validate.ps1`.
  - backend: `pytest`, `manage.py check`
  - frontend: `npm run test`, `npm run build`
  - compose: `docker compose config --quiet`
- Si el checkout no tiene Git inicializado, no inventar pasos de branch, worktree o push.
