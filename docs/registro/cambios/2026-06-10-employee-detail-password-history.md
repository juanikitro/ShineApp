# Detalle de empleado: cambio de contraseña e historial

---
date: 2026-06-10
tags: [auth, usuarios, auditoria]
---

## Cambio

El empleador puede ahora acceder al detalle de cada empleado desde la seccion Usuarios en Configuracion.

### Funcionalidades agregadas

- **Cambiar contraseña**: formulario para establecer nueva contraseña del empleado (minimo 8 caracteres, validado por Django).
- **Historial de acciones**: lista de entradas del audit log filtrada por el empleado, con detalle de campos antes/despues.

### Backend

- `GET /api/auth/employees/<pk>/`: devuelve detalle del empleado (EmployerOnly).
- `PATCH /api/auth/employees/<pk>/`: actualiza `password`, `email` y/o `is_active` del empleado, registra en AuditLog.
- Nuevo serializer `EmployeeUserUpdateSerializer` con validacion de contraseña.
- 3 tests nuevos en `tests/test_auth_security.py` cubriendo: cambio exitoso, contraseña corta rechazada, empleado sin permiso.

### Frontend

- `UsersSettingsPanel` muestra boton "Ver detalle" por empleado.
- Vista de detalle inline con formulario de cambio de contraseña e historial de acciones.
- El historial carga desde `/api/audit-log/?actor=<id>` al abrir el detalle.
