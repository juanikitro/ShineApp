# Patron De Dashboards Operativos

Playbook reutilizable para mejorar cualquier dashboard de ShineApp con la misma logica
que se aplico al dashboard principal: **senales que disparan accion, no tendencias
decorativas**. Sirve de guia para replicar el patron en otras superficies (Cliente 360,
Proveedor 360, futuras vistas) sin re-derivar el diseno.

Primero leer `docs/design-brief.md` y `docs/design-system.md`. Este doc no reemplaza esos;
agrega el patron especifico de dashboards.

## Principio Rector

El usuario de ShineApp es un operador de taller que necesita responder *que hago ahora*,
no *como viene la tendencia*. Por eso:

- **El grafico aparece solo donde dispara una lectura o accion.** Si una viz no cambia lo
  que el operador haria, no va. Una tendencia generica de un total es decoracion.
- **El color comunica riesgo, no adorno.** Escala fresco-neutro -> ambar -> rojo. El rojo
  marca atencion/accion (cobra esto, caja en rojo), no un estado normal.
- **Todo numero importante trae contexto comparativo** (delta con el valor del periodo
  anterior).
- **Densidad calma:** la mayoria de superficies quedan blancas/gris, la viz es contenida.

## El Patron En 5 Piezas

Un dashboard mejorado combina, segun el dominio, estas piezas:

1. **KPIs base** — numero grande + delta. El delta incluye el valor anterior entre
   parentesis: `+19,1% vs periodo anterior ($2.375.000)`.
2. **Senal de riesgo** — solo en los KPIs donde hay un riesgo que leer:
   - *Flujo con signo* (caja, resultado) -> sparkline cero-aware: linea base en 0, tramos
     negativos en rojo. Responde "tuve semanas/periodos en rojo?".
   - *Stock que envejece* (saldo por cobrar, deuda) -> medidor de antiguedad por riesgo:
     barra segmentada coloreada fresco-neutro -> vencido-rojo. Responde "esto esta fresco o
     podrido?".
3. **Lecturas cruzadas** — panel de ratios que cruzan **dos** datos y dicen algo que un
   total solo no dice. Ej: cobranza = cobrado/facturado; posicion neta = por cobrar - deudas;
   margen % = margen/facturado; carga = egresos/ingresos.
4. **Desglose por categoria** — "de donde entra y en que se va" (caja/compras por
   categoria), con barra de proporcion. Invariante: la suma por categoria == el total.
5. **Barras de proporcion** en rankings/listas, para leer magnitud por largo. Coloreadas
   por riesgo cuando aplica (antiguedad), neutras cuando es solo ranking.

## Primitivos Disponibles (Reutilizar Antes De Crear)

Componentes genericos (listos para cualquier dashboard):

- `frontend/app/components/ui/MetricCard.tsx` — card de KPI: `label`, `value`, `hint`, y un
  slot `footer` que se ancla al pie (para la viz de riesgo).
- `frontend/app/components/ui/CajaSparkline.tsx` — sparkline cero-aware (positivo en acento,
  negativo en rojo, base punteada en 0). Toma `values: number[]`.
- `frontend/app/components/ui/RiskMeter.tsx` — medidor segmentado por buckets, coloreado por
  riesgo. Hoy mapea los buckets de antiguedad de cobranza (`0_7`/`8_15`/`16_30`/`31_plus`);
  si otro dominio usa otros buckets, parametrizar el mapa de riesgo.
- Barra de proporcion: clase CSS `.dashboard-sharebar` con `--share` (ancho) y `--bar-fill`
  (color); helpers `dashboardShareBar` / `dashboardAgingBar` en `DashboardPanel.tsx`.

Plantillas especificas del dashboard principal (usar como referencia, no son genericas):

- `frontend/app/components/dashboard/DashboardCrossReadings.tsx` — panel de lecturas cruzadas.
- `frontend/app/components/dashboard/DashboardCashByCategory.tsx` — desglose por categoria.

Tokens (en `frontend/app/styles/tokens.css`, light + dark navy):

- Riesgo: `--risk-fresh` (neutro), `--risk-mid` (ambar), `--risk-high` (rojo).
- Barras: `--dashboard-bar-fill`, `--dashboard-bar-track`, `--dashboard-bar-income`,
  `--dashboard-bar-expense`.

## Reglas De Color Y UI

- **Fresco no es verde.** El bucket mas nuevo de un stock pendiente es **neutro**, no verde:
  sigue siendo plata que te deben / deuda abierta, no un "ok".
- **Rojo solo para riesgo/atencion**, nunca decorativo. Coherente con el brief.
- **Valores alineados:** etiqueta + valor arriba (misma altura entre cards de la fila), la
  viz anclada al pie. Cards compactas y uniformes.
- **Grilla pareja:** elegir un numero de columnas que divida la cantidad de cards (ej. 8
  cruces -> 4 columnas x 2 filas), sin columnas vacias.
- **Sin desbordes:** en listas con nombre + monto, el contenedor del nombre lleva
  `min-width: 0` y corte por palabra para que no se salga de la columna.
- Respetar radio 2px, sombras sutiles, ambos temas (claro y dark navy).

## Como Aplicarlo A Un Dashboard Nuevo

1. **Definir el riesgo del dominio.** Que es "estar en problemas" en este dashboard? (Ej.
   Proveedor: deuda vencida con ese proveedor + recepcion pendiente. Cliente: saldo viejo
   del cliente + baja recurrencia.)
2. **Elegir la senal** segun la forma del dato: flujo con signo -> `CajaSparkline`; stock que
   envejece -> `RiskMeter`; proporcion/ranking -> barra.
3. **Elegir 4-8 lecturas cruzadas** relevantes al dominio (ratios que crucen dos datos).
4. **Decidir si aplica desglose por categoria** (compras por categoria, etc.).
5. **Mapear los datos:** leer el serializer/endpoint del dashboard (ej.
   `/api/customers/{id}/history/`, `/api/suppliers/{id}/history/`) y listar que campos ya
   estan vs que falta. Lo que falte se agrega en backend **con su invariante y test** (ej.
   un desglose por categoria debe sumar el total).
6. **Reusar los primitivos**; parametrizar `RiskMeter`/breakdown si el dominio difiere.
7. **Validar:** backend `pytest` (con tests de invariante) + frontend `tsc`, `vitest`,
   `next build`. Pasar `docs/ui-review-checklist.md`.
8. **Documentar** el cambio en `docs/registro/cambios/`.

## Antipatrones

- Sparkline/tendencia de un total sin lectura accionable (lo que se removio del dashboard
  principal por no sumar valor).
- Color como decoracion (verde "porque si", azul en todo).
- Mini-viz en todos los KPIs por simetria; la viz va solo donde hay senal.
- Componentes nuevos cuando un primitivo existente alcanza.

## Referencia

- Dashboard principal (implementacion del patron):
  `docs/registro/cambios/2026-06-10-dashboard-senales-riesgo-cruces.md` y el codigo en
  `frontend/app/components/dashboard/`.
- Iteracion previa (barras + serie temporal):
  `docs/registro/cambios/2026-06-09-dashboard-barras-sparklines.md`.
