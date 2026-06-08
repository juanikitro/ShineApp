# Fix: errores por campo visibles en landing publica (2026-06-08)

**Problema:** El formulario de `/publica/[slug]` mostraba un cartel generico
("Revisa los datos ingresados - Hay campos que necesitan correccion antes de
guardar.") cuando el backend rechazaba un campo, sin decir cual ni por que.
Por ejemplo, al enviar una hora fuera del rango de atencion, el usuario no
veia el campo `preferred_time` ni el mensaje real del backend.

**Causa raiz:** `frontend/lib/api-errors.ts` ya normaliza la respuesta en un
`ApiErrorNotice` con `{ title, description, fields[] }`, pero
`PublicLandingClient.tsx` tenia una funcion `errorMessage()` que unia solo
`title + description` con `joinDisplayParts`, descartando `notice.fields`.
El resto de la app ya usa el patron correcto en `apiErrorToast` de
`frontend/lib/page-support.tsx`.

**Fix:**
- `PublicLandingClient.tsx`: el estado `error: string | null` pasa a
  `errorNotice: ApiErrorNotice | null`. Se reemplaza `errorMessage()` por
  `errorNoticeFrom()` (delega en `formatApiError`) y un helper local
  `localValidationNotice(text)` para errores client-side. Nuevo componente
  inline `PublicFormErrorNotice` que renderiza titulo, descripcion y, si hay
  `fields`, una lista con `label: message`.
- `recallFeedback` cambia a `{ tone: 'ok'; text } | { tone: 'err'; notice }`
  para mostrar tambien fields cuando el lookup `recall/` falla con campos.
- `frontend/app/styles/public.css`: `.public-form-error` ahora es un grid
  vertical con tipografias para `strong` (titulo) y `p` (descripcion). La
  lista de fields reusa la clase global `.alert-fields` ya definida en
  `shell.css`.
- `frontend/lib/api-errors.ts`: se agregan al `FIELD_LABELS` los campos del
  payload de la landing publica (`customer_*`, `preferred_*`, `vehicle_*`,
  `service_ids`, `message`) para que el render muestre etiquetas en espanol
  en lugar del fallback Title-Case automatico.

**Archivos tocados:**
- `frontend/app/publica/[slug]/PublicLandingClient.tsx`: nuevo render con
  `ApiErrorNotice`, helpers locales y componente `PublicFormErrorNotice`.
- `frontend/app/publica/[slug]/PublicLandingClient.test.tsx`: tests UI
  nuevos para field error backend y validacion local.
- `frontend/app/styles/public.css`: estilo grid + tipografia para
  `.public-form-error` estructurado.
- `frontend/lib/api-errors.ts`: labels en `FIELD_LABELS` para campos de la
  landing publica.
- `frontend/vitest.config.mjs`: include extra `app/publica/**/*.test.{ts,tsx}`
  para que el runner detecte la suite nueva.

**Tests:** 2 tests en `PublicLandingClient.test.tsx`
- Submit falla con `{ preferred_time: ['Fuera del horario del negocio.'] }`:
  el DOM muestra "Hora preferida" y el mensaje del backend.
- Validacion local (sin servicio seleccionado): el DOM muestra
  "Selecciona al menos un servicio." sin lista de fields.

**Mantenimiento de FIELD_LABELS:** para campos nuevos del backend que el
landing (o cualquier formulario) deba mostrar, sumar la entrada en
`frontend/lib/api-errors.ts::FIELD_LABELS`. Sin la entrada, el render usa
un fallback Title-Case automatico (`preferred_time` -> "Preferred Time").

**Compatibilidad:**
- Toast de errores en el resto de la app no cambia (sigue usando
  `apiErrorToast` que ya pasaba `notice.fields`).
- API publica `/public/landing/{slug}/requests/` no cambia.
- No se agregan capas nuevas backend: el helper sigue siendo client-side
  ya que `FIELD_LABELS` cubre todos los campos actuales del landing.
