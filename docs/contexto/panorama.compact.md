# Panorama

ShineApp = plataforma web para negocios de servicio vehicular con rubros configurables
via Sectores (lavadero, detailing, lubricentro, etc.); cada sector tiene agenda,
capacidad y visibilidad publica independiente.

Capacidades visibles en el repo:
- clientes y vehiculos,
- catalogo de servicios agrupados por sector,
- reservas y agenda diaria (por sector o todos en paralelo),
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
- SQLite fallback local del backend,
- ReportLab para PDF,
- SMTP configurable en backend.

Puntos practicos para asistentes:
- backend = fuente de verdad funcional,
- frontend consume API; superficie hoy compacta,
- muchas tareas van a tocar ambos lados si cambia un flujo visible.
