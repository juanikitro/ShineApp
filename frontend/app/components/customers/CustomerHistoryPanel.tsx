'use client'

import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { type AnyRecord, formatDateLabel, money } from '@/lib/page-support'

type CustomerHistoryPanelProps = {
	loading: boolean
	history: AnyRecord | null | undefined
	orderLabels: Record<string, string>
	onOpenOrder: (order: AnyRecord) => void
}

export function CustomerHistoryPanel({
	loading,
	history,
	orderLabels,
	onOpenOrder,
}: CustomerHistoryPanelProps) {
	if (loading) {
		return <LoadingState text="Cargando historial del cliente..." />
	}
	if (!history) {
		return <div className="info-note">Historial economico no disponible.</div>
	}
	const summary = history.summary ?? {}
	const orders = history.work_orders ?? []
	return (
		<div className="customer-history">
			<div className="material-summary">
				<div className="material-kpi">
					<span>Trabajos</span>
					<strong>{summary.work_orders_count ?? 0}</strong>
				</div>
				<div className="material-kpi">
					<span>Cobrado</span>
					<strong>{money(summary.paid_total)}</strong>
				</div>
				<div className="material-kpi">
					<span>Gastado</span>
					<strong>{money(summary.material_cost_total)}</strong>
				</div>
				<div className="material-kpi">
					<span>Margen</span>
					<strong>{money(summary.margin_total)}</strong>
				</div>
			</div>
			<div className="linked-records">
				<div className="linked-records-head">
					<strong>Historial de trabajos</strong>
					<span>{orders.length} registros</span>
				</div>
				{orders.length ? (
					orders.map((order: AnyRecord) => (
						<button
							className="linked-record"
							key={`customer-history-${order.id}`}
							onClick={() => onOpenOrder(order)}
							type="button"
						>
							<strong>
								{order.service} - {order.vehicle}
							</strong>
							<small>
								{orderLabels[order.status] ?? order.status} -{' '}
								{formatDateLabel(order.received_at)} - cobrado{' '}
								{money(order.paid_amount)} - materiales{' '}
								{money(order.material_cost)}
							</small>
						</button>
					))
				) : (
					<Empty text="Este cliente todavia no tiene trabajos." />
				)}
			</div>
		</div>
	)
}
