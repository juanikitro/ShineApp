# SearchSelect: foco de busqueda al abrir en desktop

## Cambio visible

Al abrir un `SearchSelect` mediante click con puntero fino, el campo
`Buscar...` recibe foco para que la persona pueda escribir de inmediato. En
dispositivos tactiles no se enfoca automaticamente, para no abrir el teclado
virtual sin una intencion explicita.

La apertura con teclado conserva el foco y la navegacion previa de opciones;
no cambia los valores disponibles, el contrato del componente ni los datos que
consume cada formulario.

## Validacion

- Pruebas focalizadas de `frontend/app/components/ui/ui.test.tsx` para puntero
  fino, tactil y navegacion de teclado.
