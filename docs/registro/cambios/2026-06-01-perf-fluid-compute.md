# Performance: Fluid Compute en la funcion API

## Problema

Cold start medido de la funcion `shineapp-api`: ~6.8 s en el primer hit tras
inactividad (boot del runtime Python + import de ~20 apps Django + DRF). En una
demo de bajo trafico la funcion se enfria seguido, asi que el cold start se siente.

## Cambio

`backend/vercel.json` habilita Fluid Compute:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"],
  "fluid": true,
  "installCommand": "python -m pip install -r requirements.txt",
  "buildCommand": "python manage.py collectstatic --noinput"
}
```

## Por que ayuda y es seguro ($0)

- Fluid Compute reusa instancias tibias y reduce la frecuencia de cold starts;
  ademas permite concurrencia in-function. Es el modelo de computo por defecto
  de Vercel y esta disponible en Hobby ($0).
- Cambio aditivo y reversible; no toca contratos de API, serializers ni auth.
- `conn_max_age=0` se mantiene (transaction pooler). Bajo concurrencia, Django
  usa conexiones thread-local y las cierra por request; el pooler multiplexa.
  NO se sube `conn_max_age` sin confirmar el modo de pooling.
- Alternativa equivalente: toggle "Fluid Compute" en Project Settings -> Functions
  del dashboard de Vercel. Se eligio la via en codigo por ser revisable y medible.

## Impacto esperado (pendiente de medir post-deploy)

- Menos cold starts y arranques mas rapidos en hits sucesivos tras baja actividad.
- El cold start verdadero (boot de Django) sigue existiendo en el primer arranque;
  Fluid reduce su FRECUENCIA, no lo elimina. Para reducir el boot en si haria falta
  lazy imports / bundle mas chico (no incluido aca).

## Validacion

- `backend/vercel.json` parsea como JSON valido (`regions=gru1`, `fluid=true`).
- Medicion ANTES/DESPUES del cold start requiere deploy (gate humano) y esperar
  que la funcion se enfrie para capturar un cold start real.
