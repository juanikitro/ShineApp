# Tipo de vehiculo "Camion"

## Cambio

Se agrega `Camion` como tipo de vehiculo soportado, al final del orden existente: moto, auto, camioneta, combi, camion.

Backend:
- `core.models.VehicleType` suma `CAMION = "camion", "Camion"`. Es la fuente unica de choices para `customers.Vehicle.vehicle_type` y `notifications.PublicRequest.vehicle_type`.
- `catalog.models.Service` suma el campo `price_camion` (DecimalField nullable) y `price_for` lo mapea a `VehicleType.CAMION`, con el mismo fallback a `base_price` que el resto.
- `catalog.serializers.PRICE_BY_TYPE_FIELDS` incluye `price_camion`, asi queda expuesto y gateado por `EconomyFieldsMixin` igual que los otros precios por tipo.
- Migraciones: `catalog/0005_service_price_camion` (AddField), `customers/0008_alter_vehicle_vehicle_type` y `notifications/0003_alter_publicrequest_vehicle_type` (AlterField solo de choices, `max_length=20` ya alcanza). Son compatibles hacia atras: columna nueva nullable y ampliacion de choices; los datos existentes siguen validos.

Frontend:
- `frontend/lib/service-pricing.ts` agrega `{ value: 'camion', label: 'Camion', priceField: 'price_camion' }` a `VEHICLE_TYPES`. De ahi se derivan `VEHICLE_TYPE_OPTIONS`, `VEHICLE_TYPE_PRICE_FIELDS` y `serviceDetailPayloadFields`, asi que el selector de tipo (alta de vehiculo, edicion, alta rapida, landing publica) y el form de precios por tipo de servicio quedan cubiertos automaticamente.
- `frontend/app/page.tsx`: los formularios en blanco de servicio inicializan tambien `price_camion: ''`.

## Criterio

El tipo de vehiculo ya estaba centralizado y validado por choices en DRF, asi que agregarlo solo en el front habria hecho fallar el alta de vehiculos (`vehicle_type='camion'` rechazado). El precio por tipo se agrega por coherencia: sin `price_camion` un camion siempre caeria silenciosamente a `base_price`. Se respeto el patron existente (un campo `price_<tipo>` por tipo, derivacion dinamica en el front) en vez de listar tipos a mano. Cubierto por `backend/tests/test_vehicle_type_pricing.py`, `backend/tests/test_mvp_flows.py` (gating de empleado) y `frontend/lib/service-pricing.test.mjs`.
