# Panorama

ShineApp es un MVP web para negocios de car detailing, lavado y estetica vehicular.

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
- SQLite como fallback local del backend,
- ReportLab para PDF,
- SMTP configurable en backend.

Puntos practicos para asistentes:
- el backend concentra la fuente de verdad funcional,
- el frontend consume la API y hoy tiene una superficie relativamente compacta,
- muchas tareas van a tocar ambos lados cuando cambie un flujo visible.
