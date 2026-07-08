# WhatsApp producción con subaccounts Twilio

> **SUPERADA** por [WhatsApp: Meta Cloud API directo con numero unico de ShineApp](2026-07-07-whatsapp-meta-directo-numero-unico.md). Esta decision asumia Twilio como BSP + subaccounts por cliente; se pivoteo a Meta Cloud API directo con un numero unico de ShineApp cuando Meta levanto el bloqueo de OTP del dueno. Se conserva como historia.

Fecha: 2026-07-06

Decision:
- Modelo de cuentas: cuenta Twilio padre de ShineApp mas un subaccount de Twilio por cliente (hoy: uno, el cliente activo).
- Facturacion: ShineApp paga Twilio con su propia tarjeta desde la cuenta padre. El costo se traslada al cliente como adicional fijo mensual del SaaS con tope de mensajes incluidos (no es pass-through exacto del costo de Twilio).
- Cada subaccount aporta su Account SID, Auth Token y numero emisor a la configuracion del negocio en ShineApp (Configuracion > WhatsApp), sin cambios de codigo ni migraciones adicionales para dar de alta un cliente nuevo.
- El sender de WhatsApp de cada cliente se registra via embedded signup de Twilio contra el Meta Business Manager del cliente, usando el Facebook/rol de administrador del cliente.
- La cuenta de Facebook del dueno de ShineApp nunca se usa para el embedded signup ni para dar de alta senders: tiene supresion de OTPs en Meta por un alta previa fallida.

Razon:
- Evita repetir el bloqueo de Meta (supresion de SMS OTP) que descarto la via Meta Cloud API directo con el Facebook del dueno.
- Subaccounts por cliente aislan credenciales, limites y facturacion de Twilio por negocio sin tocar el modelo de datos existente (`WhatsAppConfig` ya es por-negocio).
- El adicional fijo con tope simplifica la venta y evita exponer el costo variable real de Twilio al cliente.

Scope de esta decision:
- Aplica al unico cliente activo del SaaS hoy. Onboarding de clientes futuros repite el mismo patron: nuevo subaccount mas nuevo alta de sender contra el Meta Business del cliente correspondiente.

Fuera de scope:
- Automatizar la creacion de subaccounts Twilio desde ShineApp (hoy es manual via consola Twilio).
- Automatizar el pass-through de costo real de Twilio al cliente (queda en la facturacion comercial del SaaS, fuera del codigo).
