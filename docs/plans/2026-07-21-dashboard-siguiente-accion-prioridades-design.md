# Siguiente accion: prioridades consecutivas

## Objetivo

Hacer que la columna izquierda de **Siguiente accion** aproveche su altura para
mostrar una decision operativa completa: que hacer ahora y que atender despues,
sin obligar al operador a descubrir las prioridades en otros modulos.

## Diseno aprobado

La `RecordCard` izquierda conserva el mejor paso actual bajo el rotulo
**Ahora** y su boton principal. Debajo de una separacion sutil, muestra
**Despues** con hasta dos acciones consecutivas, cada una navegable desde la
misma card.

El orden usa los datos que ya consume el dashboard:

1. Cobrar el saldo mas antiguo cuando hay un trabajo cobrable.
2. Revisar deudas vencidas cuando existe deuda vencida.
3. Ir a Agenda: crear actividad si no hay trabajos en el periodo o mantener la
   agenda al dia si ya los hay.

La primera accion es **Ahora** y las dos siguientes, si existen, forman
**Despues**. Las tareas importantes permanecen sin cambios en la card derecha.
En movil se mantiene el apilado actual de ambas cards y las acciones ocupan el
ancho disponible.

## Direccion visual

- **Intento:** al abrir el dashboard, un operador de taller puede decidir y
  actuar sin perder contexto ni sentirse frente a una lista de alertas.
- **Paleta:** se reutilizan el canvas gris, superficies blancas, tinta oscura,
  azul de accion y los tonos semanticos de alerta existentes.
- **Profundidad:** la decision vive dentro de la `RecordCard` opaca actual; las
  acciones posteriores usan filas suaves con borde, sin una nueva capa visual.
- **Firma:** un carril de decision **Ahora / Despues** que hace legible la
  secuencia de trabajo dentro de una sola columna.

## Limites

No cambia endpoints, permisos, contratos ni calculos economicos. Solo expone
en orden las acciones que ya podia sugerir el dashboard y conserva sus destinos
actuales de cobro, deudas y agenda.

## Validacion

- Selector puro para el orden de prioridad, incluyendo ausencia de actividad.
- Prueba del componente para comprobar que una accion posterior abre Deudas.
- Revision responsive y de foco visible en las filas de **Despues**.
