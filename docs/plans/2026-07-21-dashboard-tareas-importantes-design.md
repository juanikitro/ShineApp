# Tarjeta de tareas importantes en el dashboard

## Objetivo

Dar al operador una lectura inmediata de las tareas que requieren atencion al
entrar al dashboard, sin agregar una fuente de datos, permisos ni acciones de
negocio nuevas.

## Diseno aprobado

El primer bloque operativo del dashboard mostrara una tarjeta compacta, de
proporcion casi cuadrada, titulada **Tareas importantes**. Se ubicara despues de
los avisos temporales de alta y antes de los indicadores economicos.

La tarjeta mostrara hasta tres tareas pendientes. Cada fila incluira el titulo,
la prioridad y la fecha de vencimiento cuando exista. Las tareas se ordenaran
por prioridad (`Alta`, `Media`, `Baja`) y, dentro de cada prioridad, por la fecha
de vencimiento mas proxima; las tareas sin fecha quedaran al final de su grupo.
Una tarea vencida llevara una senal visual de atencion reutilizando los tokens
de riesgo existentes.

El pie incluira el acceso **Ver todas**, que abre la seccion actual de tareas.
No se podran completar, editar ni borrar tareas desde esta tarjeta. Si no hay
tareas pendientes, la tarjeta mostrara un estado compacto que lo confirme y
mantendra el acceso a la seccion de tareas.

En pantallas angostas la card deja de forzar una proporcion cuadrada y se adapta
al ancho de una columna para conservar los titulos y el foco accesible.

## Datos y limites

La tarjeta consume el listado de tareas que la pantalla principal ya carga. No
se modifica el endpoint, el serializer, los permisos ni el contrato de datos;
por lo tanto, respeta el alcance que el backend ya devuelve al usuario activo.

La seleccion se aislara en un helper testeable. El componente reutilizara el
patron `Panel`, los tokens y la navegacion existentes del dashboard.

## Pruebas

- Helper: excluye tareas completadas, ordena prioridad y vencimiento, limita a
  tres y cubre fechas ausentes o vencidas.
- Componente: muestra las tareas seleccionadas, comunica el estado vencido y
  abre la seccion de tareas desde el acceso de la card.

## Riesgos y alcance

- No se modifica el estado de una tarea desde el dashboard, por lo que no se
  introducen efectos sobre recurrencias, asignaciones ni notificaciones.
- La implementacion debe preservar los cambios locales ya presentes en el panel
  de alta guiada y limitarse a los archivos necesarios para esta card.
