# ERRORS_LOGGING.md

Guia para manejo de errores, excepciones y logging en cambios asistidos por IA.

Fuente de verdad general: `../../AGENTS.md`.

## Alineacion con el repo

En este proyecto no hay evidencia fuerte de una capa custom de logging como en SISOC.

Regla:
- usar el logging estandar de Python/Django cuando haga falta,
- no introducir un esquema paralelo sin una necesidad real.

## Estrategia por capa

### Views y endpoints

- validar inputs,
- devolver status codes coherentes,
- responder mensajes claros al usuario,
- no exponer trazas ni detalles internos.

### Serializers y dominio

- usar errores de validacion para rechazos esperables,
- usar excepciones solo para fallas inesperadas o contratos rotos,
- cuidar consistencia de side effects.

### Frontend

- no ocultar silenciosamente errores de API,
- mostrar mensajes claros y accionables,
- evitar filtrar detalles internos del backend.

## Status codes practicos

- `400`: input invalido
- `401`: no autenticado
- `403`: sin permisos
- `404`: recurso inexistente
- `409`: conflicto de negocio si aplica
- `500`: error inesperado

## Logging

Usar por defecto:

```python
import logging

logger = logging.getLogger(__name__)
```

No loggear:
- contrasenas,
- tokens,
- emails o telefonos completos,
- payloads completos con datos sensibles.

## Regla practica

Si el flujo puede fallar por validacion esperable:
- preferir respuesta controlada.

Si el flujo falla por una condicion inesperada:
- log + excepcion o log + fallback segun el contrato real.
