# Reservas vencidas en dashboard y Agenda

**Estado:** especificacion confirmada el 2026-07-28.

## Problema

Reservas cuya fecha de entrega ya paso pueden seguir abiertas porque el operador
olvido marcar la entrega, registrar el cobro o ambas acciones. Hoy el dashboard
solo sugiere mantener la agenda al dia con una lectura general del periodo y
Agenda no recuerda este backlog al abrirse.

El objetivo es convertir ese olvido en una senal operativa accionable, sin
agregar una notificacion molesta ni mezclar permisos economicos con permisos de
operacion.

## Lenguaje de dominio

El glosario canonico en `CONTEXT.md` define:

- **Fecha limite operativa de una reserva:** ultimo dia acordado para que el
  vehiculo permanezca en el negocio. Usa la fecha de egreso cuando existe y la
  fecha reservada para una reserva de un solo dia.
- **Reserva vencida:** reserva cuya fecha limite operativa ya paso y que todavia
  no fue entregada o no esta totalmente cobrada. Solo deja de estar vencida
  cuando ambas condiciones se cumplen. Las reservas canceladas no participan.

`WorkOrder.estimated_delivery_at` no determina este backlog. La fuente temporal
es la fecha limite operativa de la reserva, porque es la fecha comprometida y
visible en Agenda.

## Regla funcional

Para una reserva no cancelada:

1. La fecha limite es la fecha de egreso si fue informada; de lo contrario, es
   la fecha reservada.
2. La fecha limite debe ser estrictamente anterior al dia local actual del
   negocio. Una reserva con fecha limite hoy todavia no esta vencida.
3. La entrega esta pendiente mientras el estado no sea `delivered`.
4. El cobro esta pendiente cuando la orden asociada conserva saldo mayor que
   cero.
5. La reserva es vencida si la entrega esta pendiente **o** el cobro esta
   pendiente.
6. Una reserva entregada y totalmente cobrada sale del backlog.

El calculo debe ser unico y server-side para que dashboard, Agenda, permisos y
fechas no puedan divergir. Debe reutilizar el mecanismo existente de fecha local
del negocio; no debe reemplazarlo por una fecha UTC.

## Alcance del backlog

El backlog es global al dia actual y no depende del periodo seleccionado en el
dashboard. Una reserva olvidada debe seguir visible aunque pertenezca a un mes
anterior.

El orden canonico es:

1. fecha limite mas antigua;
2. identificador de reserva como desempate estable.

No se aplica un corte historico silencioso.

## Dashboard

La accion conserva el titulo **Mantener la agenda al dia**.

Cuando existen reservas vencidas:

- pasa a ser la accion **Ahora**, por delante de cobranzas generales y deudas;
- adopta tono de atencion;
- muestra el total global;
- muestra una vista previa de las tres reservas mas antiguas;
- ofrece **Ver todas**, que abre el listado completo;
- no depende de que haya trabajos dentro del periodo seleccionado.

La vista previa usa la misma informacion y el mismo orden que el popup. No es
un segundo calculo.

Cuando no existen reservas vencidas, el dashboard comunica que la agenda esta
al dia y conserva el acceso normal a Agenda. No se muestra una alerta vacia.

## Aviso al abrir Agenda

Al entrar en Agenda con backlog visible para el usuario se muestra un toast de
tono **atencion**, no un toast de error:

- titulo: `Tenes N reservas vencidas`;
- descripcion: `Revisalas para completar entregas o cobros pendientes`;
- accion: **Ver**;
- cierre manual disponible;
- cierre automatico aproximado de ocho segundos;
- el temporizador se pausa con hover o foco, como los toasts existentes;
- semantica accesible informativa y no urgente.

El aviso aparece solo la primera vez que Agenda se abre durante la vida de la
pagina actual. Cambiar de modulo y volver no lo repite. Una recarga o una nueva
sesion de la aplicacion permite mostrarlo nuevamente.

El toast se decide despues de que el backlog termino de cargar. Un error de
carga no debe producir ni el recordatorio ni un falso estado "Agenda al dia".

## Popup de reservas vencidas

El toast y **Ver todas** del dashboard abren el mismo popup.

Cada fila muestra:

- cliente;
- vehiculo y patente;
- servicio o servicios;
- fecha limite;
- dias de atraso;
- estado actual;
- senal **Falta entregar** cuando corresponde;
- senal **Falta cobrar** y saldo pendiente cuando el permiso lo permite;
- accion **Cobrar** cuando corresponde y el usuario tiene permiso economico.

La fila completa es un objetivo clickeable. Al seleccionarla:

1. el listado cede lugar al popup existente de la reserva;
2. la reserva abre directamente en modo edicion;
3. no se apilan dos dialogos interactivos;
4. el formulario debe cargarse completo, con sus opciones de cliente, vehiculo
   y servicios, incluso cuando el origen fue el dashboard.

**Cobrar** reutiliza el modal de pago de la orden asociada. No se duplican
campos ni reglas de pago dentro del formulario de reserva.

## Regreso y actualizacion

Al guardar o cerrar la edicion iniciada desde este flujo:

1. se vuelve al listado de reservas vencidas;
2. el backlog se vuelve a consultar;
3. una reserva que ya esta entregada y totalmente cobrada desaparece;
4. una reserva que conserva cualquiera de los dos pendientes permanece y
   actualiza sus senales;
5. si el backlog queda vacio, el listado se cierra y se comunica
   **Agenda al dia**.

Los conteos y vistas previas del dashboard deben reflejar el mismo resultado
actualizado. No se debe mantener una fila resuelta por estado local obsoleto.

## Permisos

La respuesta debe conservar el scoping por negocio y la proteccion de datos
economicos existente.

### Usuario con permiso economico

- ve todas las reservas vencidas;
- ve si falta entregar, cobrar o ambas;
- ve el saldo pendiente;
- puede usar **Cobrar**;
- puede ver reservas entregadas cuyo unico pendiente sea el cobro.

### Usuario sin permiso economico

- ve reservas vencidas cuya entrega sigue pendiente;
- puede abrir la edicion de la reserva;
- no recibe montos, estado de cobro ni accion **Cobrar**;
- no ve reservas entregadas cuyo unico pendiente sea economico.

Una reserva con ambos pendientes sigue siendo visible para este usuario, pero
solo comunica la parte operativa autorizada.

## Contrato de datos recomendado

Dashboard no carga hoy los datasets completos de reservas y ordenes, mientras
que Agenda si los carga. Para evitar descargar historiales completos o
implementar dos calculos distintos, se recomienda un contrato backend dedicado
y scopeado por negocio para consultar reservas vencidas.

El contrato debe devolver como minimo:

- identificador de reserva;
- datos de identificacion de cliente, vehiculo y servicios;
- fecha limite y dias de atraso;
- estado de reserva;
- indicador de entrega pendiente;
- resumen suficiente para abrir la reserva completa;
- solo con permiso economico: indicador de cobro pendiente, saldo y referencia
  de orden necesaria para cobrar.

El endpoint no debe confiar en filtros enviados por el cliente para el negocio,
la fecha actual, el estado economico ni los permisos. La representacion para un
usuario sin permiso economico debe omitir los campos, no enviarlos ocultos para
que el frontend los descarte.

## Casos de aceptacion

### Regla y bordes

- Egreso ayer, no entregada y sin pago: aparece con ambos pendientes.
- Egreso ayer, entregada y con saldo: aparece solo para usuarios economicos.
- Egreso ayer, pagada pero no entregada: aparece para todos los usuarios de
  Agenda autorizados.
- Egreso ayer, entregada y pagada: no aparece.
- Egreso hoy: no aparece todavia.
- Sin egreso, fecha reservada ayer y no entregada: aparece.
- Cancelada con fecha antigua: no aparece.
- Pago parcial: continua pendiente de cobro.
- Saldo cero: el cobro esta resuelto.
- Varias reservas con la misma fecha: conservan un orden estable.
- Una reserva de otro negocio nunca aparece.

### Dashboard

- Con vencidas, **Mantener la agenda al dia** queda en **Ahora**.
- La vista previa muestra como maximo tres y respeta el orden canonico.
- **Ver todas** abre el listado completo.
- Cambiar el periodo del dashboard no cambia el backlog global.
- Sin vencidas, se comunica que Agenda esta al dia.

### Agenda y toast

- Entrar con vencidas muestra un unico toast de atencion.
- Volver a Agenda en la misma vida de pagina no lo repite.
- Recargar permite mostrarlo nuevamente.
- **Ver** abre el popup.
- Sin vencidas no aparece.
- Si falla la carga, no se afirma que Agenda esta al dia.

### Popup y acciones

- Click en una fila abre la reserva en modo edicion.
- **Cobrar** abre el modal de pago existente.
- Un usuario sin permiso economico no ve montos, cobros ni casos solo
  economicos.
- Cerrar o guardar la edicion vuelve al listado actualizado.
- Resolver ambos pendientes elimina la fila.
- Resolver solo uno conserva la fila con la senal restante.
- Resolver la ultima fila cierra el listado y comunica **Agenda al dia**.

## Fuera de alcance

- Cambiar automaticamente el estado de una reserva por el paso del tiempo.
- Registrar cobros automaticamente fuera de la configuracion ya existente.
- Reemplazar el flujo actual de pago.
- Usar `estimated_delivery_at` como fecha limite de este backlog.
- Emails, push, WhatsApp o recordatorios persistentes.
- Una bandeja historica de avisos vistos o descartados.
- Cambiar permisos economicos existentes.
- Redisenar Agenda o el dashboard fuera de estas superficies.

## Validacion esperada para una implementacion futura

- Tests backend focalizados para regla temporal, estados, saldos, permisos,
  scoping por negocio y orden.
- Tests frontend focalizados para prioridad del dashboard, limite de tres,
  toast una vez por vida de pagina, apertura del popup, permisos y
  navegacion listado-edicion-listado.
- Pruebas de componentes para estados vacio, error y backlog resuelto.
- Sin suites completas, coverage global ni build salvo autorizacion explicita.
