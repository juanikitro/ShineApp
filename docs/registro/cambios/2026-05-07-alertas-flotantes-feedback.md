# Alertas flotantes de feedback operativo

## Contexto

El frontend mostraba errores como bloques inline dentro del layout y los exitos de guardado quedaban implicitos en un pulso visual sobre el registro afectado. Eso no alcanzaba para confirmar de forma clara altas, ediciones y acciones operativas.

## Cambio

- Las notificaciones pasan a un toast flotante con icono, sombra y animacion de entrada.
- Los errores conservan titulo, descripcion y hasta tres campos afectados.
- Las altas, ediciones, bajas/inactivaciones, cambios de estado, movimientos de agenda y descargas relevantes muestran un mensaje de exito.
- El pulso sobre registros o campos se mantiene como refuerzo contextual cuando existe un destino visual.

## Decisiones

- Se mantuvo el feedback en `frontend/app/page.tsx` porque el flujo actual de acciones vive ahi.
- Los estilos viven en `frontend/app/globals.css` y usan tokens del tema para respetar claro/oscuro.
- No se cambiaron endpoints ni contratos de API.
