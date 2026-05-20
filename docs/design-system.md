# Sistema De Diseno

## Base Actual Del Repo

Esta guia se basa en el repo actual, no en una suposicion greenfield.

- Framework frontend: Next.js App Router con React 19 y TypeScript.
- Enfoque de estilos: `frontend/app/globals.css` como entrypoint con partials en `frontend/app/styles/`.
- Estructura de componentes: primitives React locales livianas en `frontend/app/components/`, orquestacion de home en `frontend/app/page.tsx` y soporte compartido de home en `frontend/lib/page-support.tsx`.
- Primitives UI reutilizables ya visibles en codigo: `Field`, `StatusPill`, `Empty`, `Modal`, `DetailModal`, `SearchSelect`, `LoginScreen`.
- Patron actual de shell: navegacion lateral mas area de contenido workspace.
- Patron actual de listas: se usan cards y filas de registros mas seguido que tablas densas.
- Capa actual de tokens de diseno: CSS custom properties bajo `:root` con nombres semanticos `--color-*` y nombres de compatibilidad `--shop-*`.
- Modelo actual de temas: tokens claros en `:root`, overrides dark mode acotados a `.app-shell[data-theme='dark']`, con toggle en el sidebar persistido en local storage.
- Breakpoints actuales: `980px` y `620px`.

## Convenciones Actuales Que Vale Preservar

- Mantener los mensajes en español.
- Mantener la app rapida y directa.
- Reutilizar la shell, paneles, registros y patrones de formularios existentes antes de inventar superficies nuevas.
- Preferir clases CSS locales antes que nueva infraestructura de estilos.
- Preservar flujos backend-driven y contratos API actuales.

## Inconsistencias Actuales De Diseno Que No Deben Propagarse

- `frontend/app/globals.css` tiene variables, pero los valores de espaciado y layout siguen mayormente hardcodeados.
- `frontend/app/page.tsx` contiene estilos inline repetidos como `style={{ marginBottom: 12 }}` y `style={{ marginTop: 18 }}`.
- La paleta actual debe seguir la captura de referencia compartida: shell CRM clara, paneles blancos, workspace gris suave, acciones primarias azules y acciones destructivas rojas.
- Existen primitives UI, pero viven en un archivo grande en vez de una capa de componentes mas intencional.
- Hay al menos una rama visual oculta (`hidden-section`), asi que el trabajo futuro de UI debe eliminar o revivir superficies ocultas intencionalmente en vez de acumular mas UI dormida.
- Algunas cadenas en `page.tsx` muestran artefactos de encoding, asi que cualquier pasada de UI debe revisar cuidadosamente el texto renderizado.

## Direccion De Estilo

Objetivo: una superficie SaaS calma, clara y estilo CRM:

- jerarquia fuerte de informacion
- sidebar blanco y superficies superiores blancas
- canvas gris suave de app
- paneles y cards de trabajo blancos
- texto oscuro de alto contraste
- uso contenido del color de marca
- registros compactos pero legibles
- acciones obvias
- comunicacion clara de estados
- superficies integradas con bajo ruido visual

Evitar convertir la app en una pagina de marketing o un ejercicio de diseno brillante.
No volver a una shell dark-first por default. Mantener el diseno dark navy como modo alternativo soportado, no como direccion primaria.
Evitar gradientes brillantes, efectos decorativos de fondo, cards flotantes pesadas y cajas anidadas que fragmenten el workflow.

## Mejor Lugar Para Tokens De Diseno

Usar `frontend/app/styles/tokens.css` como fuente de verdad de tokens, importado desde `frontend/app/globals.css`.

Por que:

- el repo ya usa CSS variables en `:root`
- no hay tema Tailwind para extender
- no hay capa de tema de una libreria de componentes para enganchar
- la app actual importa `globals.css` desde `frontend/app/layout.tsx`
- `globals.css` puede mantenerse chico y delegar con `@import` a partials por superficie

Enfoque recomendado para implementacion futura:

1. Mantener tokens semanticos claros en `frontend/app/styles/tokens.css`.
2. Mantener tokens dark mode acotados a `.app-shell[data-theme='dark']` en el mismo archivo de tokens.
3. Mantener funcionando las variables `--shop-*` existentes como aliases de compatibilidad.
4. Remapear gradualmente la UI tocada hacia aliases semanticos.
5. No dispersar valores hex raw por JSX o clases CSS one-off.

## Estrategia De Tokens

### Tokens Semanticos De Color Requeridos

Documentar estos valores como capa semantica objetivo:

```css
:root {
  --color-primary: #0284C7;
  --color-primary-foreground: #FFFFFF;
  --color-primary-hover: #0369A1;
  --color-secondary: #F3F4F6;
  --color-secondary-foreground: #111827;
  --color-accent: #0EA5E9;
  --color-accent-foreground: #FFFFFF;
  --color-focus-ring: rgba(14, 165, 233, 0.28);
  --color-link: #0284C7;
  --color-link-hover: #0369A1;

  --color-canvas: #F8FAFC;
  --color-canvas-deep: #FFFFFF;
  --color-workspace: #E8ECF1;
  --color-workspace-surface: #FFFFFF;
  --color-workspace-surface-raised: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F8FAFC;
  --color-text: #111827;
  --color-text-soft: #4B5563;
  --color-text-muted: #8B95A1;
  --color-border: rgba(17, 24, 39, 0.10);
  --color-border-strong: rgba(17, 24, 39, 0.16);
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-danger: #E00000;
}
```

### Mapeo De Migracion Para El Stack Actual

Cuando se implemente la paleta, estos son los primeros mapeos mas seguros:

- `--shop-action` -> `--color-primary`
- `--shop-action-strong` -> `--color-primary-hover`
- `--shop-canvas` -> `--color-canvas`
- `--shop-surface` -> `--color-surface`
- `--shop-surface-raised` -> `--color-surface-raised`
- `--shop-ink` -> `--color-text`
- `--shop-ink-soft` -> `--color-text-soft`
- `--shop-ink-muted` -> `--color-text-muted`
- `--shop-border` -> `--color-border`
- `--shop-border-strong` -> `--color-border-strong`

### Estrategia De Temas

La app soporta dos temas:

- Light mode es el default y debe coincidir con la direccion de la captura CRM compartida: sidebar blanco, workspace gris, superficies blancas, texto oscuro, acciones primarias azules y acciones destructivas rojas.
- Dark mode preserva la direccion navy anterior: canvas `#0B2447` / `#071A33`, superficies activas y primarias `#19376D`, texto blanco, metadata celeste palida apagada y `#A5D7E8` para detalles de foco/acento.

Reglas de implementacion:

- Poner valores de tema en CSS variables, no en JSX.
- Acotar overrides dark bajo `.app-shell[data-theme='dark']`.
- Mantener el toggle de sidebar visible en el footer del sidebar como switch pill compacto con thumb movil, no como boton de texto completo.
- Al tocar UI, verificar ambos temas por contraste, legibilidad de dropdowns, focus rings y status badges.
- No duplicar arboles completos de componentes por tema.

## Sistema De Motion

Motion es ahora el runtime unico para animacion de UI con estado en el frontend.

- `motion` controla transiciones enter/exit, reflow de layout, presencia de toast, presencia de modal, swaps direccionales de agenda y pulsos de feedback contextual.
- CSS mantiene solo hover, focus, color, borde, sombra y overflow responsive simples.
- La configuracion canonica vive en `frontend/lib/motion-spec.ts`.
- El runtime global se provee desde `frontend/app/components/motion/AppMotionProvider.tsx` con `MotionConfig` usando `reducedMotion="user"` y `LazyMotion`.

### Tokens De Motion Permitidos

Usar estos tiempos y curvas salvo que se agregue una excepcion documentada en la spec compartida:

- Rapido: `160ms`
- Base: `220ms`
- Vista: `280ms`
- Lento: `380ms`
- Pulso: `880ms`
- Ease estandar: `cubic-bezier(0.22, 1, 0.36, 1)`
- Ease de enfasis: `cubic-bezier(0.16, 1, 0.3, 1)`
- Ease de agenda: `cubic-bezier(0.4, 0, 0.2, 1)`

Replicar las variables de timing del lado CSS en `frontend/app/styles/tokens.css`. No introducir duraciones one-off ni keyframes ad hoc dentro de archivos de componentes.

### Motion Vs CSS

Usar Motion cuando:

- una superficie monta o desmonta
- una lista o card hace reflow porque cambian los datos
- un modal, toast, dropdown o vista workspace necesita manejo de presencia
- la agenda se mueve direccionalmente entre ventanas de fechas
- un registro o campo necesita un pulso de feedback contextual

Usar CSS cuando:

- un boton, input o fila solo cambia color, borde o sombra en hover/focus
- el efecto es estatico y no depende de presencia, secuencia o medicion de layout

### Politica De Reduced Motion

- Respetar el setting del sistema operativo mediante `MotionConfig reducedMotion="user"`.
- Mantener transiciones legibles sin depender de distancias largas de movimiento.
- Retener la guarda CSS repo-wide `prefers-reduced-motion` para transiciones que no son Motion.
- No agregar un segundo switch manual de reduced motion salvo que requisitos de producto lo pidan explicitamente.

### Reglas Especificas De Agenda

- Mantener `@dnd-kit/core` como motor de drag.
- Animar swaps del board de agenda con presencia Motion, no con keyframes CSS de carrusel.
- Preferir animaciones de layout Motion para reflow de cards y cambios de stack.
- Usar una unica variante direccional canonica para navegacion de agenda, para que el movimiento forward/backward sea consistente en Lavado y Detailing.
- No reintroducir frames clonados por timeout ni coreografia de altura medida salvo que una regresion concreta lo fuerce y la excepcion quede documentada.

## Reglas Exactas De Uso De Color

### `#F8FAFC`, `#FFFFFF` Y `#E8ECF1`

Usar para:

- `#FFFFFF`: sidebar, busqueda/controles superiores, cards, modales, dropdowns y paneles principales de trabajo
- `#F8FAFC`: superficies neutras elevadas y estados hover
- `#E8ECF1`: canvas/workspace de app detras de paneles blancos

Usar bordes sutiles y sombras suaves para separar paneles blancos del canvas gris. No usar grandes rellenos oscuros como shell default.

### `#0284C7` / `#0EA5E9`

Usar para:

- botones primarios rellenos
- links importantes
- estados seleccionados
- enfasis de fecha/semana
- acentos de foco y progreso

Usar texto blanco sobre botones azules rellenos, prefiriendo `#0284C7` por contraste y `#0EA5E9` para acentos sin texto. No usar azul en cada elemento decorativo; debe apuntar claramente a la siguiente accion.

### `#E00000`

Usar para:

- acciones de reset
- acciones destructivas
- advertencias de alto riesgo que requieren atencion

Usar texto blanco sobre acciones rojas rellenas. No usar rojo para decoracion de estados normales.

### Paleta Navy Dark Mode

Usar solo para el tema dark alternativo:

- `#0B2447`: canvas navy principal y ancla de marca.
- `#19376D`: navegacion activa, superficies primarias dark, hover states y estados seleccionados.
- `#A5D7E8`: focus rings, acentos sutiles, badges informativos y highlights de bajo volumen.

No usar `#A5D7E8` como body text pequeno en superficies dark o claras sin revisar contraste. Preferir texto blanco o neutro palido para copy importante en dark mode, y usar `#A5D7E8` como senal antes que como texto default.

## Notas De Accesibilidad Y Contraste

Notas de contraste para la direccion clara de referencia:

- `#111827` sobre blanco es seguro para texto primario.
- `#4B5563` sobre blanco es seguro para texto secundario.
- `#8B95A1` debe reservarse para metadata y helper text, no para body copy largo.
- Texto blanco sobre `#0EA5E9` brillante puede ser debil en texto chico; los botones rellenos deben preferir `#0284C7` o mas oscuro.
- Texto blanco sobre `#E00000` es seguro para botones destructivos.
- Los focus rings deben seguir siendo azules y visibles sobre superficies blancas y grises.
- En dark mode, texto blanco sobre `#0B2447` es seguro, pero la metadata muted debe mantenerse lo bastante clara para ser legible.
- `#A5D7E8` funciona bien como color de foco/acento en dark mode, pero no debe convertirse en el color principal del texto.

## Reglas De Layout

Mantener el modelo actual de shell y refinarlo.

- Ancho de sidebar desktop: `240px` a `256px`.
- Padding de pagina workspace: `24px` desktop, `16px` mobile.
- Padding de panel/card: `20px` a `24px`.
- Espaciado de secciones dentro de una pagina: `32px` a `48px`.
- Espaciado ajustado de registros: `12px` a `16px`.
- Mantener una accion primaria principal por panel o cluster de toolbar.

Para la app actual:

- preservar la shell con sidebar mas workspace
- tratar el sidebar como blanco y el workspace como gris suave
- mantener `.workspace` levemente gris, con cards y paneles blancos separados por sombra, espaciado y bordes sutiles
- preservar la seccion por paneles
- no crear una columna dedicada de formulario junto a listas o dashboards; las pantallas primarias deben enfocarse en overview, registros y acciones
- ubicar formularios de creacion/edicion en popups/modales para que el workspace no quede dividido entre una columna permanente de formulario y contenido operativo

## Escala De Espaciado

Usar esta escala:

- `4px`
- `8px`
- `12px`
- `16px`
- `24px`
- `32px`
- `48px`
- `64px`

Reglas:

- usar `8px`, `12px`, `16px` para interiores de componentes
- usar `24px` para ritmo de pagina y padding de cards
- usar `32px` o `48px` entre secciones mayores
- evitar valores one-off nuevos salvo que un borde responsive realmente los necesite

## Jerarquia Tipografica

Mantener por ahora el enfoque actual de system font stack. No agregar una dependencia de fuente solo por estilo.

Jerarquia preferida:

- Titulo de pagina `h1`: `28px`, `700`, margen ajustado
- Titulo de seccion `h2`: `20px`, `650` a `700`
- Titulo de subseccion `h3`: `16px`, `650`
- Body default: `14px` a `16px`, `400` a `500`
- Texto secundario: `13px` a `14px`
- Labels y metadata: `12px`, `600`
- Valor KPI: `24px` a `28px`, `700`

Reglas:

- mantener labels arriba de controles
- evitar labels largos en mayusculas
- usar peso y espaciado antes que color extra
- mantener valores numericos alineados y faciles de escanear
- en superficies claras, apoyarse en espaciado, peso tipografico y bordes grises sutiles antes de agregar decoracion extra

## Reglas De Border Radius

Usar un radio sobrio y marcado por default:

- controles, botones, pills, cards, dropdowns y modales: `2px`
- evitar tags con forma pill `999px` salvo que el usuario pida explicitamente ese tratamiento

Regla practica para este repo:

- mantener `--radius-sm`, `--radius-md` y `--radius-lg` mapeados a `2px` en `frontend/app/globals.css`
- no introducir estilos redondeados one-off como `10px`, `12px` o `999px`
- usar espaciado, contraste de borde y tipografia para jerarquia antes que radio o sombra

## Reglas De Sombra Y Elevacion

Usar elevacion sutil solamente.

Rangos recomendados:

- cards y menus: `0 8px 24px rgba(0, 0, 0, 0.18)`
- dropdowns: `0 12px 28px rgba(0, 0, 0, 0.24)`
- modales: `0 20px 48px rgba(0, 0, 0, 0.32)`

Reglas:

- evitar UI flotante pesada
- nunca apilar multiples sombras decorativas en la misma superficie
- usar bordes primero, sombra despues
- preferir continuidad entre shell y workspace antes que islas de cards aisladas

## Principios De Componentes

- Reutilizar antes de crear.
- Preferir extender la shell actual y las primitives locales existentes.
- Extraer un componente compartido solo cuando aclare comportamiento repetido, no solo markup repetido.
- La consistencia visual importa mas que la novedad.
- Un componente nuevo debe traer una razon clara, nombre estable y estilos basados en tokens.

## Guia De Botones

### Jerarquia De Botones

- Primario: tarea principal de la pantalla o panel.
- Secundario o ghost: acciones de apoyo.
- Danger: acciones destructivas o de alto riesgo solamente.

### Tamanos

- Altura default: `36px` a `40px`
- Accion prioritaria grande/mobile: `44px`
- Icon button: minimo `36px`, mayor si es target tactil mobile

### Reglas

- una accion primaria clara por area local
- combinar icono mas label solo cuando el icono mejora el escaneo
- no ubicar botones primarios y danger con igual peso visual salvo que la decision se fuerce intencionalmente
- estados hover, focus y disabled deben ser visibles
- acciones rellenas default deben usar `#0284C7` con texto blanco
- acciones destructivas/reset deben usar `#E00000` con texto blanco
- acciones secundarias normalmente deben ser blancas o gris claro con texto oscuro

## Guia De Formularios

- No ubicar formularios como columna permanente izquierda/derecha en el workspace principal.
- Usar popups/modales por default para flujos de creacion y edicion.
- Mantener visible la lista, dashboard o agenda subyacente como contexto operativo detras del modal.
- Las pantallas principales pueden mostrar filtros compactos, busqueda, acciones rapidas o resumenes read-only, pero no una columna completa de carga de datos.
- Mantener labels persistentes. No depender de placeholders como labels.
- Usar filas de dos columnas solo cuando los campos esten naturalmente emparejados.
- Colapsar a una columna en pantallas angostas.
- Mantener alineadas las alturas de input y `SearchSelect`.
- Usar helper text o estilo `info-note` para calculos, supuestos o feedback de stock/caja.
- Marcar con claridad decisiones destructivas o irreversibles.
- Los valores default deben reducir tipeo, no ocultar decisiones.

## Guia De Tablas Y Listas

Este repo hoy favorece registros/cards antes que tablas de datos clasicas. Ese es el default hasta que una pantalla demuestre lo contrario.

Usar record cards cuando:

- el item tiene multiples lineas de metadata
- las acciones son por item
- la lista tiene tamano moderado
- el operador necesita reconocimiento mas que escaneo tipo planilla

Usar una tabla real solo cuando:

- muchas filas y columnas necesitan comparacion rapida
- las mismas columnas se repiten en un dataset grande
- las acciones por fila pueden mantenerse compactas sin danar legibilidad

Reglas para listas:

- mantener titulo primero, metadata segundo, acciones al final
- destacar estados consistentemente
- mantener lineas de escaneo cortas
- evitar mezclar mas de dos densidades de texto dentro de un registro
- en pantallas claras, separar filas con superficies blancas, sombras suaves, bordes sutiles y espaciado antes de usar rellenos fuertes de acento

## Guia De Estados Vacios

Todo estado vacio debe responder:

- que esta vacio
- por que importa
- que puede hacer despues el usuario

Usar mensajes calmos. Evitar chistes o relleno decorativo.

## Guia De Estados De Carga

- mantener estable el layout mientras carga
- preferir loaders inline o placeholders tipo skeleton antes que bloquear toda la pagina
- mostrar carga cerca del area afectada cuando sea posible
- no ocultar navegacion o contexto durante cargas locales

## Guia De Estados De Error

- decir que fallo en español claro
- mantener tono operativo
- dar la siguiente accion util cuando sea posible
- no exponer internos tecnicos salvo que la accion realmente lo requiera
- mantener superficies de error legibles sobre fondos claros sin convertirlas en bloques rojos saturados

## Comportamiento Responsive

Usar los breakpoints actuales del repo como baseline default:

- cambio mayor de layout cerca de `980px`
- ajustes mobile angostos cerca de `620px`

Reglas:

- el sidebar puede apilarse arriba del contenido en pantallas menores
- los formularios deben pasar a una columna en mobile
- los clusters de acciones deben wrappear limpiamente
- cards y registros deben preservar targets tactiles legibles
- el scroll horizontal es aceptable solo para contenido claramente acotado, como carriles de agenda cuando haga falta
- la shell CRM clara debe permanecer consistente en mobile; no cambiar a una presentacion dark separada sin razon

## Requisitos De Accesibilidad

- el foco de teclado siempre debe ser visible
- filas interactivas deben soportar comportamiento de teclado, no solo click
- modales deben poder cerrarse y entenderse con navegacion de teclado
- el color no puede ser la unica forma de comunicar estado
- body text y controles deben cumplir requisitos de contraste
- targets tactiles deben apuntar a `44px` cuando el uso mobile importa
- titulos de pantalla, headings de seccion y labels de accion deben permanecer explicitos

## Convenciones CSS Y De Componentes Especificas Del Repo

- No hay Tailwind. No escribir docs o prompts que asuman un tema Tailwind.
- No hay libreria de componentes. No asumir theme provider ni API de design tokens.
- Preferir CSS variables semanticas en `frontend/app/globals.css`.
- Preferir nombres de clase descriptivos antes que estilos inline.
- Si un estilo se repite, moverlo a CSS en vez de repetir `style={{}}`.
- Mantener estable `frontend/app/page.tsx` salvo que haya una razon clara para extraer UI a un archivo de componente dedicado.

## Regla Practica Para La Proxima Tarea De UI

Cuando un prompt futuro pida una mejora visual:

1. leer este archivo mas `docs/design-brief.md`
2. inspeccionar el area tocada en `frontend/app/page.tsx` y `frontend/app/globals.css`
3. reutilizar primero el vocabulario actual de componentes y clases
4. agregar tokens semanticos en `globals.css` antes que colores hex raw
5. validar layout, foco, estados vacios/carga/error y comportamiento mobile antes de dar el trabajo por terminado
