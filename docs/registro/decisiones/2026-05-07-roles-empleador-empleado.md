# Roles empleador/empleado

## Contexto

ShineApp usa autenticacion DRF con token y session. El producto necesita dos roles fijos:

- `empleador`: acceso completo, incluida informacion economica.
- `empleado`: acceso operativo sin economia.

Economia incluye pagos, caja, deudas, cotizaciones, materiales, herramientas, costos, importes, saldos, precios y resumenes financieros.

## Decision

Se usan grupos nativos de Django (`django.contrib.auth.models.Group`) como rol simple. No se agrega perfil ni matriz de permisos porque el dominio actual solo requiere dos roles cerrados.

El backend es la fuente de seguridad:

- `/api/auth/login/` y `/api/auth/me/` exponen `role` y `can_view_economy`.
- Los endpoints economicos se bloquean con permiso DRF para usuarios sin acceso economico.
- Los serializers mixtos remueven campos monetarios cuando el request no puede ver economia.

El frontend usa `can_view_economy` solo para reducir exposicion visual:

- oculta secciones economicas;
- evita cargar endpoints economicos;
- oculta metricas y acciones de cobro, materiales y cotizaciones.
- mantiene `Dashboard` visible para todos, mostrando a empleados solo informacion operativa no economica como avisos de cumpleanos.

## Superficie bloqueada para empleado

- Pagos y caja.
- Metricas financieras del dashboard.
- Cotizaciones.
- Materiales, compras, consumos y unidades abiertas.
- Herramientas.
- Deudas y pagos de deuda.
- Historial economico de clientes y vehiculos.
- Escritura de servicios, porque editar servicios implica precio base.

## Validacion esperada

- Un empleado recibe `403` al llamar endpoints economicos directos.
- Un empleado puede seguir usando clientes, vehiculos, agenda, reservas y trabajos.
- Un empleado puede ver avisos de cumpleanos en dashboard.
- Las respuestas operativas de empleado no exponen `base_price`, `total_amount`, `paid_amount`, `balance_due` ni `material_cost`.
- Un empleador mantiene el flujo completo.
