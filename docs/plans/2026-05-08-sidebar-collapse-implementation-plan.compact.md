# Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sidebar toggle: collapse shell to icon-only nav; expand back to current full layout.

**Architecture:** Keep feature local to shell seam. Store `sidebarCollapsed` in `frontend/app/page.tsx`; pass to `SidebarNav.tsx` for label rendering and accessibility; drive width/alignment from `frontend/app/styles/shell.css`.

**Tech Stack:** Next.js App Router, React 19 state in `frontend/app/page.tsx`, TypeScript, global CSS partials in `frontend/app/styles/`.

---

## Constraints

- Do not add backend changes, new routes, or API calls.
- Do not add persistence in this iteration.
- Collapsed mode: only collapse/expand control + nav icons visible.
- Preserve keyboard accessibility with `aria-label` and `title` on icon-only buttons.

## File Structure

### Files to modify

- `frontend/app/page.tsx`
  Responsibility: own collapsed state, wire top toggle, hide footer/header content when collapsed.

- `frontend/app/components/layout/SidebarNav.tsx`
  Responsibility: accept collapsed props, expose state to CSS, hide nav labels in collapsed mode, preserve accessible names.

- `frontend/app/styles/shell.css`
  Responsibility: reduce sidebar width, center icon-only nav, style collapse toggle without disturbing expanded layout.

## Task 1: Add collapsed sidebar state and wiring

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Add local collapsed state near other shell-level UI state**

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
```

- [ ] **Step 2: Build sidebar header: toggle always renders; `Buscar...` only expanded**

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

- [ ] **Step 3: Pass collapsed state into sidebar; hide footer content when collapsed**

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

## Task 2: Make navigation render icon-only mode safely

**Files:**
- Modify: `frontend/app/components/layout/SidebarNav.tsx`

- [ ] **Step 1: Extend props with collapsed flag**

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

- [ ] **Step 2: Expose collapsed state on `<aside>`; preserve accessible names on buttons**

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

## Task 3: Collapse width and center icon-only navigation

**Files:**
- Modify: `frontend/app/styles/shell.css`

- [ ] **Step 1: Add top-controls stack; style collapse button**

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

- [ ] **Step 2: Stable expanded width; define collapsed width**

```css
.sidebar {
  width: 220px;
}

.sidebar[data-collapsed='true'] {
  padding-inline: 10px;
  width: 72px;
}
```

- [ ] **Step 3: Nav fills sidebar; center icon-only buttons collapsed**

```css
.nav {
  width: 100%;
}

.sidebar[data-collapsed='true'] .nav button {
  justify-content: center;
  padding-inline: 0;
}
```

## Task 4: Verify the shell still compiles

**Files:**
- Verify: `frontend/app/page.tsx`
- Verify: `frontend/app/components/layout/SidebarNav.tsx`
- Verify: `frontend/app/styles/shell.css`

- [ ] **Step 1: Run frontend build**

```powershell
cd frontend
npm run build
```

Expected:
- sidebar changes compile
- if build fails, confirm whether error comes from sidebar patch or pre-existing unrelated file

- [ ] **Step 2: Manually verify two visual states**

Check:
- expanded mode keeps `Buscar...`, labels, theme toggle, `Salir`, and `ShineApp`
- collapsed mode keeps only top collapse button and navigation icons
- clicking top button reopens sidebar
