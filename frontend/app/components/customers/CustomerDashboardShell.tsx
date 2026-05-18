'use client'

import { type ReactNode } from 'react'

import { ChevronLeft, Pencil } from 'lucide-react'

import { ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'

export type CustomerDashboardMetric = {
	key: string
	label: ReactNode
	value: ReactNode
}

export type CustomerDashboardProfileItem = {
	key: string
	label: string
	value: ReactNode
}

type CustomerDashboardShellProps = {
	title: ReactNode
	subtitle: string
	birthdayBadge?: ReactNode
	profileItems: CustomerDashboardProfileItem[]
	metrics: CustomerDashboardMetric[]
	isLoading: boolean
	hasHistory: boolean
	onBack: () => void
	onEdit: () => void
	children: ReactNode
}

export function CustomerDashboardShell({
	title,
	subtitle,
	birthdayBadge,
	profileItems,
	metrics,
	isLoading,
	hasHistory,
	onBack,
	onEdit,
	children,
}: CustomerDashboardShellProps) {
	return (
		<div className="grid customer-dashboard">
			<Panel className="customer-dashboard-hero-panel">
				<div className="customer-dashboard-head">
					<button
						type="button"
						className="ghost customer-dashboard-back"
						onClick={onBack}
					>
						<ChevronLeft size={16} />
						Clientes
					</button>
					<div className="customer-dashboard-title">
						<span className="panel-kicker">Dashboard de cliente</span>
						<h2>{title}</h2>
						<p>{subtitle}</p>
						{birthdayBadge}
					</div>
					<div className="customer-dashboard-actions">
						<button type="button" className="ghost" onClick={onEdit}>
							<Pencil size={15} />
							Editar cliente
						</button>
					</div>
				</div>
				<div className="customer-dashboard-profile">
					{profileItems.map((item) => (
						<div key={item.key}>
							<span>{item.label}</span>
							<strong>{item.value}</strong>
						</div>
					))}
				</div>
			</Panel>

			{isLoading ? (
				<LoadingState text="Cargando dashboard del cliente..." />
			) : null}

			{!isLoading && !hasHistory ? (
				<ErrorState
					text="No se pudo cargar el historial economico del cliente."
					hint="El perfil sigue disponible, pero no se muestran ventas, pagos ni rankings para evitar datos incompletos."
					action={
						<button type="button" className="ghost" onClick={onBack}>
							Volver al listado
						</button>
					}
				/>
			) : null}

			{hasHistory ? (
				<>
					<div className="customer-dashboard-metrics">
						{metrics.map((metric) => (
							<MetricCard
								key={metric.key}
								label={metric.label}
								value={metric.value}
							/>
						))}
					</div>
					{children}
				</>
			) : null}
		</div>
	)
}
