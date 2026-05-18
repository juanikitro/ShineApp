# UI / UX Design System Plan - ShineApp

## Objetivo

Convertir la UI actual en un sistema consistente, sobrio y mantenible, sin reescribir el producto ni romper contratos existentes.

El sistema debe soportar:

- CRM claro como default,
- dark navy como variante soportada,
- alta densidad operativa,
- modales como patron principal de create/edit,
- mobile real, no solo "apilar grids".

## Principios rectores

1. Menos ruido, mas contexto.
2. Una accion primaria por bloque local.
3. Los estados tienen que sentirse intencionales.
4. Si dos cosas hacen lo mismo, deben verse igual.
5. La navegacion no compite con el trabajo.

## Tokens necesarios

### Color tokens

Mantener y completar la capa en `frontend/app/styles/tokens.css`.

#### Core

- `--color-canvas`
- `--color-canvas-deep`
- `--color-workspace`
- `--color-surface`
- `--color-surface-raised`
- `--color-surface-soft`
- `--color-border`
- `--color-border-strong`
- `--color-text`
- `--color-text-soft`
- `--color-text-muted`

#### Action / state

- `--color-primary`
- `--color-primary-hover`
- `--color-primary-foreground`
- `--color-danger`
- `--color-danger-bg`
- `--color-success`
- `--color-success-bg`
- `--color-warning`
- `--color-warning-bg`
- `--color-focus-ring`

#### Compatibilidad

- mantener `--shop-*` como alias temporales hasta completar migracion.

### Spacing tokens

Definir una escala fija y dejar de abrir valores nuevos por pantalla:

- `4px`
- `8px`
- `12px`
- `16px`
- `24px`
- `32px`
- `48px`
- `64px`

Regla:

- internos de controls/cards: `8/12/16`
- padding de paneles: `20/24`
- separacion de secciones: `32/48`

### Radius tokens

Mantener filosofia sobria:

- `--radius-sm: 2px`
- `--radius-md: 2px`
- `--radius-lg: 2px`

Excepcion:

- si el toggle de tema sobrevive, debe adaptarse al sistema; no imponer `999px` como lenguaje general.

### Motion tokens

Conservar la familia ya existente y prohibir duraciones one-off:

- `--motion-duration-fast`
- `--motion-duration-base`
- `--motion-duration-view`
- `--motion-duration-slow`
- `--motion-duration-pulse`

## Componentes base a normalizar primero

### 1. Button

Variantes:

- primary
- secondary
- ghost
- danger
- icon-only

Estados:

- default
- hover
- focus-visible
- active
- disabled
- loading

### 2. Input

Tipos base:

- text
- email
- tel
- number
- date
- textarea

Estados:

- default
- hover
- focus-visible
- error
- disabled

### 3. Tabs / SegmentedControl

Usos actuales a unificar:

- visualizacion de trabajos
- secciones de configuracion
- resumen de caja
- lavados/detailing

Debe soportar:

- desktop inline,
- mobile wrap o scroll con affordance claro,
- `role=tablist` coherente,
- teclado.

### 4. Card / Record

Subtipos:

- metric card
- list record
- dashboard insight card
- empty card
- action card

Regla:

- el card navegable no debe contener botones interactivos ambiguos sin jerarquia clara.

### 5. Modal / Dialog

Debe resolver:

- title
- description opcional
- scroll interno
- backdrop
- close button
- `Escape`
- focus trap
- focus return
- mobile height behavior

### 6. Empty / Loading / Error

Necesita tres primitives reales:

- `EmptyState`
- `InlineLoading`
- `InlineError`

Con CTA opcional y tono consistente.

### 7. Search / Filter Row

Hoy esta repetido por modulo. Debe soportar:

- texto de busqueda,
- filtros por chip/select,
- clear/reset,
- contador de resultados,
- layout responsive.

## Variantes necesarias

### Buttons

- `ButtonPrimary`
- `ButtonSecondary`
- `ButtonGhost`
- `ButtonDanger`
- `ButtonIcon`

### Inputs

- `InputBase`
- `InputDense`
- `InputWithAction`
- `TextareaBase`

### Cards

- `MetricCard`
- `RecordCardClickable`
- `RecordCardStatic`
- `InsightCard`
- `PanelCard`

### States

- `StatusPill`
- `ValueDelta`
- `InfoNote`
- `ToastNotice`

## Reglas de espaciado

- Todo layout nuevo arranca desde la escala `8/12/16/24/32/48`.
- No usar padding arbitrario por modulo si ya existe equivalente de sistema.
- La sidebar y la topbar deben ser los primeros lugares en respetar ritmo fijo.
- Las cards vacias no deben ocupar mas altura que la informacion que contienen.

## Reglas de tipografia

### Jerarquia

- `h1`: 28px / 700
- `h2`: 20px / 650-700
- `h3`: 16px / 650
- body: 14-16px / 400-500
- meta: 12-13px / 600
- KPI: 24-28px / 700

### Reglas

- usar peso y espacio antes que mas color,
- evitar mayusculas largas salvo labels cortos,
- aplicar `font-variant-numeric: tabular-nums` en comparaciones numericas,
- headings con `text-wrap: balance` donde ayude.

## Reglas de color

### Light default

- fondo principal suave gris
- paneles blancos
- texto oscuro
- azul solo para primary/focus/selected
- rojo solo para acciones destructivas o riesgo

### Dark supported

- navy canvas
- superficies navy elevadas
- texto claro
- pale blue para focus/accent

### Regla

- no introducir nuevos azules, rojos o grises por pantalla sin justificar token.

## Patrones para tablas y listas

ShineApp hoy es card/list-first, no table-first.

### Usar listas/cards cuando

- hay metadata multilinea,
- la accion es por entidad,
- importa reconocimiento rapido.

### Usar tabla real cuando

- la comparacion columna-a-columna sea el caso central,
- haya volumen alto,
- el usuario necesite escaneo tipo planilla.

### Reglas de record card

- titulo primero,
- metadata secundaria debajo,
- acciones a la derecha o en action rail clara,
- estados/badges consistentes,
- no anidar acciones ambiguas dentro del area navegable.

## Patrones para formularios

- create/edit en modal por defecto,
- label persistente siempre visible,
- placeholders cortos y utiles,
- pares naturales en dos columnas solo en desktop,
- mobile en una sola columna,
- validacion inline junto al campo,
- primer error enfocable.

### Para selects custom

- preferir semantica accesible real,
- evitar `autoFocus` en mobile,
- mostrar estado abierto/cerrado,
- soportar teclado y announcement.

## Patrones para estados

### Loading

- skeleton o placeholder estructural en dashboards/listas,
- inline spinner en botones async,
- no texto plano como unica respuesta en bloques grandes.

### Empty

- explicar que falta,
- decir por que importa,
- proponer siguiente accion.

### Error

- decir que fallo,
- dar siguiente paso,
- mantener tono operativo.

### Success

- toasts cortos,
- feedback local cuando la accion ocurre en modal o panel.

## Patrones para responsive

### Desktop grande

- sidebar real,
- workspace ancho,
- paneles multi-columna cuando agregan valor.

### Laptop

- misma estructura, menos aire.

### Tablet

- shell mas compacta,
- cards reflow,
- filtros wrap.

### Mobile

- topbar + drawer, no sidebar completa arriba,
- agenda con patron mobile dedicado,
- tabs con wrap o menu, no clipping silencioso,
- formularios single-column,
- acciones principales visibles sin desplazar el contexto demasiado abajo.

## Orden de normalizacion

1. shell + responsive nav
2. button/input/tabs
3. modal + empty/loading/error
4. record/list patterns
5. dashboard/entity patterns
6. agenda/caja/settings refinados

## Archivos base del sistema

- `frontend/app/styles/tokens.css`
- `frontend/app/styles/base.css`
- `frontend/app/styles/shell.css`
- `frontend/app/styles/agenda.css`
- `frontend/app/styles/forms.css`
- `frontend/app/components/ui/*`
- `frontend/app/components/layout/*`

## Regla final

Todo cambio nuevo debe responder esta pregunta:

**esto hace que la app sea mas clara, mas rapida y mas confiable para operar?**

Si la respuesta es no, no pertenece al sistema.
