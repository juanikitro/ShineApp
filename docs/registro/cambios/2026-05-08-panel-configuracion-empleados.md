# Panel de configuracion para empleados

## Cambio

Se agrega una seccion `Configuracion` visible solo para usuarios con rol `empleador`.

Desde esa seccion el empleador puede:

- ver la lista de usuarios con rol `empleado`;
- crear nuevos usuarios empleados con usuario, email opcional y contrasena inicial.

## Contrato API

Nuevo endpoint:

- `GET /api/auth/employees/`: lista usuarios del grupo `empleado`.
- `POST /api/auth/employees/`: crea un usuario en el grupo `empleado`.

El endpoint requiere rol empleador. Un empleado recibe `403`.

## Decision

Se mantiene el modelo simple de roles con `django.contrib.auth.models.Group`. No se agrega perfil ni matriz de permisos.

El panel no permite crear empleadores ni editar permisos. Eso queda fuera del alcance para evitar abrir una administracion de usuarios mas grande que el pedido.
