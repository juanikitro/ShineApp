# Clientes: cumpleanos del 29/02 y fechas limite de la alerta

## Cambio

- Un cliente con cumpleanos `29/02` recibe la alerta interna el `28/02` en anios
  no bisiestos. Antes `next_birthday` saltaba al siguiente anio bisiesto, asi que
  el aviso solo aparecia una vez cada cuatro anios.
- `birthday_label` sigue mostrando `29/02`; solo cambia la fecha derivada
  `next_birthday` / `days_until_birthday`.
- `days_until_birthday` calcula el dia local una sola vez por evaluacion (evita
  inconsistencias si la evaluacion cruza la medianoche).

## Contrato vigente (sin cambios)

- `GET /api/customers/birthdays/?days=N` (default 3) y `birthday_alerts` del
  dashboard (ventana fija de 3 dias) incluyen solo clientes activos del negocio
  con dia y mes cargados, entre hoy y hoy+N, segun el dia local de
  `TIME_ZONE` (por defecto `America/Argentina/Buenos_Aires`).
- La ventana cruza fin de anio (30/12 incluye un cumpleanos del 01/01).
- Datos incompletos (solo dia o solo mes, posibles solo como datos legados porque
  el serializer exige ambos) se ignoran sin error.
- Es solo alerta interna para el operador: no hay envio a clientes ni al
  operador por email/WhatsApp. Canal, destinatario, frecuencia y consentimiento
  siguen pendientes de decision humana en el issue #280.

## Validacion

- `backend/tests/test_customer_birthdays.py`: fin de anio, 29/02 en anio bisiesto
  y no bisiesto, fecha incompleta, ventana vacia y dia local vs UTC.
