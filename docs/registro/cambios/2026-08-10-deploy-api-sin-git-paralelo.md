# Deploy: bloquear Git paralelo del API

## Cambio operativo

El `vercel.json` de la raiz configura `git.deploymentEnabled=false`. El
proyecto `shineapp-api` no tiene `Root Directory` en su integracion Git, por lo
que Vercel lee esa configuracion y no crea deploys del API disparados por Git.

El workflow `.github/workflows/deploy-vercel-demo.yml` conserva el orden
canonico de produccion: valida, aplica migraciones, despliega API con
`--cwd backend`, despliega web y ejecuta el smoke test publico. El bloqueo evita
que un deploy Git del API publique codigo antes de las migraciones.

## Alcance

`shineapp-web` usa `frontend` como `Root Directory` y no hereda el
`vercel.json` raiz. Si GitHub Actions debe ser tambien su unico camino de
deploy productivo, su integracion Git se deshabilita o ignora por separado en
el dashboard de Vercel; este cambio no altera esa configuracion externa.

## Documentacion relacionada

- `docs/deployment/vercel.md`
- `docs/deployment/github-actions.md`
- `docs/deployment/manual-steps.md`

## Validacion

- `vercel.json` parsea como JSON valido con
  `git.deploymentEnabled=false`.
- `py -3 scripts/check_docs.py --check --skip-build` valida los registros e
  indices generados.
- El workflow de deploy y el smoke test publico deben completar despues del
  merge antes de considerar publicada la correccion.
