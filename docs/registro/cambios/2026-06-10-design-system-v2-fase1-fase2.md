# Design System v2 — Fase 1 (tokens) + Fase 2 (base layer y fuente)

## Contexto

Rediseno visual de ShineApp segun especificacion `docs/design-system-v2.md`.
Solo CSS/tokens/fuente; sin cambios de logica de negocio, endpoints ni contratos de API.

## Cambios

### `frontend/app/styles/tokens.css`

**Tokens nuevos agregados:**

- Radius: `--radius-none`, `--radius-xs: 2px`, `--radius-xl: 12px`, `--radius-full: 9999px`
- Sombras: `--shadow-none`, `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Spacing: `--space-1` a `--space-16` (escala 4/8/12/16/20/24/32/40/48/64px)
- Tipografia: `--text-xs` a `--text-kpi-lg` (11px–34px)
- Colores nuevos: `--color-primary-light`, `--color-text-disabled`, `--color-border-focus`, `--color-danger-border`, `--color-danger-hover`, `--color-warning-border`, `--color-success-border`, `--color-info`, `--color-info-bg`, `--color-info-border`, `--shadow-color`

**Valores actualizados (light mode):**

| Token | Anterior | Nuevo |
|-------|---------|-------|
| `--radius-sm` | 2px | 4px |
| `--radius-md` | 2px | 6px |
| `--radius-lg` | 2px | 8px |
| `--color-primary` | #0284c7 | #0F62FE |
| `--color-primary-hover` | #0369a1 | #0043CE |
| `--color-canvas` | #f8fafc | #F1F5F9 |
| `--color-text` | #111827 | #0F172A |
| `--color-text-soft` | #4b5563 | #475569 |
| `--color-text-muted` | #8b95a1 | #94A3B8 |
| `--color-danger` | #e00000 | #DC2626 |
| `--color-warning` | #b45309 | #D97706 |
| `--color-warning-bg` | #fff7ed | #FFFBEB |

**Valores actualizados (dark mode):**

| Token | Anterior | Nuevo |
|-------|---------|-------|
| `--color-primary` | #0b2447 (navy) | #3B82F6 (blue) |
| `--color-primary-hover` | #19376d | #2563EB |
| `--color-canvas` | #0b2447 | #071A33 |
| `--color-canvas-deep` | #071a33 | #051428 |
| `--color-surface` | #102846 | #0D2444 |
| `--color-surface-raised` | #143055 | #122E58 |
| `--color-text` | #ffffff | #F1F5F9 |
| `--color-text-soft` | #d7e3f4 | #CBD5E1 |
| `--color-text-muted` | #abc0d8 | #8FAEC8 |

Los `--shop-*` alias no se modificaron; siguen apuntando a los tokens base actualizados.

### `frontend/app/layout.tsx`

- Carga `Montserrat` via `next/font/google` (pesos 400/500/600/700, variable `--font-sans`)
- Agrega `className={montserrat.variable}` al `<html>`

### `frontend/app/styles/base.css`

- `body`: `font-family` actualizado a `var(--font-sans, 'Montserrat'), -apple-system, ...`
- `button` base: border actualizado a `--color-border-strong`, color a `--color-text`, font-size a `--text-base`, font-weight 650 → 500, padding `7px 11px` → `0 14px`, min-height a 36px literal
- `button:hover`: simplificado a `background: var(--color-surface-raised)`
- `button.primary`: usa `--color-primary` directo (antes `--shop-action`), font-weight 700 → 500, agrega transition explícita y regla `:focus-visible` con outline
- `button.ghost`: `border-color: transparent`, color via `--color-text-soft`; hover via `--color-surface-raised` + `--color-border`
- `button.danger`: ahora sólido (`background: var(--color-danger)`, texto blanco); hover via `--color-danger-hover`; dark mode override actualizado a mismo patrón sólido (elimina rgba hardcodeados)
- `button:disabled`: opacidad 0.55 → 0.5
- `input, select, textarea`: background → `--color-surface`, border → `--color-border-strong`, height 40 → 36px, padding `9px 12px` → `0 10px`, agrega font-size/family, transition. Nuevas reglas `:hover`, `:focus-visible`, `:disabled`
- Regla tabular-nums: `.kpi-value`, `.metric-value`, `[data-numeric]`, `td.numeric`

## Decisiones

- `--radius-xs: 2px` hereda el rol visual del viejo `--radius-sm: 2px`; los elementos con border-radius veran un aumento (intencional en el spec).
- `--color-border-focus: var(--color-primary)` agregado como token implicito requerido por el spec de inputs (hereda dark mode automaticamente).
- `--color-danger-hover: #B91C1C` tokenizado para cumplir la regla de no hex raw en CSS.
- Las transformaciones hover en botones (`translateY`) se preservan sin cambios.

## Validacion

- `npm run build` exitoso sin errores ni warnings de TypeScript.
- Sin cambios de backend, endpoints, permisos ni contratos.
