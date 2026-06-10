# Changelog sin conflictos entre PRs concurrentes

## Que cambio

Las feature branches ya no commitean `CHANGELOG.md` ni los indices generados
(`docs/registro/cambios/index.md`, `docs/registro/decisiones/index.md`,
`docs/plans/index.md`). Solo commitean el archivo de fragmento del cambio en
`docs/registro/cambios/YYYY-MM-DD-<tema>.md`.

Despues de cada merge a `main`, el job `regen-docs` en CI regenera
automaticamente esos archivos y hace un commit de mantenimiento.

## Por que

Antes, cada PR regeneraba `CHANGELOG.md` con sus propios fragmentos y lo
commiteaba. Cuando otro PR ya abierto intentaba mergearse, `CHANGELOG.md` en
`main` habia cambiado y habia conflicto garantizado. El driver `union-docs`
existente usaba `git merge-file --union`, que produce contenido incorrecto para
un archivo 100% regenerado.

## Como funciona ahora

1. **Feature branch**: el pre-commit hook regenera los archivos localmente
   (util para preview) pero NO los agrega al commit si no es main/development.
2. **PR**: CI solo chequea backend, frontend y dependencias. El job `docs`
   queda como `skipped` en PRs (es aceptado por `ci-required`).
3. **Merge a main**: GitHub Actions (`regen-docs.yml`) regenera y commitea
   `CHANGELOG.md` + indices con `[skip ci]` si hay cambios.
4. **Push directo a main o development**: el pre-commit hook regenera y agrega
   los archivos al commit, como antes.

## Archivos modificados

- `.githooks/pre-commit` — agrega branch check antes del `git add`
- `.github/workflows/validate.yml` — job `docs` con `if: push`; `ci-required`
  acepta `skipped` en docs
- `.github/workflows/regen-docs.yml` — nuevo workflow de regeneracion post-merge
- `.gitattributes` — driver `union-docs` deprecado (ya no hay conflictos)
