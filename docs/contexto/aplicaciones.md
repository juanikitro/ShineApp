# Aplicaciones

## Backend Django

- `customers`: clientes y vehiculos.
- `catalog`: servicios, sectores configurables y catalogo base.
- `scheduling`: agenda diaria, reservas y capacidad.
- `workorders`: ordenes de trabajo y cambios de estado.
- `finance`: pagos, caja diaria y cierres.
- `inventory`: materiales, compras, consumos y herramientas.
- `quotes`: cotizaciones.
- `dashboard`: resumen operativo.
- `notifications`: notificaciones derivadas de eventos del negocio.
- `core`: base comun del backend.

## Frontend Next.js

- `frontend/app/page.tsx`: pagina principal y gran parte de los flujos visibles.
- `frontend/lib/page-support.tsx`: helpers, labels, hooks de motion y soporte compartido del home.
- `frontend/app/globals.css`: entrypoint de estilos.
- `frontend/app/styles/`: partials CSS por superficie para no cargar toda la hoja global en cada cambio.
- `frontend/lib/`: helpers del frontend cuando existan.
- La `Agenda` semanal permite reprogramar reservas entre dias con drag and drop usando el mismo contrato `PATCH /reservations/:id/` del backend; si la validacion rechaza el nuevo dia, el frontend revierte el movimiento y muestra el error.

## Tests visibles

- `backend/tests/test_mvp_flows.py`: regresiones funcionales del MVP y contratos principales entre modulos.
