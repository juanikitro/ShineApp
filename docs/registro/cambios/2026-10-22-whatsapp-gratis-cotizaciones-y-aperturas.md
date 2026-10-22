# WhatsApp gratis: cotizaciones y aperturas repetidas

## Cambio

Las tarjetas de cotizacion conservan visible la accion de WhatsApp gratuito
cuando falta telefono o mensaje, y muestran el requisito asociado al boton.
Los telefonos sin digitos y los templates vacios no habilitan la accion.

Mientras se registra una apertura, repetir la misma accion en esta pantalla no
abre otra ventana ni duplica el registro. La ventana se abre desde el gesto del
operador, sin esperar al servidor. Un error de registro pide revisar historial
y conexion antes de repetir, porque la respuesta puede haberse perdido.

## Alcance

- Se reutiliza la solucion integrada por #286; no se activa API paga.
- La proteccion dura mientras el registro esta pendiente en esta pantalla;
  no garantiza idempotencia entre pestanas o dispositivos.
- Se conserva `wame` como apertura/manual, sin confirmar entrega ni lectura.
- Sin cambios de backend, tenant, permisos, credenciales ni datos reales.

## Validacion

- Tests focalizados del helper de disponibilidad por evento, apertura sincrona,
  popup bloqueado, error del registro y clics repetidos.
- Tests de tarjeta y tablero: accion deshabilitada, razon accesible y handler
  sin ejecucion; se conserva la accion habilitada existente.
- `node node_modules/vitest/vitest.mjs run lib/whatsapp-free.test.mjs lib/contact-links.test.mjs app/components/quotes/QuotesPanel.test.tsx --maxWorkers=1`: 3 archivos, 33 tests OK.
- `py -3 scripts/check_docs.py --check --skip-build` y `git diff --check`: OK.
- La aceptacion de desktop/mobile, teclado y foco en navegador autenticado
  queda pendiente; ver `docs/deployment/whatsapp.md`.
