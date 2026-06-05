# Turnera: tab propia en Configuracion

## Cambio

`Configuracion` suma una nueva pestaña llamada `Turnera` (icono `Globe`) entre `Negocio` y `Cotizaciones`. Los controles de la pagina publica que vivian dentro del panel `Negocio` se mueven completos al nuevo panel.

## Estado

- Nuevo componente: `frontend/app/components/settings/TurneraSettingsPanel.tsx`.
- `BusinessSettingsPanel` deja de recibir `businessSlug` y pierde el bloque `landing-config` y sus flags derivados (`publicLandingUrl`, `showWashServices`, `showDetailingServices`).
- `SettingsWorkspace` agrega la rama `settingsSection === 'turnera'` y propaga `businessSlug` al nuevo panel.
- `page.tsx` extiende el union `SettingsSection` y el array `settingsSectionOptions` con la entrada `{ value: 'turnera', label: 'Turnera', icon: Globe }`.

## Campos en Turnera

- URL publica (read-only).
- Landing publica activa.
- Recibir pedidos de turno.
- Recibir pedidos de cotizacion.
- Mostrar servicios de lavadero.
- Mostrar servicios de detailing.
- Texto corto para la landing.
- Apertura y Cierre.

El submit dispara el mismo handler `onSaveBusinessProfile` ya existente, con un `form id` propio `settings-turnera-form` para que el boton "Guardar turnera" del panel-head asocie correctamente.

## Notas

- Las pildoras de estado (`Landing activa`, `Turnos abiertos`, `Cotizaciones abiertas`) siguen en `Negocio` como vista rapida del estado.
- No cambia ningun contrato de API ni payload. Solo es reorganizacion de UI.
- La clase CSS `.landing-config` se conserva, ahora consumida por `TurneraSettingsPanel`.

## Criterio

`Negocio` queda enfocado en identidad comercial (logo, nombre, CUIT, contacto, direccion). `Turnera` agrupa todo lo que define como se ve y opera la pagina publica de pedidos. La separacion reduce el alto del panel `Negocio` y vuelve la configuracion publica mas facil de encontrar.
