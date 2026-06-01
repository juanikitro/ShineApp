# Performance: funcion API co-ubicada en gru1 (Sao Paulo)

## Problema

La demo publica se sentia lenta. Diagnostico con mediciones (2026-06-01):

- La funcion serverless de `shineapp-api` corria en `iad1` (Washington, US-East).
  Evidencia: header `x-vercel-id: gru1::iad1::...` (edge `gru1`, computo `iad1`).
- La base Supabase Postgres esta en `sa-east-1` (Sao Paulo) y el usuario en Argentina.
- Cada request viajaba Argentina -> edge Sao Paulo -> funcion US-East -> DB Sao Paulo -> vuelta.
- Con `conn_max_age=0` (correcto para transaction pooler) cada request abre una
  conexion TLS nueva a Postgres; cruzar continentes encarece el handshake y
  cada query paga ~120 ms de ida y vuelta funcion<->DB.

Baseline TTFB (warm, 6 corridas, desde Argentina):

| Endpoint                | cold ms | warm ms | causa principal |
|-------------------------|--------:|--------:|-----------------|
| `GET /api/health/`      |   ~6776 |   ~970  | abrir conexion DB cross-region |
| `POST /api/auth/login/` |       - |  ~1750  | conexion + query auth cross-region |
| `GET /api/dashboard/summary/` | - | (varios s) | ~25-35 queries x ~120 ms RTT cross-region |

## Cambio

`backend/vercel.json` fija la region de computo de la funcion en `gru1` (Sao Paulo),
misma ciudad que la DB Supabase `sa-east-1`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"],
  "installCommand": "python -m pip install -r requirements.txt",
  "buildCommand": "python manage.py collectstatic --noinput"
}
```

## Por que es seguro y $0

- Plan Hobby soporta UNA region (la cantidad es el limite pago, no la eleccion).
  Doc Vercel: "Hobby plans support one region". `gru1` es region GA.
- Cambio aditivo y reversible; no toca contratos de API, serializers ni auth.
- `conn_max_age=0` se mantiene (transaction pooler). No subir sin confirmar pooling.

## Impacto esperado (pendiente de medir post-deploy)

- Apertura de conexion DB: ~600 ms -> ~5-15 ms.
- Latencia por query funcion<->DB: ~120 ms -> ~1-3 ms (clave para dashboard con N queries).
- Cliente AR -> funcion: ~150 ms -> ~30 ms (edge gru1 ya estaba cerca).
- No afirmar mejora sin numero: medir warm/cold de health, login y dashboard
  despues del deploy con el mismo script de baseline.

## Validacion

- `backend/vercel.json` parsea como JSON valido y expone `regions=gru1`.
- Medicion ANTES/DESPUES requiere deploy a Vercel (gate humano). No se deployo aca.
- Verificacion post-deploy: header `x-vercel-id` debe mostrar `gru1::gru1::...`.

## Riesgo

- Si la cuenta no tuviera `gru1` habilitada, el deploy fallaria de forma explicita
  (no degrada produccion actual). Region elegida = mas cercana a usuario y DB.
