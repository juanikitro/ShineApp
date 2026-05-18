# Landing publica y solicitudes

## Contrato

- URL publica frontend: `/publica/<business-slug>`.
- API publica sin auth:
  - `GET /api/public/landing/<slug>/`
  - `POST /api/public/landing/<slug>/requests/`
- API interna employer-only:
  - `GET /api/public-requests/`
  - `GET /api/public-requests/<id>/`
  - `POST /api/public-requests/<id>/archive/`
  - `POST /api/public-requests/<id>/convert/`

## Reglas

- El identificador publico es `BusinessAccount.slug`; no es editable desde el perfil del negocio.
- La landing queda activa por defecto desde `BusinessProfile.public_landing_enabled`.
- La landing muestra servicios activos sin `base_price`.
- La landing no expone disponibilidad real; solo registra fecha y hora preferida.
- Las solicitudes se guardan como `PublicRequest` en estado `pending`.
- El empleador gestiona solicitudes desde `Notificaciones`.
- La conversion crea cliente/vehiculo si el empleador no vincula sugerencias existentes.
- Conversion `booking`: crea `Reservation` pendiente.
- Conversion `quote`: crea `Quote` draft.

## Proteccion v1

- Honeypot `website`.
- Throttle simple por IP: 5 solicitudes por hora.
- Validacion de servicios activos y scoped al negocio.
