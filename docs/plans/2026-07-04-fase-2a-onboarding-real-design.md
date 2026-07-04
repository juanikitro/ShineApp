# Fase 2A - Onboarding real guiado

## Objetivo

Convertir el primer uso de un negocio vacio en una secuencia operativa clara,
sin depender de datos demo ni crear un wizard paralelo.

## Alcance aprobado

- Opcion 1: guia derivada del estado real del negocio.
- Opcion 3: accion para crear servicios base de lavadero, detailing y lubricentro.

## Diseno

El dashboard mantiene el panel de salida comercial, pero cuando detecta un
negocio vacio lo presenta como alta guiada. La UI debe priorizar una unica
siguiente accion y mostrar el progreso sin bloquear la navegacion normal.

Los pasos son:

1. Datos del negocio.
2. Servicios base.
3. Turnera publica.
4. WhatsApp.
5. Primer turno o trabajo.
6. Primer cobro.

Cada paso abre una superficie existente. No se agrega persistencia de
onboarding, porque el avance se calcula desde datos reales.

## Servicios base

La accion "Crear servicios base" vive dentro del onboarding cuando faltan los
servicios del nicho inicial. Debe crear servicios para lavadero, detailing y
lubricentro usando endpoints existentes, evitando duplicar nombres ya cargados.

Si todos los servicios base ya existen, la accion principal vuelve a "Cargar
servicios" y navega a la seccion correspondiente.

## UX

- Tono: CRM claro, sobrio y operativo.
- El panel debe ser amable para un usuario no tecnico, con copy accionable y
  sin explicar la arquitectura de la app.
- Mobile debe mostrar los pasos en una sola columna y botones de ancho completo.
- La creacion automatica debe mostrar estado de carga, exito y error.

## Riesgos

- Duplicar servicios si se compara solo por nombre exacto. Mitigacion: normalizar
  nombres y revisar activos existentes antes de crear.
- Sobrecargar el dashboard con onboarding permanente. Mitigacion: cuando el
  checklist esta listo, mantenerlo como panel de salida comercial compacto.
- Tocar demasiadas superficies. Mitigacion: reusar endpoints, servicios y
  navegacion existentes.

## Validacion esperada

- Tests unitarios de readiness/onboarding.
- Tests unitarios de builder de servicios base.
- Smoke visual desktop/mobile del dashboard vacio y demo lista.
