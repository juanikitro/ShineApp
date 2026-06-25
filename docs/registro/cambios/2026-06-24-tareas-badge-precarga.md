# Precarga del badge de tareas

## Que cambio

- El dataset de tareas ahora se carga como dato compartido del shell al entrar a ShineApp.
- El badge "Tareas" del sidebar muestra pendientes y vencidas sin esperar a abrir el modulo.
- Los refrescos de datos desde otras secciones tambien mantienen sincronizado el conteo del badge.

## Archivos modificados

- `frontend/lib/data-loading.ts`
- `frontend/lib/data-loading.test.mjs`
