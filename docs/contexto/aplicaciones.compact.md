# Aplicaciones

## Backend Django

- `customers`: clientes y vehiculos.
- `catalog`: servicios, sectores configurables y catalogo base.
- `scheduling`: agenda diaria, reservas, capacidad.
- `workorders`: ordenes de trabajo, estados.
- `finance`: pagos, caja diaria, cierres.
- `inventory`: materiales, compras, consumos, herramientas.
- `quotes`: cotizaciones.
- `dashboard`: resumen operativo.
- `notifications`: notificaciones por eventos de negocio.
- `core`: base comun backend.

## Frontend Next.js

- `frontend/app/page.tsx`: pagina principal y muchos flujos visibles.
- `frontend/lib/page-support.tsx`: helpers, labels, hooks motion, soporte compartido home.
- `frontend/app/globals.css`: entrypoint estilos.
- `frontend/app/styles/`: partials CSS por superficie; evita tocar global completa en cada cambio.
- `frontend/lib/`: helpers frontend si existen.
- `Agenda` semanal reprograma reservas entre dias con drag and drop usando mismo contrato backend `PATCH /reservations/:id/`; si validacion rechaza nuevo dia, frontend revierte movimiento y muestra error.

## Tests visibles

- `backend/tests/test_mvp_flows.py`: regresiones funcionales MVP y contratos principales entre modulos.
