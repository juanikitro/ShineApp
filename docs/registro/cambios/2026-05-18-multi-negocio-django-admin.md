# Multi-negocio desde Django admin

## Cambio

ShineApp ahora soporta varios negocios conviviendo en la misma web y la misma base de datos.

Se agrega `core.BusinessAccount` como tenant. Cada usuario operativo pertenece a un negocio mediante `core.UserProfile.business`, y cada negocio tiene un `core.BusinessProfile` 1 a 1 con su configuracion comercial y operativa.

## Admin

El superadmin interno administra los negocios desde Django admin:

- crea `BusinessAccount`;
- carga un empleador inicial en el alta guiada;
- edita el `BusinessProfile` como inline del negocio;
- suspende/reactiva negocios sin borrar datos.

Los empleadores y empleados no son staff ni superusuarios. La API de login rechaza usuarios staff/superuser para que el superadmin use solo Django admin.

## Aislamiento de datos

Los modelos operativos principales tienen `business` y las APIs filtran por el negocio del usuario autenticado. El frontend no envia ni decide el tenant.

El scoping cubre clientes, vehiculos, servicios, capacidades, reservas, ordenes, pagos, caja, deudas, inventario, cotizaciones y auditoria.

Las unicidades que antes eran globales pasan a ser por negocio cuando corresponde:

- patente de vehiculo;
- SKU de material;
- capacidad diaria;
- cierre de caja diario.

`Quote.public_code` se mantiene unico global.

## Baja de negocio

Suspender un negocio:

- marca `BusinessAccount.is_active = False`;
- conserva todos los datos;
- invalida tokens existentes de sus usuarios;
- bloquea nuevos logins y uso de API.

La suscripcion no participa de esta regla.
