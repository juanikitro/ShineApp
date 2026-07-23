'use client'

import { Panel } from '@/app/components/ui/Panel'
import {
	customerAverageGapText,
	customerDaysAgoText,
	customerScheduleLabel,
} from '@/lib/customer-display'
import { type AnyRecord, formatDateLabel, money } from '@/lib/page-support'

type CustomerOperationalSnapshotProps = {
	history: AnyRecord
	upcomingReservations: AnyRecord[]
	recentQuotes: AnyRecord[]
	useReservationTimes: boolean
}

export function CustomerOperationalSnapshot({
	history,
	upcomingReservations,
	recentQuotes,
	useReservationTimes,
}: CustomerOperationalSnapshotProps) {
	const insights = history.insights ?? {}
	const summary = history.summary ?? {}
	const nextReservation = insights.next_reservation ?? upcomingReservations[0] ?? null
	const latestQuote = recentQuotes[0] ?? null
	return (
		<Panel
			title="Estado del cliente"
			subtitle="Actividad, cobranza y oportunidades en una sola vista"
		>
			<div className="customer-dashboard-insights">
				<div className="customer-dashboard-card">
					<span>Ultima visita</span>
					<strong>
						{insights.last_visit_at
							? formatDateLabel(insights.last_visit_at)
							: 'Sin trabajos'}
					</strong>
					<small>
						{insights.last_visit_at
							? `${customerDaysAgoText(
										insights.days_since_last_visit,
									)} · ${insights.last_service_name || 'Sin servicio'} · ${
										insights.last_vehicle_label || 'Sin vehiculo'
									}`
							: 'Todavia no tiene trabajos registrados.'}
					</small>
				</div>
				<div className="customer-dashboard-card">
					<span>Proxima reserva</span>
					<strong>
						{customerScheduleLabel(nextReservation, useReservationTimes)}
					</strong>
					<small>
						{nextReservation
							? `${nextReservation.services} · ${nextReservation.vehicle}`
							: 'Sin agenda futura para este cliente.'}
					</small>
				</div>
				<div className="customer-dashboard-card">
					<span>Cotizaciones abiertas</span>
					<strong>{insights.open_quotes_count ?? 0}</strong>
					<small>
						{latestQuote
							? `Ultima ${formatDateLabel(latestQuote.quote_date)} · ${money(
										latestQuote.total,
									)}`
							: `${insights.quotes_total ?? 0} cotizaciones registradas`}
					</small>
				</div>
				<div className="customer-dashboard-card">
					<span>Trabajos con saldo</span>
					<strong>{insights.balance_due_work_orders_count ?? 0}</strong>
					<small>{`Saldo total ${money(summary.balance_due_total)}`}</small>
				</div>
				<div className="customer-dashboard-card">
					<span>Ticket promedio</span>
					<strong>{money(insights.average_ticket)}</strong>
					<small>
						{customerAverageGapText(insights.average_days_between_visits)}
					</small>
				</div>
				<div className="customer-dashboard-card">
					<span>Patron principal</span>
					<strong>
						{insights.preferred_service_name || 'Sin servicio frecuente'}
					</strong>
					<small>
						{insights.preferred_vehicle_label
							? `${insights.preferred_vehicle_label} · ${
										insights.preferred_brand_name || 'Sin marca'
									}`
							: 'Todavia no hay recurrencia suficiente.'}
					</small>
				</div>
			</div>
		</Panel>
	)
}
