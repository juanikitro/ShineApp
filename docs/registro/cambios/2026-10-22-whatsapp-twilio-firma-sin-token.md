# WhatsApp: rechazo de callbacks Twilio sin token

## Que cambio

El webhook de estados de Twilio rechaza con 403 configuraciones cuyo Auth Token
esta vacio o contiene solo espacios, incluso cuando la firma coincide con ese
valor. Se preserva la verificacion de firmas con credenciales configuradas.
Esto evita que una configuracion incompleta permita falsear estados de entrega.

## Archivos y validacion

- Guard en `backend/whatsapp/views.py` y regresiones en `backend/tests/test_whatsapp.py`.
- Prueba previa: los tres tokens sin contenido devolvian 204 en vez de 403.
- Pruebas focalizadas con SQLite en memoria y proveedores fake/HTTP simulado;
  cubren tambien reintentos, limite de intentos, duplicados e aislamiento de status.
- Alcance y brechas de #282 en `docs/deployment/whatsapp-bidireccional-282.md`.
- Sin activacion, mensajes reales, migraciones ni cambios de datos existentes.
