# Servicios y precios visibles para empleados; sin acciones de escritura

Los empleados ahora pueden ver la seccion de servicios (con precios por tipo de vehiculo)
sin poder crear, editar ni eliminar nada en la aplicacion.

Cambios:
- Backend: `ServiceSerializer` ya no oculta los campos de precio (`base_price`, precios por tipo de vehiculo) para empleados; la proteccion de escritura sigue en `EmployerRequiredForUnsafe`.
- Frontend: la seccion "Servicios" aparece en el nav del empleado y no esta bloqueada por `sectionRequiresEmployer`.
- Frontend: botones "Nuevo servicio", "Editar" e "Inactivar" en `ServicesPanel` solo se renderizan para empleadores.
- Frontend: el menu rapido de servicios oculta las acciones "Dashboard", "Editar" e "Inactivar" para empleados.
- Frontend: `deleteRecordQuickAction` agrega `!canViewEconomy` a la condicion `hidden`, ocultando todos los controles de eliminacion para empleados en toda la aplicacion.
- Tests: `test_employee_cannot_see_vehicle_type_prices` renombrado a `test_employee_can_see_vehicle_type_prices` y actualizado para verificar que los precios esten presentes.
