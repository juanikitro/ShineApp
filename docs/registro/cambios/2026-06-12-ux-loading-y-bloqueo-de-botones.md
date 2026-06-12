# UX: bloqueo de botones, loaders globales y confirmaciones in-app

## Que cambio

Pasada de UX enfocada en respuestas lentas del tier gratuito de Vercel y Supabase.
Cierra el doble-click accidental y agrega feedback visible mientras la API tarda
en responder.

- `Button` (`frontend/app/components/ui/Button.tsx`) gana la prop `onClickAsync`.
  Cuando se usa, el botón se auto-bloquea durante la promesa y muestra el
  spinner sin necesidad de cablear un `loading` externo. El handler legado de
  `onClick` queda intacto.
- Nuevo `GlobalProgressBar` (`frontend/app/components/ui/GlobalProgressBar.tsx`):
  barra superior tipo NProgress que se enciende cuando `pendingActions.pending`
  vale `true`. Reemplaza la sensación de "no pasó nada" cuando `runAction` está
  esperando al servidor.
- Nuevo `SavingOverlay` (`frontend/app/components/ui/SavingOverlay.tsx`): pill
  flotante con spinner que se monta sobre cards en transición (agenda + cambios
  de estado de orden de trabajo).
- Nuevo `useConfirmDialog` (`frontend/lib/use-confirm-dialog.tsx`): reemplazo
  in-app de `window.confirm`. Soporta `onConfirm` async y mantiene el botón
  primario en `loading` mientras la acción se ejecuta.
- `QuickActionsMenu`: auto-detecta promesas devueltas por `onSelect` y muestra
  spinner por ítem hasta que la operación termina. También acepta
  `pendingActionId` para overrides externos.
- `page.tsx`:
  - Migra todos los `<button className="primary">` HTML inline a `<Button>`
    con `loading={pendingActions.pending}` (13 ocurrencias, incluyendo "Crear
    cliente", "Crear material", "Registrar pago en agenda", etc.).
  - `runAction` y `runOptimistic` programan un toast intermedio "Guardando…"
    si la promesa tarda más de 700 ms; se descarta cuando llega la respuesta.
  - Reemplaza los dos `window.confirm` (eliminar gasto fijo, revertir pago) por
    `requestConfirm` del nuevo hook.
  - `AgendaReservationCard` recibe `saving` cuando hay drag-move o cambio de
    estado en vuelo (combinando `agendaMovePendingId` y `isActionPending`).
- `DebtPanel` y `FixedExpensePanel` reemplazan el `LoadingState` de texto por
  `SkeletonList`, alineándose al patrón de `CashPanel` y `CustomerListPanel`.
- `GlobalSearchInput`: debounce baja de 300 ms a 250 ms para acelerar el
  feedback sin disparar más requests.

## Por que

La demo se siente rápida al navegar pero lenta al guardar; doble-click ejecuta
la operación dos veces y el usuario queda sin feedback intermedio. La
infraestructura ya existía (`usePendingActions`, `Button.loading`,
`runOptimistic`, `SkeletonList`) pero no estaba conectada en los puntos donde el
gap UX era visible.

## Cómo validar

```powershell
cd frontend
npm run test
npm run build
```

Verificación manual en navegador:
1. Abrir cualquier formulario quick-create (cliente, vehiculo, servicio,
   material, reserva): el botón debe deshabilitarse y mostrar spinner durante
   la respuesta.
2. Mover una reserva entre días: la card muestra pill "Guardando…" hasta que
   responde la API.
3. Cambiar estado de una orden vía menú de acciones rápidas: el ítem del menú
   queda con spinner; la card destino recibe el overlay.
4. Eliminar gasto fijo o revertir pago: aparece modal in-app con botón
   "Eliminar"/"Revertir pago" que pasa a `loading` durante el await.

## Riesgos

- Cambio de tipo en `QuickAction.onSelect` de `() => void` a `() => unknown`
  para aceptar handlers que devuelvan promesas. Es compatible hacia atrás (los
  handlers que retornaban void siguen funcionando).
- `runAction` y `runOptimistic` ahora muestran un toast de éxito "Guardando…"
  intermedio en operaciones lentas; el toast usa el tone `success` y se
  reemplaza por el toast final al terminar.
