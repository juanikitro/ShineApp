# ModalFrame: Dialog accesible con guard de cambios

Fecha: 2026-07-21

Cambio:
- `ModalFrame` usa `@radix-ui/react-dialog` sin estilos y conserva su API,
  clases CSS, presencia Motion y confirmacion de cambios sin guardar.
- Radix gestiona foco, scroll lock, retorno de foco, semantica modal y dismiss;
  `onCloseAutoFocus` conserva el retorno al elemento activo porque el wrapper
  no expone un `Dialog.Trigger`. Escape y pointer exterior se redirigen al guard
  antes de ejecutar `onClose`.
- La confirmacion continua con el `alertdialog` local, sin agregar
  `@radix-ui/react-alert-dialog`.

Validacion:
- Se actualizaron los tests focalizados de `ModalFrame` para Dialog, cierre
  exterior, retorno de foco y el flujo sucio; su ejecucion queda pendiente del
  entorno que pueda cargar Vitest.
