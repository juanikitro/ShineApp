# Dependencias: correcciones de seguridad para los audits de CI

## Cambio

- `backend/requirements.txt` exige `djangorestframework>=3.17.2,<3.18`.
- El rango anterior instalaba 3.16.1 y bloqueaba `dependency-audit` por
  `PYSEC-2026-3827` y `PYSEC-2026-3828`; ambas tienen correccion en 3.17.2.
- Se mantiene el audit obligatorio, sin excepciones ni reduccion de checks.
- El frontend exige Next y eslint-config-next desde 15.5.27 y actualiza el
  override y dependencia de desarrollo de sharp a 0.35.5.
- El lockfile actualiza source-map-js a una version corregida desde 1.2.2.
  Estas actualizaciones corrigen los tres paquetes reportados por el audit de
  produccion: Next (incluyendo cache poisoning), sharp (libheif/librsvg) y
  source-map-js (denegacion de servicio).

## Alcance y compatibilidad

- No se cambian endpoints, serializers, permisos ni modelos de ShineApp.
- DRF 3.17 elimina Python 3.9 y coreapi: CI usa Python 3.12 y el esquema del
  proyecto usa drf-spectacular, sin dependencia de coreapi.
- La actualizacion incorpora los limites de parsing y la correccion de
  exposicion de datos en AdminRenderer publicados por DRF.
- Fuente: https://www.django-rest-framework.org/community/release-notes/#3172
- Referencias frontend:
  https://github.com/advisories/GHSA-4jqv-mc3x-m676,
  https://github.com/advisories/GHSA-wq5f-xc86-pv6w y
  https://github.com/advisories/GHSA-68fv-2mgg-jv7q.

## Validacion

- Audit local de requirements sin vulnerabilidades conocidas; 8 tests
  existentes de autenticacion OK y `manage.py check` sin problemas.
- `npm audit --omit=dev` local: cero vulnerabilidades con el lockfile actualizado.
- Antes del merge, exigir backend, frontend, dependency-audit y ci-required
  exitosos para el SHA final del PR; docs se omite por diseno en pull_request.
