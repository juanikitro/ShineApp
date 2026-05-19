import { ReactNode } from 'react'

import type { LucideIcon } from 'lucide-react'

import { cx } from '../utils'

export type SidebarNavItem = {
	key: string
	label: string
	icon: LucideIcon
	badge?: number
}

type SidebarNavProps = {
	id?: string
	collapsed?: boolean
	mobileOpen?: boolean
	header?: ReactNode
	items: SidebarNavItem[]
	active: string
	onChange: (key: string) => void
	footer?: ReactNode
}

export function SidebarNav({
	id,
	collapsed = false,
	mobileOpen = false,
	header,
	items,
	active,
	onChange,
	footer,
}: SidebarNavProps) {
	return (
		<aside
			id={id}
			className="sidebar"
			data-collapsed={collapsed ? 'true' : 'false'}
			data-mobile-open={mobileOpen ? 'true' : 'false'}
			aria-label="Navegacion principal"
		>
			{header ? <div className="sidebar-top">{header}</div> : null}
			<nav className="nav" aria-label="Secciones">
				{items.map((item) => {
					const Icon = item.icon
					return (
						<button
							key={item.key}
							className={cx(active === item.key && 'active')}
							onClick={() => onChange(item.key)}
							type="button"
							aria-label={item.label}
							aria-current={active === item.key ? 'page' : undefined}
							title={item.label}
						>
							<Icon size={16} />
							{!collapsed ? item.label : null}
							{item.badge ? (
								<span className="nav-badge" aria-label={`${item.badge} pendientes`}>
									{item.badge > 99 ? '99+' : item.badge}
								</span>
							) : null}
						</button>
					)
				})}
			</nav>
			{footer ? <div className="sidebar-footer">{footer}</div> : null}
		</aside>
	)
}
