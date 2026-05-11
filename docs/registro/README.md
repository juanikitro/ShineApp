# Spec-as-Source en ShineApp

Este directorio define la convencion minima para documentacion operativa y de cambios.

## Reglas

1. Antes de implementar, leer `AGENTS.md`, `docs/indice.md` y solo el contexto minimo necesario.
2. Registrar en `docs/` cada cambio o decision importante que altere comportamiento, contratos o arquitectura.
3. No depender de herramientas externas de spec-driven development; la fuente de verdad vive en Markdown dentro del repo.

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

## Cuando registrar

- cambios funcionales visibles,
- decisiones de arquitectura o diseno,
- cambios de seguridad, permisos o datos sensibles,
- trade-offs relevantes para mantenimiento.

## Cuando puede no aplicar

Si el cambio es trivial y sin impacto funcional, se puede omitir el archivo, pero debe quedar justificado en la entrega.

## Errores repetidos

Usar `docs/registro/errores-agentes.md` para registrar fallas recurrentes de asistentes. Mantenerlo corto: patron, causa, prevencion y validacion.
