# boton pantalla completa en sidebar

- fecha: 2026-06-23
- tipo: ui
- area: frontend

## que cambia

- agrega un boton de pantalla completa en el footer del sidebar principal
- permite entrar y salir de fullscreen sin salir de la shell actual
- muestra icono y label segun el estado actual del navegador

## criterio

- usa la API nativa de fullscreen del navegador
- si el navegador no la soporta, el boton queda deshabilitado
- si falla el cambio de estado, muestra un toast de error sin romper la app

## impacto visible

- gana espacio operativo sin cambiar rutas ni layout base
- el acceso a pantalla completa queda junto a los controles globales del sidebar
- el comportamiento funciona tanto para entrar como para salir del modo fullscreen

## validacion esperada

- el boton aparece en el footer del sidebar
- cambia de icono al entrar y salir de pantalla completa
- no afecta el toggle de tema ni el colapsado del sidebar
