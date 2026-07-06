# Fase 2B - WhatsApp onboarding operativo

## Objetivo

Reducir el bloqueo posterior a servicios base: que un negocio real pueda dejar
WhatsApp listo para probar confirmaciones y cotizaciones sin pedir credenciales
de Meta en la primera experiencia.

## Alcance aprobado

- Agregar un arranque guiado en `Configuracion > WhatsApp`.
- Usar el provider `fake` para demo/local, sin servicios externos ni tokens.
- Crear templates base y enlazarlos a reglas automaticas existentes.
- Mantener la configuracion manual de Meta Cloud API para produccion.
- No agregar migraciones ni endpoints nuevos salvo bloqueo tecnico.

## Diseno

La seccion WhatsApp debe abrir con un panel de preparacion, no con un formulario
crudo. El usuario ve si ya tiene conexion, templates, reglas e historial, y una
accion principal para preparar el canal demo/local.

El flujo recomendado:

1. Guardar config `fake`, canal habilitado, numero visible y codigo pais.
2. Crear templates faltantes para:
   - turno confirmado
   - trabajo listo
   - trabajo entregado
   - cotizacion enviada
3. Asociar cada regla automatica a su template y activarla.
4. Refrescar el checklist de readiness sin salir de la pantalla.

La accion debe ser idempotente desde la UI: si un template equivalente ya existe,
se reutiliza; si una regla ya apunta a un template, se respeta o se actualiza solo
cuando falta asignacion.

## UX

- Tono: CRM claro, sobrio y operativo.
- Priorizar una unica accion: `Preparar WhatsApp demo`.
- Mostrar el modo demo/local como seguro y reversible.
- Separar visualmente "Primer arranque" de "Configuracion avanzada".
- Evitar copy tecnico sobre Meta hasta que el usuario elija produccion.
- Mantener la pantalla responsive y escaneable en mobile.

## Riesgos

- Duplicar templates si la comparacion es demasiado literal. Mitigacion:
  detectar por `key`, nombre de provider e idioma antes de crear.
- Activar reglas sin template correcto. Mitigacion: enlazar por evento y validar
  que exista template antes del `PATCH`.
- Confundir modo demo con produccion. Mitigacion: copy y badges explicitos para
  `fake` vs `Meta Cloud API`.
- Dejar logica nueva atrapada en `page.tsx`. Mitigacion: extraer helpers
  testeables a `frontend/lib`.

## Validacion esperada

- Tests unitarios del helper de bootstrap WhatsApp.
- Tests unitarios de readiness si cambia el calculo.
- Check frontend puntual, secuencial y sin Node paralelo.
- Si se toca contrato backend, tests de `backend/tests/test_whatsapp.py`.
