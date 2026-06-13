# Tipos del dominio generados desde OpenAPI (drf-spectacular -> openapi-typescript)

## Contexto

El frontend tiene el tipado de dominio efectivamente apagado:
`type AnyRecord = Record<string, any>` (definido en `lib/page-support.tsx`) se
usa ~791 veces, mas ~104 `: any` sueltos. El compilador no protege contra
typos de campos, shapes incorrectos de la API ni refactors silenciosos. Como
el contrato real vive en los serializers de DRF, escribir tipos a mano los
dejaria desincronizados del backend con el tiempo.

## Decision

- **Backend expone el contrato** con `drf-spectacular`: un endpoint
  `/api/schema/` genera el OpenAPI a partir de los serializers existentes.
- **Frontend genera los tipos** con `openapi-typescript`:
  `npm run gen:types` -> `frontend/lib/api/types.gen.ts`.
- **Cliente tipado**: se envuelve `lib/api.ts` con un helper `apiFetch<T>` que
  consume esos tipos.
- **Gate de drift** en CI: regenerar y `git diff --exit-code` para que el
  schema y los tipos no se desincronicen.
- Los `SerializerMethodField` que el schema no infiera se anotan con
  `@extend_schema_field` para no degradar a `any`.

## Alternativas consideradas

- **Interfaces a mano**: cero tooling, pero drift garantizado contra el backend.
- **Zod en los boundaries**: valida en runtime e infiere tipos, pero agrega una
  dependencia y obliga a escribir/mantener los esquemas a mano. Queda como
  opcion futura para los boundaries publicos (landing, webhooks) si hiciera falta.
- **GraphQL / tRPC**: cambiarian el contrato de transporte; fuera de alcance.

## Consecuencias

- +2 dependencias: `drf-spectacular` (backend) y `openapi-typescript` (dev front).
- Los tipos quedan siempre sincronizados con los serializers.
- Reemplazo incremental de `AnyRecord`: se empieza por las funciones puras de
  `lib/` (ya testeadas, bajo riesgo) y luego por los containers del Track F.
- `AnyRecord` se elimina al final; el lint lo bloquea en el Track H.

## Validacion esperada

- `spectacular --validate` (o equivalente) pasa en CI.
- `npm run gen:types` es idempotente: correrlo dos veces no produce diff.
- El gate de drift falla si alguien cambia un serializer sin regenerar tipos.
