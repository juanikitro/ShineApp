# Plan de implementacion: caja continua

1. Agregar `use_cash_closures=False` a `BusinessProfile` y crear la migracion.
   Exponerlo en `BusinessProfileSerializer` para el endpoint existente de
   configuracion por negocio.
2. Incorporar la preferencia al estado, payload y tests del formulario de
   perfil del frontend. Mostrar un `Toggle` accesible en
   `Configuracion > Caja` y persistirlo con el guardado existente.
3. Centralizar en `finance.cash` la comprobacion de si los cierres estan
   habilitados para un negocio. Hacer que `is_cash_day_closed` y sus guards
   solo sean bloqueantes cuando esa politica esta activa.
4. Evitar `sync_past_cash_closures` en caja continua y devolver desde las
   vistas diarias el estado efectivo abierto, sin snapshot operativo expuesto.
   Mantener sin cambios los endpoints de cerrar y reabrir.
5. Pasar la preferencia al `CashPanel`; en caja continua ocultar el badge de
   estado, cerrar dia, reabrir caja, ajuste de cierre y texto de snapshot.
6. Ajustar los tests actuales de cierre para activar la preferencia. Agregar
   regresiones backend para caja continua y tests focalizados de payload y
   componentes frontend.
7. Actualizar la documentacion de contrato, regenerar indices con
   `py -3 scripts/check_docs.py --write --skip-build`, revisar el diff y correr
   pruebas focalizadas secuenciales.
