# SearchSelect: foco de busqueda en desktop

## Alcance

Al abrir un `SearchSelect` mediante click en desktop, el campo `Buscar...` debe
recibir foco para permitir escribir de inmediato. Los dispositivos tactiles no
deben abrir el teclado automaticamente.

## Decision

El componente compartido detecta `matchMedia('(pointer: fine)')` despues de
montar el menu y enfoca el input solo en ese caso. La apertura por flechas
mantiene el foco sobre las opciones para preservar la navegacion existente.

## Validacion

Las pruebas del componente cubren el foco del buscador con puntero fino y la
conservacion del foco en el trigger para puntero tactil.
