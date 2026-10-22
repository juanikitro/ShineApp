# DRF: correcciones de parsing y revocacion de tokens

## Que cambia

`backend/requirements.txt` exige `djangorestframework>=3.18.3,<3.19` para corregir
los tres hallazgos que bloqueaban dependency-audit en la base compartida:

- CVE-2026-114138 / GHSA-33wh-fxxf-88vv: negociacion acotada de headers Accept
  y Content-Type frente a consumo excesivo de CPU.
- CVE-2026-114136 / GHSA-3547-9m27-7rxg: rechazar charsets que transforman bytes
  (por ejemplo bz2) en vez de decodificar texto, evitando expansion tras el
  limite Django de bytes recibidos.
- CVE-2026-114137 / GHSA-xw6w-gcfp-cf8m: borrar un `TokenProxy` elimina el token
  concreto y la credencial anterior deja de autenticar.

## Compatibilidad y limites

Las correcciones llegan en 3.18.2; se exige 3.18.3 porque revierte una regresion
accidental de `order_by_precedence`. Django 5.2 y Python 3.12 del proyecto siguen
soportados. No se modifican endpoints, permisos, scoping tenant ni modelos.

DRF 3.18 cambia por defecto los errores de `ListSerializer` de lista a dict.
Se usa su opcion oficial `REST_FRAMEWORK["LIST_SERIALIZER_ERRORS_AS_DICT"]=False`
para conservar el payload existente, incluidas listas anidadas de cotizaciones
e inventario. Esta compatibilidad esta deprecada y debe revisarse antes de DRF
3.20; el rango actual excluye esa version. Los headers fuera de los limites y
los charsets no textuales ahora se rechazan; JSON y charsets textuales normales
se conservan. No se deshabilitan audits ni se agregan excepciones de CVE.

## Validacion

`backend/tests/test_drf_security_updates.py` reproduce los tres fallos con
fixtures pequenas en DRF 3.17.2 y comprueba la correccion en 3.18.3, ademas de
negociacion normal, charsets textuales y el formato de errores previo.
Se complementa con tests existentes de autenticacion, invalidacion de tokens
y aislamiento entre negocios. El entorno compartido de desarrollo no se altera:
se instala solo el wheel DRF en un directorio temporal ignorado del worktree.
La evidencia local no equivale a deploy ni validacion del entorno remoto.

Resultado local: 35 tests focalizados OK (`test_drf_security_updates.py`,
`test_auth_security.py`, `test_security_phase1.py`, `test_security_phase2.py`)
con DRF 3.18.3, SQLite sintetica y Storage deshabilitado; `manage.py check` OK.
Los tres fallos de seguridad se reprodujeron antes con DRF 3.17.2 (3 failed,
6 passed). El audit de requirements queda exigido en CI; no se ejecuto localmente
porque el interprete compartido no tiene `pip_audit` instalado.

Fuentes oficiales revisadas el 2026-10-22:

- [Release notes](https://www.django-rest-framework.org/community/release-notes/#3183).
- [Accept headers](https://github.com/encode/django-rest-framework/security/advisories/GHSA-33wh-fxxf-88vv).
- [Charsets](https://github.com/encode/django-rest-framework/security/advisories/GHSA-3547-9m27-7rxg).
- [TokenProxy](https://github.com/encode/django-rest-framework/security/advisories/GHSA-xw6w-gcfp-cf8m).
