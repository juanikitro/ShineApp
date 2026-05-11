# Motor de cotizaciones PDF

## Cambio

Las cotizaciones pasan a generar un documento comercial con datos snapshot, codigo publico, validez, impuestos, descuento global, terminos, instrucciones de pago y estado de envio.

## Impacto

- Backend: `BusinessProfile` guarda defaults comerciales para nuevas cotizaciones.
- Backend: `Customer` acepta `tax_id` y `billing_address` como datos fiscales opcionales.
- Backend: `Quote` guarda snapshots de negocio, cliente y vehiculo para que el PDF historico no cambie si luego se edita la ficha base.
- Backend: el calculo queda como subtotal de items, descuento global, base imponible, IVA global y total.
- API: se agregan acciones para marcar enviada y para descargar PDF marcando enviada; la descarga simple no cambia estado.
- Frontend: Configuracion > Negocio expone defaults de cotizacion, el alta incluye una seccion avanzada, y el listado/detalle muestran codigo publico, estado y acciones de envio/PDF.
- PDF: el layout muestra encabezado comercial, datos del cliente y vehiculo, servicios, observaciones, totales, terminos e instrucciones de pago.

## Decision

Se mantiene el modelo actual de cotizaciones y reservas. No se introduce motor de plantillas ni envio externo; el alcance queda en datos comerciales completos, snapshot historico y descarga profesional.

## Validacion esperada

- Crear una cotizacion toma los defaults del negocio y genera `public_code`.
- Editar el negocio despues de crear una cotizacion no altera los datos snapshot de esa cotizacion.
- `draft` se ve como `Sin enviar` y `sent` como `Enviado`.
- `Bajar PDF` no cambia estado.
- `Marcar enviado` y `Bajar y marcar enviado` dejan la cotizacion en `sent` con `sent_at`.

## Correccion visual

El PDF no debe salir como texto plano. El generador usa un layout comercial con encabezado oscuro, acento dorado, logo o fallback de marca, tarjetas de cliente/vehiculo, tabla de servicios, totales destacados, observaciones, terminos e instrucciones de pago.

## Ajuste de render

- El PDF distingue texto plano de markup interno de ReportLab para que no se impriman literales como `<b>Nombre:</b>` o `<br/>`.
- El logo del negocio se normaliza con Pillow cuando es una imagen raster legible; si la marca por defecto es ShineApp usa el PNG raster del frontend y, si no hay imagen legible, cae al fallback de iniciales.
- Los logos PDF/SVG se rasterizan con PyMuPDF antes de insertarse en la cotizacion, para soportar logos comerciales subidos como documentos vectoriales.
- Los datos opcionales no se imprimen cuando estan vacios.
- Descuento global, base imponible e IVA se muestran solo cuando hay descuento o impuesto distinto de cero.
- Observaciones, terminos e instrucciones de pago se omiten por completo si no fueron cargados.
- La composicion visual queda alineada a la paleta clara de ShineApp: fondo gris suave, tarjetas blancas, azul primario, sin franja vertical decorativa.
- El encabezado muestra la marca ShineApp centrada con logo y nombre, manteniendo la empresa de la cotizacion y el codigo comercial en los laterales.
- Las notas cargadas en cada servicio se imprimen como texto secundario debajo del nombre del servicio.
