# Filtro de tipos de servicio en la landing publica

**Fecha:** 2026-06-03

## Que cambia

El empleador puede controlar desde la configuracion del negocio que tipos de servicios aparecen en la pagina publica de turnos:

- **Mostrar servicios de lavadero** (wash): activa/desactiva los servicios de tipo `wash`
- **Mostrar servicios de detailing**: activa/desactiva los servicios de tipo `detailing`
- Los servicios de tipo `combo` solo se muestran cuando ambos estan activados

Por defecto ambos estan activados, lo que preserva el comportamiento anterior.

## Archivos modificados

- `backend/core/models.py`: dos campos nuevos en `BusinessProfile` (`public_show_wash_services`, `public_show_detailing_services`, ambos `BooleanField(default=True)`)
- `backend/core/migrations/0017_businessprofile_public_service_type_filters.py`: migracion
- `backend/notifications/views.py`: `PublicLandingView.get()` filtra `service_type__in` segun los campos del perfil
- `backend/config/views.py`: `BusinessProfileSerializer` expone los nuevos campos
- `frontend/app/components/settings/BusinessSettingsPanel.tsx`: dos checkboxes en la seccion de landing publica
- `backend/tests/test_public_landing_requests.py`: 5 tests nuevos

## Contrato de API

`GET /api/business-profile/` y `PATCH /api/business-profile/` exponen:

```json
{
  "public_show_wash_services": true,
  "public_show_detailing_services": true
}
```

`GET /api/public/landing/<slug>/` aplica el filtro; no expone los campos de configuracion.
