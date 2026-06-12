# Turnera: precios mostrados segun el tipo de vehiculo seleccionado

En la turnera publica (`/publica/[slug]`), el precio de cada servicio y el total del
resumen ahora siguen al tipo de vehiculo elegido en el formulario (moto, auto,
camioneta, combi, camion). Antes se mostraba siempre `base_price` aunque la
conversion a reserva ya cobraba por tipo.

Cambios:
- Backend: `PublicLandingServiceSerializer` expone `price_moto`, `price_auto`, `price_camioneta`, `price_combi` y `price_camion` junto a `base_price`, con el mismo gating `show_price` (si el negocio no muestra precios, ningun campo de precio sale en el payload).
- Frontend: `PublicLandingClient` resuelve el precio visible con `servicePriceForVehicleType(service, form.vehicle_type)` (helper existente que espeja `Service.price_for` con fallback a base) en las cards de servicios y en `selectedTotal`.
- Tests backend: `test_public_landing_exposes_price_when_flag_enabled` verifica los precios tipados expuestos y `test_public_landing_is_available_without_auth_and_hides_prices` que siguen ocultos sin el flag.
- Tests frontend: nuevo caso en `PublicLandingClient.test.tsx` que cambia el tipo de vehiculo y verifica precio de card y total (tipo con precio propio, y fallback a base para tipos sin precio).

Sin migraciones ni cambios de contrato para consumidores existentes: solo se agregan campos opcionales al payload publico.
