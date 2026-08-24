# GitHub Project y gate CI para development

## Cambio operativo

El flujo asistido por Codex usa GitHub Project como fuente de verdad para el
backlog y sus decisiones, con estados separados para desarrollo, validacion,
deploy y verificacion. El workflow `Validate` ahora corre tambien en pull
requests hacia `development`, mientras que la validacion de documentación y el
build estricto de MkDocs corren en cada push a `main` o `development`.

El check agregado `Validate / ci-required` resume backend, frontend,
dependencias y documentación. La rama `development` queda protegida por PR,
conversaciones resueltas y checks verdes; `main` continúa siendo la rama de
publicación y requiere acción humana para promocionar cambios.

## Fuentes canónicas

- `.github/workflows/validate.yml`
- `docs/deployment/github-actions.md`
- `docs/plans/2026-08-18-github-project-codex-automation-design.md`
- `docs/registro/decisiones/2026-08-18-github-project-codex-automation.md`

## Validación

- `py -3 scripts/check_docs.py --check --skip-build`
- `git diff --check`
