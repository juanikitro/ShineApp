import { ChevronDown } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'

import type { LucideIcon } from 'lucide-react'

import { cx } from '../utils'

export type SidebarNavItem = {
	key: string
	label: string
	icon: LucideIcon
	badge?: number
	children?: SidebarNavItem[]
}

type SidebarNavProps = {
	id?: string
	collapsed?: boolean
	mobileOpen?: boolean
	header?: ReactNode
	items: SidebarNavItem[]
	active: string
	onChange: (key: string) => void
	onItemHover?: (key: string) => void
	footer?: ReactNode
}

function hasActiveChild(item: SidebarNavItem, active: string): boolean {
	return Boolean(item.children?.some((child) => child.key === active))
}

function findActiveGroupKey(items: SidebarNavItem[], active: string): string | null {
	for (const item of items) {
		if (!item.children || item.children.length === 0) continue
		if (item.key === active || hasActiveChild(item, active)) {
			return item.key
		}
	}
	return null
}

export function SidebarNav({
	id,
	collapsed = false,
	mobileOpen = false,
	header,
	items,
	active,
	onChange,
	onItemHover,
	footer,
}: SidebarNavProps) {
	const activeGroup = findActiveGroupKey(items, active)
	const [openKeys, setOpenKeys] = useState<string[]>(() =>
		activeGroup ? [activeGroup] : [],
	)

	// Keep the group that contains the active section open (e.g. when the
	// section changes from outside the sidebar), without collapsing the rest.
	useEffect(() => {
		if (!activeGroup) return
		setOpenKeys((prev) =>
			prev.includes(activeGroup) ? prev : [...prev, activeGroup],
		)
	}, [activeGroup])

	const openSection = (key: string) =>
		setOpenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
	const toggleSection = (key: string) =>
		setOpenKeys((prev) =>
			prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key],
		)

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
					const isActive = active === item.key
					const childActive = hasActiveChild(item, active)
					const hasChildren = Boolean(item.children && item.children.length > 0)
					const expanded = hasChildren && openKeys.includes(item.key)

					if (!hasChildren) {
						return (
							<button
								key={item.key}
								className={cx(isActive && 'active')}
								onClick={() => onChange(item.key)}
								onMouseEnter={() => onItemHover?.(item.key)}
								onFocus={() => onItemHover?.(item.key)}
								type="button"
								aria-label={item.label}
								aria-current={isActive ? 'page' : undefined}
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
					}

					return (
						<div key={item.key} className="nav-parent-group">
							<div className="nav-parent-header">
								<button
									className={cx(
										(isActive || childActive) && 'active',
										'nav-parent-button',
									)}
									onClick={() => {
										onChange(item.key)
										openSection(item.key)
									}}
									onMouseEnter={() => onItemHover?.(item.key)}
									onFocus={() => onItemHover?.(item.key)}
									type="button"
									aria-label={item.label}
									aria-current={isActive ? 'page' : undefined}
									title={item.label}
								>
									<Icon size={16} />
									{!collapsed ? (
										<span className="nav-parent-label">{item.label}</span>
									) : null}
									{item.badge ? (
										<span
											className="nav-badge"
											aria-label={`${item.badge} pendientes`}
										>
											{item.badge > 99 ? '99+' : item.badge}
										</span>
									) : null}
								</button>
								{!collapsed ? (
									<button
										className="nav-parent-toggle"
										onClick={() => toggleSection(item.key)}
										type="button"
										aria-label={`${expanded ? 'Contraer' : 'Expandir'} ${item.label}`}
										aria-expanded={expanded}
										title={`${expanded ? 'Contraer' : 'Expandir'} ${item.label}`}
									>
										<ChevronDown
											size={13}
											aria-hidden="true"
											className={cx(
												'nav-parent-chevron',
												expanded && 'nav-parent-chevron--open',
											)}
										/>
									</button>
								) : null}
							</div>
							{expanded ? (
								<div className="nav-children" role="group">
									{item.children!.map((child) => {
										const ChildIcon = child.icon
										const isChildActive = active === child.key
										return (
											<button
												key={child.key}
												className={cx('nav-child', isChildActive && 'active')}
												onClick={() => onChange(child.key)}
												onMouseEnter={() => onItemHover?.(child.key)}
												onFocus={() => onItemHover?.(child.key)}
												type="button"
												aria-label={child.label}
												aria-current={isChildActive ? 'page' : undefined}
												title={child.label}
											>
												<ChildIcon size={14} />
												{!collapsed ? child.label : null}
												{child.badge ? (
													<span
														className="nav-badge"
														aria-label={`${child.badge} pendientes`}
													>
														{child.badge > 99 ? '99+' : child.badge}
													</span>
												) : null}
											</button>
										)
									})}
								</div>
							) : null}
						</div>
					)
				})}
			</nav>
			{footer ? <div className="sidebar-footer">{footer}</div> : null}
		</aside>
	)
}
