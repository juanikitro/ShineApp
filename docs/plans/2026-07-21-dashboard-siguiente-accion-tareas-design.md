# Siguiente accion con tareas importantes

## Objetivo

Concentrar las dos prioridades de inicio del operador dentro del bloque
**Siguiente accion**: el mejor paso sugerido por el dashboard y las tareas
pendientes que requieren seguimiento.

## Diseno aprobado

El `Panel` existente conserva su titulo y subtitulo. Su contenido pasa a ser
una grilla de dos columnas equivalentes:

- A la izquierda, una `RecordCard` con el mejor paso actual, por ejemplo
  **Cobrar saldo mas antiguo**, y su accion directa.
- A la derecha, una `RecordCard` opaca titulada **Tareas importantes**, con
  hasta tres pendientes y el acceso **Ver todas**.

En pantallas angostas ambas cards se apilan, primero el mejor paso y luego las
tareas. La tarea mantiene la prioridad, el vencimiento y el estado vacio ya
definidos; no se agregan acciones de edicion ni cambios de datos.

El panel se ubica despues de los avisos de alta y antes de los indicadores
economicos. Asi las tareas siguen visibles aunque el periodo todavia no tenga
actividad economica.

## Direccion visual

- **Intento:** un operador de taller que abre el tablero debe decidir su proximo
  movimiento en segundos, con una lectura calmada y accionable.
- **Paleta:** canvas gris suave, superficie blanca, tinta oscura, azul para
  accion y colores semanticos existentes para prioridad y vencimiento.
- **Profundidad:** bordes sutiles y la elevacion propia de `RecordCard`; no se
  agregan fondos transparentes ni sombras o colores nuevos.
- **Firma:** una cabina de decision de dos carriles bajo un unico titulo:
  cobrar/actuar a la izquierda y organizar seguimiento a la derecha.
- **Tipografia y espaciado:** se reutilizan los niveles de texto, radios y
  escala de espacios de las cards actuales; la tarea es un subtitulo de nivel
  `h3`, subordinado al `h2` del panel.

## Datos y limites

La reubicacion conserva el listado de tareas ya cargado, su selector y la
navegacion actual a Tareas. No cambia endpoints, permisos, contratos ni logica
de negocio. Al permanecer dentro del bloque economico existente, conserva el
alcance de visibilidad actual del dashboard.

## Validacion

- Prueba del componente: jerarquia accesible de la card, tareas seleccionadas,
  vencimiento, estado vacio y acceso a Tareas.
- Prueba focalizada de Vitest sin ejecutarla en paralelo con otros procesos de
  frontend.
- Regeneracion de indices documentales y CI del PR antes del merge.
