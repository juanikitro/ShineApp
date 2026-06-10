# Panorama

ShineApp es una plataforma web para negocios de servicio vehicular. Nacio como
herramienta para lavaderos y detailing, pero el modelo de datos soporta cualquier
rubro configurable via **Sectores**: cada negocio define sus propios sectores
(lavadero, detailing, lubricentro, taller, etc.) con agenda, capacidad y
visibilidad publica independientes por sector.

Capacidades visibles en el repo:
- clientes y vehiculos,
- catalogo de servicios agrupados por sector,
- reservas y agenda diaria (vista por sector o todos en paralelo),
- ordenes de trabajo,
- pagos y caja,
- materiales, compras y consumos,
- cotizaciones,
- dashboard (desglose por sector),
- notificaciones.

Stack operativo:
- backend Django + DRF,
- frontend Next.js,
- Postgres en Docker,
- SQLite como fallback local del backend,
- ReportLab para PDF,
- SMTP configurable en backend.

Puntos practicos para asistentes:
- el backend concentra la fuente de verdad funcional,
- el frontend consume la API y hoy tiene una superficie relativamente compacta,
- muchas tareas van a tocar ambos lados cuando cambie un flujo visible.
