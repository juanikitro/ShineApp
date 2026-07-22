# Siguiente accion: ahora y despues

## Cambios

- La card izquierda de **Siguiente accion** ahora separa la prioridad principal
  bajo **Ahora** de hasta dos acciones posteriores bajo **Despues**.
- Las acciones se ordenan como cobro pendiente, deudas vencidas y agenda; cada
  fila abre su destino operativo sin salir primero del dashboard.
- Las tareas importantes siguen en su propia card opaca a la derecha, por lo
  que la grilla de dos columnas conserva sus dos tipos de seguimiento.

## Limites

- No cambian endpoints, permisos, contratos de datos ni calculos del dashboard.
- La vista movil mantiene las cards apiladas y las filas posteriores tienen
  foco visible y ancho completo para tocarse con facilidad.

## Validacion

- Se agregan pruebas focalizadas para el orden de prioridades y la navegacion a
  Deudas desde una accion posterior.
