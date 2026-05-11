# CONTRIBUTING_AI.md

Proceso recomendado para trabajar con IA en ShineApp.

Fuente de verdad:
- `../../AGENTS.md`

## Brief recomendado

Todo pedido idealmente deberia incluir:
- contexto,
- objetivo,
- alcance,
- restricciones,
- criterio de aceptacion,
- validacion esperada.

## Lectura minima antes de implementar

Base obligatoria:
1. `AGENTS.md`
2. `docs/indice.md`
3. archivo objetivo
4. tests del flujo o modulo
5. una sola guia relevante de `docs/ia/`

Ampliar solo si el cambio lo exige.

## Flujo sugerido

1. Explorar el codigo real del modulo.
2. Delimitar el diff minimo.
3. Implementar alineado al patron existente.
4. Validar primero con checks puntuales.
5. Documentar cambios importantes en `docs/` si aplica.
6. Entregar con resumen, validacion, supuestos y riesgos.

## Reglas de commits

Si el repo tiene Git y la tarea incluye commit:
- una sola intencion principal por commit,
- mensaje en espanol,
- primera linea con patron `<type>(<scope>): <subject>`.

Tipos frecuentes:
- `fix`
- `feat`
- `refactor`
- `test`
- `docs`
- `chore`

## Validacion recomendada

Secuencia corta:
1. check puntual de la capa tocada,
2. tests del flujo afectado,
3. build del frontend si cambio UI o contrato visible,
4. `scripts/validate.ps1` para cierre amplio o cambios de harness/full-stack.

## Spec-as-source

Registrar en `docs/`:
- cambios funcionales visibles,
- decisiones de diseno,
- cambios de seguridad o permisos,
- trade-offs relevantes.

Si no aplica, explicitarlo en la entrega.

Para errores repetidos del agente, agregar una fila corta en `docs/registro/errores-agentes.md` en vez de inflar `AGENTS.md`.
