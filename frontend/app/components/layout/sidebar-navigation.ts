import { type SidebarNavItem } from './SidebarNav'
import { sectionMeta, type Section } from '@/lib/page-support'

type SidebarNavigationOptions = {
	canViewEconomy: boolean
	pendingPublicRequestsCount: number
	pendingTasksCount: number
	overdueTasksCount: number
}

export function buildSidebarNavigation({
	canViewEconomy,
	pendingPublicRequestsCount,
	pendingTasksCount,
	overdueTasksCount,
}: SidebarNavigationOptions): SidebarNavItem[] {
	const buildNavItem = (key: Section): SidebarNavItem => ({
		key,
		label: sectionMeta[key].label,
		icon: sectionMeta[key].icon,
		badge:
			key === 'notifications' && pendingPublicRequestsCount
				? pendingPublicRequestsCount
				: key === 'tasks' && pendingTasksCount
					? pendingTasksCount
					: undefined,
		badgeVariant: key === 'tasks' && overdueTasksCount > 0 ? 'danger' : undefined,
	})

	return [
		buildNavItem('dashboard'),
		{
			...buildNavItem('agenda'),
			children: canViewEconomy
				? [buildNavItem('quotes'), buildNavItem('notifications')]
				: [],
		},
		{
			...buildNavItem('customers'),
			children: [buildNavItem('vehicles'), buildNavItem('services')],
		},
		...(canViewEconomy
			? [
					{
						...buildNavItem('cash'),
						children: [
							buildNavItem('debts'),
							buildNavItem('fixed-expenses'),
							buildNavItem('suppliers'),
							buildNavItem('inventory'),
							buildNavItem('tools'),
						],
					},
					buildNavItem('tasks'),
					buildNavItem('settings'),
				]
			: [buildNavItem('tasks')]),
	]
}
