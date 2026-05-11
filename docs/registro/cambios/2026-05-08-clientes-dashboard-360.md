# Clientes con dashboard 360

## Cambio

El dashboard de cliente ahora resume mejor la operacion diaria sin abrir otra pantalla:

- ultima visita con dias transcurridos,
- ultimo servicio y ultimo vehiculo atendido,
- ticket promedio,
- promedio de dias entre visitas,
- cantidad de trabajos con saldo pendiente,
- cantidad de cotizaciones abiertas y total historico,
- proxima reserva del cliente,
- servicio, vehiculo y marca mas recurrentes,
- listado de reservas futuras,
- listado de cotizaciones recientes.

## Contrato tecnico

`GET /api/customers/{id}/history/` suma estos campos:

- `insights`
- `upcoming_reservations`
- `recent_quotes`

`insights` consolida senales derivadas sobre recurrencia, cobranza, agenda y conversion comercial. No crea modelos nuevos ni cambia permisos: el endpoint sigue siendo solo para usuarios con `can_view_economy`.

## Validacion esperada

- El dashboard de cliente muestra una ficha de estado con contexto rapido antes de atender, cobrar o vender.
- Si no hay trabajos, reservas o cotizaciones, la UI muestra vacios explicitos en vez de inferir datos.
- Las fechas visibles del dashboard se renderizan en formato local `dd/mm/yyyy` aunque el backend envie ISO datetime.
- Los rankings se muestran como listas unificadas por panel, con filas consecutivas y prefijo de posicion.
- El build del frontend sigue pasando y el contrato backend queda cubierto por tests de `customer-history`.
