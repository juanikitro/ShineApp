# SearchSelect compatible con ModalFrame de Radix

Fecha: 2026-07-23

Problema:
- Tras migrar `ModalFrame` a `@radix-ui/react-dialog`, los menus de
  `SearchSelect` se veian dentro del modal pero sus opciones no recibian clic.

Causa raiz:
- El menu continuaba portandose a `document.body`. Un `Dialog` modal de Radix
  desactiva los punteros fuera de `Dialog.Content`, por lo que las opciones
  visibles quedaban con `pointer-events: none`.

Cambio:
- Cuando el trigger pertenece a un dialogo, `SearchSelect` porta el menu al
  dialogo mas cercano. Fuera de un modal conserva `document.body`, con su
  posicion fija y comportamiento existente de escape del scroll.
- No cambia la API publica ni los valores emitidos por `onChange`.

Validacion:
- `vitest run app/components/ui/ui.test.tsx --maxWorkers=1`: 26 tests verdes,
  incluido el clic de seleccion dentro de `ModalFrame`.
