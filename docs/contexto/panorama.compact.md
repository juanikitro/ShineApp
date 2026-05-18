# Panorama

ShineApp = MVP web para negocios de car detailing, lavado y estetica vehicular.

Capacidades visibles en el repo:
- clientes y vehiculos,
- catalogo de servicios,
- reservas y agenda diaria,
- ordenes de trabajo,
- pagos y caja,
- materiales, compras y consumos,
- cotizaciones,
- dashboard,
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
