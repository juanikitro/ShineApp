# Fase 2C - Primer turno y primer cobro guiados

## Objetivo

Cerrar el primer recorrido operativo de un negocio real vacio: crear el primer
turno/trabajo y registrar el primer cobro sin que el usuario tenga que deducir
en que pantalla empezar.

## Alcance aprobado

- Mantener el onboarding derivado de datos reales, sin persistencia de wizard.
- Reusar Agenda, ordenes de trabajo y Caja existentes.
- Agregar acciones guiadas desde el dashboard para los pasos pendientes.
- No agregar endpoints, migraciones ni modelos.

## Diseno

El panel `Alta guiada` suma un bloque de `Primer recorrido operativo`.

El flujo es:

1. Si falta agenda, la accion principal abre el modal de nueva reserva con el
   dia actual precargado.
2. Si falta caja y existe un trabajo con saldo pendiente, la accion abre el
   modal existente de cobro para ese trabajo.
3. Si falta caja pero todavia no hay trabajo cobrable, la accion vuelve a guiar
   a la creacion del primer turno.

El checklist sigue calculandose desde datos reales:

- `Primer turno o trabajo`: reservas, trabajos o solicitudes publicas.
- `Primer cobro`: pagos o ingresos reales del dashboard.

## UX

- Tono CRM claro y operativo.
- El usuario ve una secuencia corta: primero turno, despues cobro.
- En desktop, las acciones quedan en una franja compacta dentro del panel.
- En mobile, las acciones pasan a una columna con botones de ancho completo.
- Los pasos completados siguen navegando a Agenda o Caja para revisar datos.

## Riesgos

- Mandar a Caja sin trabajo cobrable. Mitigacion: detectar el primer trabajo
  activo con saldo y, si no existe, volver a guiar a Agenda.
- Duplicar logica dentro de `page.tsx`. Mitigacion: extraer el selector de
  trabajo cobrable a `frontend/lib/demo-readiness.ts`.
- Hacer promesas de caja automatica. Mitigacion: no crear cobros por detras; el
  usuario confirma el modal existente.

## Validacion esperada

- Tests unitarios del selector de trabajo cobrable.
- Tests del panel para acciones `Crear primer turno` y `Cobrar primer trabajo`.
- Vitest puntual de helpers/componentes tocados.
- `npm run typecheck` si los cambios TSX compilan localmente sin bloqueo.
