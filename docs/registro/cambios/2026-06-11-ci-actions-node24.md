# CI: actions de GitHub actualizadas a majors con runtime Node 24

## Que cambio

- `actions/checkout` v4 -> v6, `actions/setup-node` v4 -> v6 y
  `actions/setup-python` v5 -> v6 en los tres workflows:
  `validate.yml`, `deploy-vercel-demo.yml` y `regen-docs.yml`.
- Motivo: GitHub fuerza Node 24 como runtime default de las actions JavaScript
  desde el 2026-06-16; las versiones anteriores corrian sobre Node 20 y cada run
  mostraba la annotation de aviso.

## Contrato tecnico

- Los tres tags v6 declaran `runs.using: node24` (verificado en el `action.yml`
  de cada tag).
- Runner minimo v2.327.1; los runners hosted `ubuntu-latest` ya lo superan.
- Breaking changes revisados en los changelogs oficiales:
  - checkout v6 persiste credenciales en un archivo separado en vez de
    `.git/config`; el `git push` de `regen-docs.yml` sigue funcionando porque
    git incluye ese archivo via `includeIf` dentro del mismo job.
  - setup-node v5 agrego cache automatico segun `packageManager` y v6 lo limito
    a npm; no nos afecta porque seteamos `cache: npm` y `cache-dependency-path`
    explicitos.
  - setup-python v6 solo cambia el runtime a node24 y agrega mejoras
    (`pip-version`, lectura de `.python-version`); los inputs usados
    (`python-version`, `cache`, `cache-dependency-path`) no cambian.

## Notas de alcance

- Solo cambian versiones de actions; cero cambios de logica en los workflows.
- `validate.yml` se prueba en el PR; `deploy-vercel-demo.yml` y `regen-docs.yml`
  disparan solo en push a `main`, asi que se terminan de validar con el primer
  merge posterior.
- No hizo falta `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`: era la alternativa
  para validar anticipado sin actualizar majors.
