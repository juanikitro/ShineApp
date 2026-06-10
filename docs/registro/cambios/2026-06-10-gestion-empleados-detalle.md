# Gestión de empleados: detalle, toggle activo y cambio de contraseña

## Qué cambió

El panel de Configuración > Empleados ahora permite al empleador gestionar cada empleado individualmente:

- Hacer clic en "Editar" abre la vista de detalle del empleado con su nombre, email y estado.
- El botón "Activar" / "Desactivar" hace PATCH al endpoint `/api/auth/employees/<pk>/` con `is_active`.
- El formulario de cambio de contraseña incluye un campo de confirmación; si las contraseñas no coinciden, muestra un error inline sin llamar a la API.
- El historial de acciones del empleado (registros de auditoría filtrados por `entity_type=User&entity_id=<pk>`) se carga al seleccionar al empleado, con estado de carga y mensaje de error si falla.
- Al navegar a otra sección de configuración, la selección del empleado se resetea automáticamente.

## Seguridad

Al cambiar la contraseña de un empleado via PATCH, el backend elimina el token activo del empleado dentro de la misma transacción, forzando una nueva sesión.

## Componentes afectados

- `backend/config/views.py`: `EmployeeUserUpdateSerializer` + `EmployeeUserDetailView` (GET + PATCH)
- `backend/config/urls.py`: ruta `api/auth/employees/<int:pk>/`
- `backend/core/views.py`: filtros `entity_type`/`entity_id` en `AuditLogView`
- `frontend/app/page.tsx`: estado y handlers de gestión de empleados
- `frontend/app/components/settings/SettingsWorkspace.tsx`: vista de detalle en `UsersSettingsPanel`
- `frontend/app/components/ui/AuditLogCard.tsx`: componente extraído (reutilizado en `HistorySettingsPanel`)
- `frontend/app/styles/shell.css`: clases `employee-detail-section`, `employee-detail-heading`, `employee-password-error`
