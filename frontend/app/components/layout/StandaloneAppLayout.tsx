'use client'

import {
	Bell,
	Building2,
	CalendarClock,
	CalendarDays,
	Car,
	CreditCard,
	FileText,
	Gauge,
	Hammer,
	Package,
	ReceiptText,
	Settings,
	Users,
	Wrench,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { AppBrand } from './AppBrand'
import { AppShell } from './AppShell'
import { SidebarNav, type SidebarNavItem } from './SidebarNav'
import { GlobalSearchInput } from '@/app/components/search/GlobalSearchInput'
import { useCurrentUser } from '@/lib/use-current-user'

const NAV_ITEMS: SidebarNavItem[] = [
	{ key: 'dashboard', label: 'Dashboard', icon: Gauge },
	{
		key: 'agenda',
		label: 'Agenda',
		icon: CalendarDays,
		children: [
			{ key: 'quotes', label: 'Cotizaciones', icon: FileText },
			{ key: 'notifications', label: 'Notificaciones', icon: Bell },
		],
	},
	{
		key: 'customers',
		label: 'Clientes',
		icon: Users,
		children: [{ key: 'vehicles', label: 'Vehículos', icon: Car }],
	},
	{
		key: 'cash',
		label: 'Caja',
		icon: CreditCard,
		children: [
			{ key: 'debts', label: 'Deudas', icon: ReceiptText },
			{ key: 'fixed-expenses', label: 'Gastos fijos', icon: CalendarClock },
			{ key: 'suppliers', label: 'Proveedores', icon: Building2 },
			{ key: 'inventory', label: 'Materiales', icon: Package },
			{ key: 'tools', label: 'Herramientas', icon: Hammer },
		],
	},
	{ key: 'services', label: 'Servicios', icon: Wrench },
	{ key: 'settings', label: 'Configuración', icon: Settings },
]

function handleNavChange(key: string) {
	window.location.href = `/?section=${key}`
}

type Props = {
	children: ReactNode
	title?: string
}

export function StandaloneAppLayout({ children, title }: Props) {
	const auth = useCurrentUser()

	if (auth.status === 'loading') {
		return (
			<main className="login-screen">
				<div className="login-card">
					<AppBrand subtitle="Cargando..." titleAs="span" />
				</div>
			</main>
		)
	}

	if (auth.status === 'unauthenticated') {
		if (typeof window !== 'undefined') {
			window.location.href = '/'
		}
		return null
	}

	return (
		<AppShell
			sidebar={
				<SidebarNav
					header={<GlobalSearchInput />}
					items={NAV_ITEMS}
					active=""
					onChange={handleNavChange}
				/>
			}
		>
			<div className="standalone-page">
				{title ? <h1 className="standalone-page-title">{title}</h1> : null}
				{children}
			</div>
		</AppShell>
	)
}
