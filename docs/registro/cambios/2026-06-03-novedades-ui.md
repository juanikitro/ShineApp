# Configuracion: panel Novedades con timeline del changelog

## Contexto

No habia forma de ver los cambios funcionales de ShineApp desde la propia aplicacion. El changelog existia solo como archivo de repo (CHANGELOG.md) y documentacion interna.

## Cambio

- Nueva pestana **Novedades** en Configuracion (icono Sparkles), al final de la barra de secciones.
- Muestra un timeline vertical con un nodo por fecha de cambios, mas reciente arriba.
- El nodo de la version mas reciente tiene el icono destacado en azul.
- Click en un nodo expande/colapsa los cambios de esa fecha. La primera fecha queda expandida por defecto.
- Cada cambio muestra titulo y descripcion (secciones Contexto y/o Cambio del .md correspondiente).
- Boton "Mostrar todas las versiones" aparece cuando hay mas de 5 fechas.
- El dato viene de `frontend/app/data/changelog.generated.json`, generado desde `docs/registro/cambios/` por `scripts/check_docs.py`.
- El hook `pre-commit` y el job CI `docs` mantienen el JSON sincronizado automaticamente en cada commit.

## Archivos modificados

- `scripts/check_docs.py` — genera `changelog.generated.json` ademas de los indices existentes
- `frontend/app/data/changelog.generated.json` — artefacto generado (commiteado)
- `.githooks/pre-commit` — agrega el JSON al re-add automatico de artefactos
- `frontend/app/page.tsx` — agrega `Sparkles` a imports y `novedades` a `SettingsSection` + `settingsSectionOptions`
- `frontend/app/components/settings/SettingsWorkspace.tsx` — agrega tipo `novedades`, componente `NewsSettingsPanel`, imports
- `frontend/app/styles/shell.css` — estilos del timeline (`.changelog-*`)
- `frontend/app/components/settings/settings.test.tsx` — tests del panel

## Validacion

- Tests frontend: 6 tests nuevos en `settings.test.tsx` que cubren render, expansion por defecto, colapso y apertura de grupos.
- Build verificado localmente (TypeScript, Next.js).
- El script `check_docs.py --write --skip-build` genera el JSON sin errores.
