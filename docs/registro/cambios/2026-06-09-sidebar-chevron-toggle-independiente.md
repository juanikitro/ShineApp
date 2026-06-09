# Sidebar: la flechita despliega sin navegar; el item navega y despliega

## Cambio

En los grupos desplegables del sidebar (Agenda, Clientes, Caja) se separan dos acciones que antes estaban acopladas:

- Click en la **flechita** (chevron): solo abre/cierra el desplegable, sin cambiar de seccion.
- Click en el **resto del item**: navega a la pagina del grupo (igual que antes) y ademas lo deja abierto.

Antes el desplegado era puramente derivado del estado activo (`expanded = isActive || childActive`): la unica forma de ver los hijos era navegar al grupo.

## Frontend

- `frontend/app/components/layout/SidebarNav.tsx`:
  - Nuevo estado local `openKeys: string[]` con el o los grupos abiertos. Se siembra con el grupo que contiene la seccion activa y un `useEffect` lo reabre si la seccion activa cambia desde afuera, sin colapsar el resto.
  - El header del grupo pasa de un unico `<button>` a un `.nav-parent-header` con dos botones hermanos (no se puede anidar `<button>`):
    - `.nav-parent-button`: navega (`onChange`) y abre (`openSection`).
    - `.nav-parent-toggle`: solo togglea (`toggleSection`); `aria-label`/`title` = "Expandir/Contraer {label}" y `aria-expanded`.
  - `expanded` ahora deriva de `openKeys.includes(item.key)`.
  - Helper `findActiveGroupKey(items, active)`.
- `frontend/app/styles/shell.css`:
  - `.nav-parent-header` (flex row), `.nav-parent-button` (`flex: 1 1 auto`), `.nav-parent-toggle` (`flex: 0 0 auto`, chevron centrado).
  - Se suprime la barra activa (`::before`) del toggle y se fuerza ancho completo del boton padre en modo colapsado.

Modo colapsado: el toggle no se renderiza (no hay label visible); el item sigue navegando y abriendo, igual que antes.

## Tests

- `frontend/app/components/layout/layout.test.tsx`: nuevo caso que verifica que el chevron abre/cierra sin llamar `onChange`, y que el click en el item llama `onChange` y deja el grupo abierto.

## Validacion

- `tsc --noEmit`: OK.
- `vitest run` completo: 44 archivos / 381 tests OK.

## Notas

- No cambia ningun contrato de datos: el tipo `SidebarNavItem` y la prop `onChange` siguen iguales. El estado de apertura es interno del componente.
- Pueden quedar varios grupos abiertos a la vez (ya no hay auto-colapso del grupo no activo); es consecuencia esperada de poder abrir desplegables sin navegar.
