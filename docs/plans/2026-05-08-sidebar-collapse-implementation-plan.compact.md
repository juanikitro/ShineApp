# Plan De Implementacion: Colapsar Sidebar

> **Workers agenticos:** SUB-SKILL REQUERIDA: `superpowers:subagent-driven-development` recomendado, o `superpowers:executing-plans`. Implementar tarea por tarea. Checkboxes (`- [ ]`) para tracking.

**Objetivo:** Agregar toggle de sidebar: colapsar shell a nav solo-icono y volver al layout completo actual.

**Arquitectura:** Feature local al seam de shell. Guardar `sidebarCollapsed` en `frontend/app/page.tsx`; pasar a `SidebarNav.tsx` para labels/accesibilidad; manejar ancho/alineacion en `frontend/app/styles/shell.css`.

**Tech Stack:** Next.js App Router, estado React 19 en `frontend/app/page.tsx`, TypeScript, partials CSS globales en `frontend/app/styles/`.

---

## Restricciones

- Sin backend, rutas nuevas ni llamadas API.
- Sin persistencia en esta iteracion.
- Modo colapsado: solo control colapsar/expandir + iconos nav visibles.
- Preservar teclado con `aria-label` y `title` en botones solo-icono.

## Archivos

- `frontend/app/page.tsx`
  Responsabilidad: estado collapsed, toggle superior, ocultar header/footer cuando colapsa.

- `frontend/app/components/layout/SidebarNav.tsx`
  Responsabilidad: props collapsed, estado hacia CSS, labels ocultos con nombres accesibles.

- `frontend/app/styles/shell.css`
  Responsabilidad: ancho reducido, nav solo-icono centrada, estilo de toggle sin romper expanded.

## Tarea 1: Estado Y Wiring

**Archivos:**
- Modificar: `frontend/app/page.tsx`

- [ ] **Paso 1: Agregar estado local collapsed cerca de estado UI de shell**

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
```

- [ ] **Paso 2: Header sidebar: toggle siempre, `Buscar...` solo expandido**

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

- [ ] **Paso 3: Pasar collapsed al sidebar; ocultar footer colapsado**

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

## Tarea 2: Navegacion Solo-Icono Segura

**Archivos:**
- Modificar: `frontend/app/components/layout/SidebarNav.tsx`

- [ ] **Paso 1: Extender props con collapsed**

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

- [ ] **Paso 2: Estado en `<aside>` y nombres accesibles**

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

## Tarea 3: Ancho Colapsado Y Nav Centrada

**Archivos:**
- Modificar: `frontend/app/styles/shell.css`

- [ ] **Paso 1: Stack top y boton colapso**

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

- [ ] **Paso 2: Ancho estable expandido y ancho colapsado**

```css
.sidebar {
  width: 220px;
}

.sidebar[data-collapsed='true'] {
  padding-inline: 10px;
  width: 72px;
}
```

- [ ] **Paso 3: Nav full width y botones centrados colapsados**

```css
.nav {
  width: 100%;
}

.sidebar[data-collapsed='true'] .nav button {
  justify-content: center;
  padding-inline: 0;
}
```

## Tarea 4: Verificar Compilacion

**Archivos:**
- Verificar: `frontend/app/page.tsx`
- Verificar: `frontend/app/components/layout/SidebarNav.tsx`
- Verificar: `frontend/app/styles/shell.css`

- [ ] **Paso 1: Build frontend**

```powershell
cd frontend
npm run build
```

Esperado:
- cambios sidebar compilan
- si falla, distinguir patch sidebar vs error preexistente no relacionado

- [ ] **Paso 2: Smoke visual**

Chequear:
- expandido mantiene `Buscar...`, labels, theme toggle, `Salir`, `ShineApp`
- colapsado mantiene solo boton superior e iconos nav
- click en boton superior reabre sidebar
