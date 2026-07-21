# Adopcion selectiva de Radix para overlays accesibles

Fecha: 2026-07-21

Contexto:
- `ServiceIconPicker` resolvia apertura, cierre por Escape, clic exterior,
  foco y posicion con listeners y refs locales.
- El frontend mantiene CSS escrito a mano, tokens semanticos y APIs de
  primitives locales estables; no usa Tailwind ni una libreria visual.

Decision:
- Adoptar `@radix-ui/react-popover` sin estilos como spike para el shell de
  `ServiceIconPicker`.
- Mantener el componente controlado por su estado `open`, su API publica y el
  contenido dinamico de `emoji-picker-react` sin cambios.
- Dejar que Radix gestione portal, colision, dismiss, Escape y retorno de
  foco; conservar el rol explicito `dialog` no modal para el contrato de
  accesibilidad y tests.
- Mantener los estilos en `frontend/app/styles/shell.css`, usando tokens y los
  atributos `[data-state]` de Radix.

Alternativas descartadas:
- Mantener el popover hecho a mano: conserva listeners, foco y posicionamiento
  duplicados que el primitive ya cubre.
- Migracion completa a Radix: amplia innecesariamente el diff, reabre APIs y
  estilos de primitives estables sin una necesidad demostrada.

Consecuencias:
- Se agrega una dependencia acotada y sus dependencias transitivas para un
  primitive de overlay accesible.
- Futuras adopciones de `react-dialog`, `react-alert-dialog` o
  `react-dropdown-menu` requieren una decision y un spike equivalentes.
- `Toggle`, `CollapsibleSection` y `SearchSelect` quedan fuera de esta
  migracion.
