# WhatsApp gratis: feedback accionable

## Cambio visible

En modo gratis (`wa.me`), las acciones de WhatsApp que no se pueden completar
por falta de teléfono o de mensaje configurado permanecen visibles y explican
el requisito pendiente. Aplica a cotizaciones, agenda/turnos, trabajos y ficha
de cliente.

Al abrir WhatsApp, la aplicación confirma el destinatario y recuerda que el
envío se confirma desde la sesión del operador. Si el navegador bloquea la
ventana o no se puede registrar la apertura en el historial, se informa una
acción concreta sin ocultar que el mensaje no quedó registrado.

## Alcance

- No cambia el modo pago, proveedores, credenciales ni la configuración del
  canal.
- Abrir `wa.me` no equivale a entrega o lectura del mensaje.
- Se conserva el registro no bloqueante de aperturas en el historial.

## Validación

- Tests focalizados del helper de disponibilidad de acciones `wa.me`, incluidos
  los modos pago/gratis, teléfono faltante, template faltante y acción lista.
