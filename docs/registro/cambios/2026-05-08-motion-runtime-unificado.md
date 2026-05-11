# Motion runtime unificado para animaciones

## Contexto

El frontend mezclaba animaciones stateful entre helpers propios en `page-support.tsx`, atributos `data-motion` y keyframes CSS dispersos. Eso volvia inconsistente la entrada/salida de modales, el cambio de secciones, los toasts, la agenda y el feedback visual sobre registros.

## Cambio

- `motion` pasa a ser el runtime unico para animaciones stateful del frontend.
- Se agrega un provider global con `MotionConfig reducedMotion="user"` y `LazyMotion`.
- La especificacion compartida de timings, easings, variantes y transiciones vive en `frontend/lib/motion-spec.ts`.
- Modales, `DetailModal`, toasts, `SearchSelect`, cambio de workspace, agenda y pulsos de feedback migran a Motion.
- CSS conserva solo transiciones simples y reglas estructurales o responsive.

## Decisiones

- No se cambiaron endpoints ni contratos backend.
- La agenda mantiene `@dnd-kit/core` como motor de drag and drop.
- El estandar de motion queda documentado en `docs/design-system.md`.
- No se permiten nuevas variantes ad hoc fuera de la spec compartida sin documentarlas primero.
