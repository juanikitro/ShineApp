import { ReactNode } from 'react'

import type { LucideIcon } from 'lucide-react'

import { cx } from '../utils'

export type SidebarNavItem = {
	key: string
	label: string
	icon: LucideIcon
}

type SidebarNavProps = {
	collapsed?: boolean
	header?: ReactNode
	items: SidebarNavItem[]
	active: string
	onChange: (key: string) => void
	footer?: ReactNode
}

export function SidebarNav({
	collapsed = false,
	header,
	items,
	active,
	onChange,
	footer,
}: SidebarNavProps) {
	return (
		<aside
			className="sidebar"
			data-collapsed={collapsed ? 'true' : 'false'}
		>
			{header ? <div className="sidebar-top">{header}</div> : null}
			<nav className="nav">
				{items.map((item) => {
					const Icon = item.icon
					return (
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
					)
				})}
			</nav>
			{footer ? <div className="sidebar-footer">{footer}</div> : null}
		</aside>
	)
}
