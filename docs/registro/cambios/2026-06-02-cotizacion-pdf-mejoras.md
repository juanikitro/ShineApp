# Cotizacion PDF: logo sin overlap, marca de agua ShineApp y soporte emoji

## Cambio

Tres mejoras al generador de PDF de cotizaciones (`backend/quotes/pdf.py`):

### 1. Logo del negocio sin superposicion

El logo cargado por el negocio ahora se limita a 24×18 mm antes de insertarse en la tabla del encabezado. Antes, `logo_flowable` usaba un maximo de 32 mm de ancho independientemente del ancho real de la columna (24 mm), lo que causaba que logos horizontales se superpusieran con el nombre y los datos del negocio. La firma de `logo_flowable` y `fallback_logo` acepta ahora `max_width`/`max_height` opcionales.

### 2. Marca de agua ShineApp en esquina inferior derecha

- El bloque central del encabezado (logo + nombre "ShineApp") fue eliminado del header.
- El header pasa de tres columnas `[70, 40, 70] mm` a dos columnas `[86, 94] mm`, con mas espacio para el logo del negocio y el codigo de cotizacion.
- En su lugar, cada pagina renderiza via canvas una marca de agua discreta en la esquina inferior derecha: logotipo ShineApp (variante dark, 5 mm) seguido del texto "ShineApp" en azul oscuro con 45 % de opacidad.
- El numero de pagina pasa al lado izquierdo del pie.

### 3. Soporte de emojis

- Al cargar el modulo, `_setup_unicode_font()` busca en rutas comunes de Linux/Windows una fuente TTF con cobertura Unicode amplia (NotoSans, DejaVu Sans, Arial Unicode MS). Si la encuentra, la registra y la usa en los estilos `body`, `small` y `service_note`.
- Si no hay fuente Unicode disponible (por ejemplo, en el entorno de desarrollo Windows sin fonts instalados), los caracteres emoji (codepoint > U+00FF) se eliminan del icono del servicio antes de pasarlos a Helvetica, evitando cuadros negros o errores de rendering.
- En produccion Docker con `fonts-noto` o `fonts-dejavu-core` instalados, los emojis se renderizan directamente.

## Alcance

- Solo `backend/quotes/pdf.py`. Sin cambios en endpoints, modelos, migraciones ni frontend.
- Los tests existentes de PDF siguen pasando: "ShineApp" sigue apareciendo (ahora via canvas watermark) y las imagenes embebidas tambien.

## Validacion

- Smoke test local con quote sintetico: PDF de 13 KB generado correctamente, imagen embebida presente, texto "ShineApp" y "Pagina" extraibles con PyMuPDF.
- Para emojis en Docker: instalar `fonts-noto` o `fonts-dejavu-core` activa el path Unicode automaticamente.
