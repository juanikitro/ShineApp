# Changelog automatico (CHANGELOG.md + hook de commit)

## Que cambio

- Nuevo `CHANGELOG.md` en la raiz del repo: vista unica de cambios funcionales,
  mas nuevo arriba, agrupada por fecha. Es generado, no se edita a mano.
- Se genera desde los archivos que ya existen en `docs/registro/cambios/`
  (una entrada por cambio, nombre `YYYY-MM-DD-<tema>.md`). La fecha sale del
  prefijo del nombre y el titulo del `# H1` de cada archivo.
- Antes el unico indice por fecha era `docs/registro/cambios/index.md`
  (ascendente, dentro del sitio mkdocs). Ahora ademas hay un changelog
  convencional, descendente y visible en la raiz.

## Como se mantiene al dia

- `scripts/check_docs.py` ahora tambien genera `CHANGELOG.md` ademas de los
  indices. Regenerar con:
  `py -3 scripts/check_docs.py --write --skip-build`.
- CI (job `docs`) corre `py -3 scripts/check_docs.py --check`, asi que un
  `CHANGELOG.md` desactualizado rompe el build, igual que los indices.
- Hook de commit universal en `.githooks/pre-commit`: regenera y re-agrega
  `CHANGELOG.md` y los indices en cada commit. Sirve para Claude, Codex o
  humano porque dispara en el commit, no en una herramienta puntual. Si no
  encuentra Python, avisa y deja pasar el commit (CI igual valida).

## Como habilitar el hook

- Una vez por clon: `git config core.hooksPath .githooks`.
- Atajo: `pwsh -File scripts/setup-hooks.ps1` (Windows) o
  `sh scripts/setup-hooks.sh` (Linux/Mac).

## Notas de alcance

- El hook regenera la vista agregada; la entrada por cambio en
  `docs/registro/cambios/` la sigue escribiendo quien hace el cambio
  (la regla vive en `AGENTS.md`).
- `CHANGELOG.md` vive fuera de `docs/`, asi que no entra al sitio mkdocs ni
  cambia su nav; el indice del sitio sigue siendo `cambios/index.md`.
- Ordena por la fecha del nombre del archivo (no por fecha de commit), para
  que el resultado sea deterministico y reproducible en CI.
