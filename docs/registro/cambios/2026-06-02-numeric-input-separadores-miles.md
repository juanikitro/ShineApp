---
date: 2026-06-02
title: Separadores de miles y prefijo $ en inputs monetarios
area: frontend/ui
---

# Separadores de miles y prefijo $ en inputs monetarios

Nuevo componente `NumericInput` que formatea valores monetarios al escribir:

- Muestra separadores de miles con punto (10000 → 10.000, estilo argentino)
- Agrega prefijo `$` visible dentro del campo cuando el campo es monetario
- Usa `type="text"` + `inputMode="numeric"` para controlar el formato
- Emite el valor crudo (sin puntos) al `onChange`, sin cambios de contrato

Aplicado en los formularios: Pago, Pago de deuda, Movimiento de caja,
Deuda, Servicio (precio base y por tipo de vehículo), Cotización y Reserva.
No se tocaron campos de cantidad, porcentaje ni duración.
