# Botones con titulos de hover

## Cambio

La UI principal muestra un tooltip visual custom en botones al hacer hover o foco de teclado. El tooltip reemplaza el `title` nativo del navegador para permitir una superficie oscura con flecha, sombra y animacion breve.

La resolucion prioriza:
- `title` declarado explicitamente.
- `aria-label`, especialmente en botones solo icono.
- texto visible del boton.
- fallback breve para botones tipo card o textos largos: `Ver detalle`.

Los botones agregados dinamicamente por modales, toasts, selectores o cambios de vista quedan cubiertos por el mismo helper.

Actualizacion:
- El helper guarda el texto en `data-hover-title`, elimina el `title` nativo para evitar tooltips duplicados y renderiza una unica burbuja global.
- La burbuja se posiciona automaticamente arriba o abajo del boton segun el espacio disponible.
- La animacion usa opacity, translate y scale con los tokens de motion existentes, y respeta `prefers-reduced-motion`.
- La aparicion del tooltip tiene una espera de 1 segundo para evitar ruido en recorridos rapidos del cursor.
- En el sidebar expandido no se muestran tooltips de navegacion; se mantienen en modo oscuro y perfil, y vuelven para la navegacion cuando el sidebar esta colapsado.
- Los selectores buscables no generan tooltips `Abrir selector`.
- Los textos de accion demasiado genericos se enriquecen con contexto cuando es posible, por ejemplo `Crear reserva para el dia seleccionado`.
- Los dias de agenda usan fecha completa como tooltip y label accesible, manteniendo el texto corto solo como display visual.

## Criterio

ShineApp todavia usa muchos `<button>` directos en la pantalla principal, no una primitive unica. Por eso se centralizo el comportamiento en un hook progresivo en vez de editar manualmente cada boton y duplicar logica. El cambio no altera layout, endpoints ni acciones existentes.
