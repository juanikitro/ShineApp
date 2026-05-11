# Iconos manuales en servicios

## Cambio

Los servicios incorporan un campo opcional `icon` para guardar un emoji o icono corto definido manualmente.

## Impacto

- Backend: `Service` persiste `icon` como texto opcional.
- API: `GET/POST/PATCH /api/services/` expone y acepta `icon`.
- API: los items de reservas y cotizaciones exponen `service_icon` para renderizar el icono junto al nombre del servicio.
- Frontend: alta y edicion de servicios muestran el campo `Icono/emoji` como un disparador directo del picker buscable de emojis Unicode, sin input visible de pegado.
- Frontend: los emojis tematicos de lavadero y detailing viven como una categoria dedicada dentro del picker, junto a categorias como Caras y personas o Naturaleza.
- Frontend: el picker se renderiza como desplegable flotante para no deformar la grilla del modal, y se cierra en captura al clickear fuera para evitar superposiciones persistentes con otros inputs.
- Frontend: la categoria dedicada usa el icono nativo del picker para mantener el mismo hover, color y espaciado que el resto de categorias.
- Frontend: la navegacion de categorias recorta el sprite interno para evitar que se vea la franja azul de la fila activa debajo de los iconos.
- Frontend: la variante visual elegida es inline, por lo que las superficies operativas muestran `icono + nombre` cuando el icono existe y mantienen el nombre limpio cuando esta vacio.
- PDF: la tabla de servicios de la cotizacion antepone el icono al nombre del item cuando el servicio lo tiene configurado.

## Decision

El icono no es obligatorio y no se infiere automaticamente. La app propone sugerencias, pero el usuario decide el valor final por servicio.

El picker usa `emoji-picker-react` como catalogo local buscable y `emojiStyle="native"` para que la renderizacion final sea la del browser, sistema operativo o celular del usuario. Los dedicados se registran como custom emojis estaticos solo para integrarlos en la categoria propia, pero el valor persistido sigue siendo Unicode. No se incorporan GIFs ni assets animados.

## Validacion esperada

- Crear un servicio con icono devuelve `icon` en la respuesta.
- Editar o limpiar el icono actualiza el servicio sin afectar el nombre.
- Crear reserva o cotizacion con ese servicio devuelve `service_icon` en sus items.
- Reservas, cotizaciones y listado de servicios muestran el icono junto al nombre cuando existe.
