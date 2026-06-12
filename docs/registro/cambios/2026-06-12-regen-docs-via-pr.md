# regen-docs: PR en lugar de push directo a main

## Que cambio

`regen-docs.yml` ya no hace `git push` directo a `main`. En cambio crea (o
actualiza) la branch `chore/regen-docs` y abre un PR con auto-merge activado.
El CI del PR corre `backend`, `frontend` y `dependency-audit`; el job `docs`
queda `skipped` (comportamiento normal en PRs, aceptado por `ci-required`).
Cuando el CI pasa, el PR se mergea automaticamente por squash.

## Por que

GitHub no permite agregar a "GitHub Actions" como bypass actor en rulesets de
repos personales. La API devuelve:
> "Bypass actors must be either GitHub Apps, organization roles, public teams,
> or users linked to the ruleset source. The following actor(s) are invalid:
> GitHub Actions"

El ruleset de `main` (id 16642600) requiere PR + `ci-required` para todo push,
incluido el del runner. El unico camino viable sin agregar secretos externos es
abrir un PR desde el propio workflow.

## Requisito de infra unico

El repo necesita tener "Allow auto-merge" habilitado una sola vez:
Settings > General > Pull Requests > Allow auto-merge.

Sin esta opcion, el workflow avisa con `::warning::` y el PR queda abierto para
merge manual. El CI sigue corriendo y el merge funciona; solo pierde la parte
automatica.

## Archivos modificados

- `.github/workflows/regen-docs.yml` — reemplaza push directo por PR + auto-merge
- `docs/deployment/manual-steps.md` — nuevo paso 12.2 sobre auto-merge
