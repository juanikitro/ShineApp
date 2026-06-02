# Spec-as-Source en ShineApp

Este directorio define la convencion minima para documentacion operativa y de cambios.

## Reglas

1. Antes de implementar, leer `AGENTS.md`, `docs/indice.md` y solo el contexto minimo necesario.
2. Registrar en `docs/` cada cambio o decision importante que altere comportamiento, contratos o arquitectura.
3. No depender de herramientas externas de spec-driven development; la fuente de verdad vive en Markdown dentro del repo.
4. Todo cambio funcional visible va a `docs/registro/cambios/`.
5. Toda decision de arquitectura, contrato o negocio va a `docs/registro/decisiones/`.
6. `docs/indice.md` sigue siendo el mapa canonico del sitio y del repo.
7. El build docs debe fallar si hay links rotos, nav invalida o archivos canonicos faltantes.

## Carga minima recomendada

Inicio:
- `AGENTS.md`
- `docs/indice.md`
- archivo objetivo
- tests del flujo
- una guia relevante de `docs/ia/`

Ampliar solo si el cambio toca reglas funcionales, permisos, seguridad o comportamiento observable.

## Convencion sugerida

- `docs/registro/cambios/`
- `docs/registro/decisiones/`
- `docs/registro/errores-agentes.md`
- `YYYY-MM-DD-<tema>.md`

Los indices `docs/registro/cambios/index.md` y `docs/registro/decisiones/index.md`, mas el `CHANGELOG.md` de la raiz, son generados. No editarlos manualmente; regenerarlos con:

```powershell
py -3 scripts/check_docs.py --write --skip-build
```

`CHANGELOG.md` es la vista unica de cambios funcionales mas nuevo arriba, agrupada por fecha; sale de los archivos de `docs/registro/cambios/`.

## Automatizacion del changelog

- El hook `.githooks/pre-commit` regenera `CHANGELOG.md` y los indices en cada commit y los vuelve a agregar al commit. Sirve para Claude, Codex o humano porque dispara en el commit, no en una herramienta puntual.
- Habilitarlo una vez por clon: `git config core.hooksPath .githooks` (o `scripts/setup-hooks.ps1` / `scripts/setup-hooks.sh`).
- CI (job `docs`) corre `py -3 scripts/check_docs.py --check`, asi que un changelog o indice desactualizado rompe el build aunque el hook no este habilitado.
- El hook mantiene la vista agregada; la entrada por cambio en `docs/registro/cambios/` la sigue escribiendo quien hace el cambio.

Validar la documentacion viva con:

```powershell
py -3 scripts/check_docs.py --check
py -3 -m mkdocs build --strict
```

## Cuando registrar

- cambios funcionales visibles,
- decisiones de arquitectura o diseno,
- cambios de seguridad, permisos o datos sensibles,
- trade-offs relevantes para mantenimiento.

## Cuando puede no aplicar

Si el cambio es trivial y sin impacto funcional, se puede omitir el archivo, pero debe quedar justificado en la entrega.

## Errores repetidos

Usar `docs/registro/errores-agentes.md` para registrar fallas recurrentes de asistentes. Mantenerlo corto: patron, causa, prevencion y validacion.
