# Fix: errores por campo visibles en formularios globales (2026-06-08)

**Problema:** El formulario `/reset-password` descartaba `notice.fields` al
renderizar errores del backend. Cuando `POST /auth/password-reset/confirm/`
rechazaba con `{"new_password": ["La contraseña debe..."]}` o `{"token":
["Token invalido..."]}`, el usuario veia solo un parrafo con la
`description` y no sabia que campo habia fallado ni el mensaje real del
backend.

**Causa raiz comun:** `frontend/lib/api-errors.ts` normaliza la respuesta
en un `ApiErrorNotice` con `{ title, description, fields[] }`, pero
varias superficies del frontend tipaban el estado de error como `string`
y aplastaban el notice (`setErrorMessage(notice.description ?? notice.title)`).
El patron correcto ya existe en dos lugares:

- `frontend/lib/page-support.tsx::apiErrorToast` arma un `ToastDraft` con
  `fields: notice.fields` y `NoticeToast` los renderiza en una
  `<ul className="alert-fields">`.
- `frontend/app/publica/[slug]/PublicLandingClient.tsx` (PR aparte) usa
  un componente inline `PublicFormErrorNotice` con `.public-form-error +
  .alert-fields`.

**Barrido (alcance):** El audit de `formatApiError(` + `setError(` en
`frontend/` arrojo solo una superficie pendiente:

- `frontend/app/reset-password/page.tsx` — render inline con `<p>` plano.

Las demas surfaces ya estaban bien:

- `frontend/app/page.tsx` y `frontend/lib/page-support.tsx::LoginScreen` —
  el error entra por `setError(notice)` que canaliza `showToast(apiErrorToast
  (notice))`, y `NoticeToast` ya renderiza `fields`. No se toco.
- `frontend/app/publica/[slug]/PublicLandingClient.tsx` — tiene su propio PR
  con el patron aplicado (commit `fix(landing-publica): mostrar campos
  especificos en errores del formulario`). Fuera de scope de este PR.

**Fix aplicado:**

- `frontend/app/reset-password/page.tsx`: el estado `errorMessage: string
  | null` pasa a `errorNotice: ApiErrorNotice | null`. Nuevo componente
  inline `FormErrorNotice` que renderiza titulo, descripcion y, si hay
  `fields`, una lista `label: message`. El render reusa las clases
  globales `.alert-notice`, `.alert-title` y `.alert-fields` que ya viven
  en `shell.css`.
- `frontend/app/styles/base.css`: `.login-card .alert-notice` agrega bg,
  border, padding y `margin-bottom` con tokens de status canceled, para
  que el alerta tenga el mismo peso visual que el resto de los cartelitos
  de error.
- `frontend/lib/api-errors.ts::FIELD_LABELS`: se agregan `new_password`
  (Nueva clave) y `token` (Link de recuperacion). Sin esas entradas, el
  render mostraba `New Password` y `Token` Title-Case automatico.
- `frontend/vitest.config.mjs`: include extra
  `app/reset-password/**/*.test.{ts,tsx}` para correr la suite nueva
  (sin tocar `coverage.include`).
- `frontend/app/reset-password/page.test.tsx`: 2 tests UI nuevos
  (field error backend con label "Nueva clave" y rama de error sin
  fields que NO lista campos).

**Componente compartido:** se evalua extraer `FormErrorNotice` a
`frontend/app/components/ui/FormErrorNotice.tsx`. El umbral del repo es
3+ surfaces inline y hoy solo hay 2 (esta + `PublicFormErrorNotice` en
otro PR), asi que se deja inline. La extraccion queda como follow-up
cuando aparezca una tercera surface inline.

**Archivos tocados:**

- `frontend/app/reset-password/page.tsx`: nuevo render con `ApiErrorNotice`
  y componente inline `FormErrorNotice`.
- `frontend/app/reset-password/page.test.tsx`: tests UI nuevos.
- `frontend/app/styles/base.css`: scope `.login-card .alert-notice` para
  que el alert tenga el mismo peso visual.
- `frontend/lib/api-errors.ts`: dos entradas nuevas en `FIELD_LABELS`
  (`new_password`, `token`).
- `frontend/vitest.config.mjs`: include extra de la suite nueva.

**Tests:** `npm run test` pasa (38 archivos, 351 + 2 = 353 tests).
`npm run build` pasa.

**Mantenimiento de FIELD_LABELS:** para campos nuevos del backend que
los formularios deban mostrar, sumar la entrada en
`frontend/lib/api-errors.ts::FIELD_LABELS` (ordenado alfabeticamente).
Sin la entrada, el render usa un fallback Title-Case automatico
(`new_password` -> "New Password").

**Compatibilidad:**

- Las superficies que ya entran por `apiErrorToast` / `showToast` no
  cambian (LoginScreen, Workspace).
- API publica `/auth/password-reset/confirm/` no cambia.
- No se agregan capas nuevas backend: `FIELD_LABELS` del cliente cubre
  los campos actuales (`new_password`, `token`).
