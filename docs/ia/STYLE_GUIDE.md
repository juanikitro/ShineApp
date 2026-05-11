# STYLE_GUIDE.md

Guia de estilo y convenciones para generar codigo uniforme en ShineApp.

Fuente de verdad general: `../../AGENTS.md`.

## Principios

- Coherencia con el codigo existente.
- Cambios minimos y locales.
- Legibilidad primero.
- No introducir patrones nuevos si ya existe uno aceptado en ese modulo.

## Backend Python

### Naming

- archivos y modulos: `snake_case.py`
- clases: `PascalCase`
- funciones y variables: `snake_case`
- constantes: `UPPER_CASE`

### Regla de dominio

- nombres tecnicos generales en ingles (`request_data`, `response_data`, `status_filter`),
- nombres del dominio segun el codigo existente (`work_order`, `reservation`, `material`, `cash_movement`),
- no renombrar campos o endpoints existentes por estetica.

### Ubicacion de logica

- views y viewsets: request, permisos, respuesta y orquestacion corta,
- serializers: shape, validacion y transformacion cercana al payload,
- models: reglas del dominio y consistencia propia de la entidad,
- helpers puntuales: solo cuando reducen duplicacion real.

No imponer una capa `services/` global si el modulo actual no la necesita.

## Frontend TypeScript / React

### Naming

- componentes: `PascalCase`
- hooks: `useXxx`
- variables y props: `camelCase`
- utilidades: nombres explicitos, sin abreviaturas opacas

### Regla practica

- si el flujo ya vive en `frontend/app/page.tsx`, extender esa superficie antes de abrir rutas o contenedores nuevos,
- separar helpers reutilizables en `frontend/lib/` cuando la extraccion reduzca complejidad real,
- si el home necesita soporte compartido, preferir `frontend/lib/page-support.tsx` antes de duplicar bloques dentro de `page.tsx`,
- si el cambio es de CSS, tocar la partial de `frontend/app/styles/` mas cercana antes de crecer `globals.css`,
- evitar sobreingenieria de estado si una solucion local y clara alcanza.

## Estilo general

- comentarios solo cuando explican una decision o edge case,
- mensajes al usuario en espanol,
- errores tecnicos sin secretos ni detalles internos,
- mantener funciones chicas y contratos explicitos.

## Formato y tooling visibles

- Python: respetar estilo compatible con `pytest` y Django.
- Frontend: respetar TypeScript y el formato ya presente.
- No imponer `ruff`, `mypy`, `eslint` o `prettier` como obligatorios si el repo no los usa.
