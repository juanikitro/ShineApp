# Plan De Implementacion: Colapsar Sidebar

> **Para workers agenticos:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Agregar un toggle de sidebar que colapse la shell a navegacion solo con iconos y la expanda de nuevo al layout completo actual.

**Arquitectura:** Mantener la feature local al seam existente de shell. Guardar `sidebarCollapsed` en `frontend/app/page.tsx`, pasarlo a `SidebarNav.tsx` para render de labels y accesibilidad, y manejar cambios de ancho/alineacion desde `frontend/app/styles/shell.css`.

**Tech Stack:** Next.js App Router, estado React 19 en `frontend/app/page.tsx`, TypeScript, partials CSS globales en `frontend/app/styles/`.

---

## Restricciones

- No agregar cambios backend, rutas nuevas ni llamadas API.
- No agregar persistencia en esta iteracion.
- En modo colapsado, solo quedan visibles el control de colapsar/expandir y los iconos de navegacion.
- Preservar accesibilidad de teclado con `aria-label` y `title` en botones solo-icono.

## Estructura De Archivos

### Archivos A Modificar

- `frontend/app/page.tsx`
  Responsabilidad: poseer el estado collapsed, cablear el boton superior de toggle y ocultar contenido de footer/header cuando esta colapsado.

- `frontend/app/components/layout/SidebarNav.tsx`
  Responsabilidad: aceptar props de modo collapsed, exponer el estado a CSS y ocultar labels de navegacion en modo collapsed preservando nombres accesibles.

- `frontend/app/styles/shell.css`
  Responsabilidad: reducir ancho del sidebar, centrar navegacion solo-icono y estilar el toggle de colapso sin alterar el layout expandido actual.

## Tarea 1: Agregar Estado De Sidebar Colapsado Y Wiring

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Agregar estado local collapsed cerca del otro estado UI de nivel shell**

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
```

- [ ] **Paso 2: Construir el header del sidebar para que siempre renderice el boton de toggle y solo renderice `Buscar...` cuando esta expandido**

```tsx
header={
  <div className="sidebar-top-stack">
    <button
      type="button"
      className="sidebar-collapse-toggle"
      aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      onClick={() => setSidebarCollapsed((current) => !current)}
    >
      {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
    </button>
    {!sidebarCollapsed ? (
      <input
        aria-label="Buscar"
        className="sidebar-search-input"
        placeholder="Buscar..."
        type="text"
      />
    ) : null}
  </div>
}
```

- [ ] **Paso 3: Pasar estado collapsed al componente sidebar y ocultar contenido de footer cuando esta colapsado**

```tsx
<SidebarNav
  collapsed={sidebarCollapsed}
  header={...}
  items={navItems}
  active={active}
  onChange={(key) => setActive(key as Section)}
  footer={
    !sidebarCollapsed ? (
      <div className="sidebar-footer-stack">
        ...
      </div>
    ) : null
  }
/>
```

## Tarea 2: Hacer Que La Navegacion Renderice Modo Solo-Icono De Forma Segura

**Archivos:**
- Modificar: `frontend/app/components/layout/SidebarNav.tsx`

- [ ] **Paso 1: Extender props con el flag collapsed**

```ts
type SidebarNavProps = {
  collapsed?: boolean
  header?: ReactNode
  items: SidebarNavItem[]
  active: string
  onChange: (key: string) => void
  footer?: ReactNode
}
```

- [ ] **Paso 2: Exponer estado collapsed en el `<aside>` y preservar nombres accesibles en botones**

```tsx
<aside className="sidebar" data-collapsed={collapsed ? 'true' : 'false'}>
```

```tsx
<button
  key={item.key}
  className={cx(active === item.key && 'active')}
  onClick={() => onChange(item.key)}
  type="button"
  aria-label={item.label}
  title={item.label}
>
  <Icon size={16} />
  {!collapsed ? item.label : null}
</button>
```

## Tarea 3: Colapsar Ancho Y Centrar Navegacion Solo-Icono

**Archivos:**
- Modificar: `frontend/app/styles/shell.css`

- [ ] **Paso 1: Agregar un stack chico para controles superiores y estilar el boton de colapso**

```css
.sidebar-top-stack {
  display: grid;
  gap: 10px;
}

.sidebar-collapse-toggle {
  justify-content: center;
  width: 100%;
}
```

- [ ] **Paso 2: Hacer que el sidebar expandido use ancho estable y definir el ancho colapsado**

```css
.sidebar {
  width: 220px;
}

.sidebar[data-collapsed='true'] {
  padding-inline: 10px;
  width: 72px;
}
```

- [ ] **Paso 3: Dejar que la nav ocupe el ancho del sidebar y centrar botones solo-icono en modo colapsado**

```css
.nav {
  width: 100%;
}

.sidebar[data-collapsed='true'] .nav button {
  justify-content: center;
  padding-inline: 0;
}
```

## Tarea 4: Verificar Que La Shell Siga Compilando

**Archivos:**
- Verificar: `frontend/app/page.tsx`
- Verificar: `frontend/app/components/layout/SidebarNav.tsx`
- Verificar: `frontend/app/styles/shell.css`

- [ ] **Paso 1: Correr el build frontend**

```powershell
cd frontend
npm run build
```

Esperado:
- los cambios de sidebar compilan
- si el build falla, confirmar si el error viene del patch de sidebar o de un archivo preexistente no relacionado

- [ ] **Paso 2: Verificar manualmente los dos estados visuales**

Chequear:
- modo expandido mantiene `Buscar...`, labels, theme toggle, `Salir` y `ShineApp`
- modo colapsado mantiene solo el boton superior de colapso y los iconos de navegacion
- click en el boton superior reabre el sidebar
