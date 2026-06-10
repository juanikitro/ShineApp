# Design System v2 — Fase 3 (migración de tokens en shell, agenda, forms, public)

## Contexto

Continuación del rediseño visual. Migra `shell.css`, `agenda.css`, `forms.css` y `public.css`
para reemplazar valores hardcodeados por los tokens definidos en Fase 1+2.
Solo CSS; sin cambios de lógica de negocio, endpoints ni contratos de API.

## Archivos modificados

- `frontend/app/styles/shell.css`
- `frontend/app/styles/agenda.css`
- `frontend/app/styles/forms.css`
- `frontend/app/styles/public.css`

---

## Reemplazos realizados

### font-size → tokens tipográficos

Aplicado con `replace_all` en todos los archivos donde existía el valor exacto.

| Valor anterior | Token nuevo | Archivos |
|---|---|---|
| `font-size: 11px` | `var(--text-xs)` | shell.css, agenda.css |
| `font-size: 12px` | `var(--text-sm)` | shell.css, agenda.css, forms.css, public.css |
| `font-size: 13px` | `var(--text-base)` | shell.css, agenda.css, forms.css, public.css |
| `font-size: 14px` | `var(--text-md)` | shell.css, agenda.css, public.css |
| `font-size: 16px` | `var(--text-lg)` | shell.css, agenda.css, forms.css |
| `font-size: 18px` | `var(--text-xl)` | shell.css, forms.css, public.css |
| `font-size: 22px` | `var(--text-2xl)` | shell.css |

### border-radius → tokens de radio (solo shell.css)

agenda.css, forms.css y public.css ya estaban tokenizados.

| Valor anterior | Token nuevo | Notas |
|---|---|---|
| `border-radius: 999px` | `var(--radius-full)` | 14 ocurrencias — pills, badges, avatares |
| `border-radius: 8px` | `var(--radius-lg)` | 4 ocurrencias — panels, modales, toasts |
| `border-radius: 12px` | `var(--radius-xl)` | 1 ocurrencia — logo sidebar |
| `border-radius: 2px` | `var(--radius-xs)` | 1 ocurrencia — risk-meter bar |
| `border-radius: 0 2px 2px 0` | `0 var(--radius-xs) var(--radius-xs) 0` | 1 ocurrencia — nav indicator |

### box-shadow → token --shadow-lg (solo shell.css)

| Selector | Valor anterior | Token nuevo |
|---|---|---|
| `.modal-panel`, `.customer-ranking-row` | `box-shadow: 0 20px 48px var(--color-shadow)` | `var(--shadow-lg)` |
| `.modal-panel:focus-visible` (línea final) | `0 20px 48px var(--color-shadow)` | `var(--shadow-lg)` |

### Colores semánticos de borde (solo public.css)

| Selector | Valor anterior | Token nuevo |
|---|---|---|
| `.public-form-error, .public-state--error` | `rgba(239, 68, 68, 0.25)` | `var(--color-danger-border)` |
| `.public-form-success` | `rgba(22, 163, 74, 0.22)` | `var(--color-success-border)` |
| `.public-recall-banner` | `rgba(59, 130, 246, 0.22)` | `var(--color-info-border)` |

---

## Valores encontrados pero NO migrados

### border-radius off-scale

| Valor | Archivos | Razón |
|---|---|---|
| `border-radius: 14px` | shell.css (3×), public.css (1× — `.public-brand-mark`) | No existe `--radius-14`; entre `--radius-xl(12)` y ningún siguiente token |
| `border-radius: 18px` | public.css (1× — `.public-brand-mark`) | No existe en la escala |
| `border-radius: 50%` | shell.css (3×) | Valor relativo para círculos; no equivale a ningún token fijo |
| `border-radius: 0` | shell.css (3×) | Equivaldría a `--radius-none` pero `0` es canónico y unambiguo |

### font-size off-scale

| Valor | Archivos | Razón |
|---|---|---|
| `font-size: 15px` | public.css (`.public-service-card strong`) | No existe `--text-15`; entre `--text-md(14)` y `--text-lg(16)` |
| `font-size: 17px` | public.css (`.public-intro`), forms.css (`.board-header h3`) | No existe `--text-17` |
| `font-size: 20px` | shell.css (varios iconos inline) | No existe `--text-20`; entre `--text-xl(18)` y `--text-2xl(22)` |
| `font-size: 24px` | shell.css (KPI widgets) | No existe; entre `--text-2xl(22)` y `--text-kpi(28)` |
| `font-size: 28px` | shell.css (page title h1) | Existe `--text-kpi(28)` pero `h1` no es un KPI — semántica ambigua |
| `font-size: 30px` | shell.css (login display) | No existe en la escala |
| `font-size: 32px` | public.css (`.public-brand-mark span`) | No existe en la escala |
| `font-size: 34px` | shell.css (KPI lg) | Existe `--text-kpi-lg(34)` — dejado por precaución ya que el contexto es inline style |

### Sombras off-scale

| Valor | Archivos | Razón |
|---|---|---|
| `0 10px 24px var(--color-shadow-soft)` | forms.css, agenda.css | Ningún token coincide exactamente (--shadow-md = 0 8px 20px) |
| `0 12px 28px var(--color-shadow)` | agenda.css | Ningún token coincide exactamente |
| `0 18px 42px var(--color-shadow-soft)` | forms.css | Ningún token coincide exactamente |
| `0 4px 8px var(--color-shadow)` | shell.css (varios) | Próximo a `--shadow-sm` (= 0 4px 8px rgba fijo) pero referencia variable — ambiguo |

### Spacing hardcodeado

No se migró spacing en esta fase. Muchos valores en shell.css son off-scale
(6px, 10px, 14px, 18px, 22px) y hacerlo en forma parcial generaría inconsistencia visual.
Se reserva para una Fase 4 dedicada.

---

## Validación

```
cd frontend && node ./node_modules/next/dist/bin/next build
# ✓ Compiled successfully in 8.7s
# ✓ Generating static pages (7/7)
```
