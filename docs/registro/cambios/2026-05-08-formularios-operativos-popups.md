# Formularios operativos en popups

## Contexto

Varias secciones operativas usaban una columna fija para altas o registros. En pantallas con mucha informacion eso reducia el ancho util de listas, metricas y tarjetas.

## Cambio

- Servicios, caja, deudas, materiales, herramientas y configuracion reemplazan formularios visibles por botones de accion.
- Los botones abren formularios en popups reutilizando el patron modal existente.
- Las listas quedan en una sola columna de contenido y mantienen sus acciones de edicion en el detalle.
- Los formularios principales conservan foco inicial y avance logico de campos cuando aplica.

## Decisiones

- No se cambiaron endpoints ni validaciones backend.
- La edicion de registros existentes sigue usando `DetailModal`.
- No se agregaron rutas ni se redisenio el shell.
