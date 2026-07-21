# Siguiente accion con tareas importantes

## Cambios

- El bloque inicial **Siguiente accion** ahora contiene dos cards opacas en
  columnas: el mejor paso sugerido y las tareas importantes.
- La card de tareas reutiliza `RecordCard`, por lo que toma la misma superficie,
  borde y elevacion que el resto de las cards del dashboard.
- En movil las dos cards se apilan sin perder las acciones de cobro ni de ver
  todas las tareas.

## Alcance

- Se conserva el selector de hasta tres tareas, sus prioridades, vencimientos,
  estado vacio y navegacion a Tareas.
- El panel permanece al inicio del dashboard para no ocultar tareas cuando no
  hay actividad economica en el periodo.
- No cambia endpoints, permisos, contratos de datos ni logica de negocio.

## Validacion

- Prueba focalizada de la card ajustada para comprobar la jerarquia accesible
  `h3` dentro de Siguiente accion.
- La ejecucion local de Vitest requiere dependencias que la worktree limpia no
  tiene; el PR valida el cambio con la suite de frontend y su build.
