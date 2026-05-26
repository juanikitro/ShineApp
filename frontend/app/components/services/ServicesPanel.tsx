'use client'

import { type ReactNode } from 'react'

import { ChevronLeft, Plus } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { RecordCardHeader } from '@/app/components/ui/RecordCard'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { joinDisplayParts } from '@/lib/display-text'
import { serviceDisplayName } from '@/lib/service-display'
import {
	formatDateLabel,
	formatDateTimeLabel,
	money,
	type AnyRecord,
} from '@/lib/page-support'

type ServicesPanelProps = {
	canViewEconomy: boolean
	orderLabels: Record<string, string>
	quoteStatusLabels: Record<string, string>
	quotes: AnyRecord[]
	reservationLabels: Record<string, string>
	reservations: AnyRecord[]
	serviceDashboard: AnyRecord | null
	serviceDashboardHistory: AnyRecord | null
	serviceDashboardLoading: boolean
	serviceQuickActions: (service: AnyRecord) => QuickAction[]
	serviceTypeLabels: Record<string, string>
	services: AnyRecord[]
	workOrders: AnyRecord[]
	customerDaysAgoText: (value: any, fallback: string) => string
	customerScheduleLabel: (reservation: AnyRecord | null | undefined) => string
	quickActionTargetProps: (title: string, actions: QuickAction[]) => AnyRecord
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	renderCustomerRankingPanel: (
		title: string,
		rows: AnyRecord[],
		labelKey: string,
		emptyText: string,
	) => ReactNode
	renderQuickActionsTrigger: (
		label: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	onBackToServices: () => void
	onCreateService: () => void
	onDeleteService: (service: AnyRecord) => void
	onOpenQuoteDetail: (quote: AnyRecord) => void
	onOpenReservationDetail: (reservation: AnyRecord) => void
	onOpenServiceDashboard: (service: AnyRecord) => void
	onOpenServiceDetail: (service: AnyRecord) => void
	onOpenWorkOrderDetail: (order: AnyRecord) => void
}

export function ServicesPanel({
	canViewEconomy,
	orderLabels,
	quoteStatusLabels,
	quotes,
	reservationLabels,
	reservations,
	serviceDashboard,
	serviceDashboardHistory,
	serviceDashboardLoading,
	serviceQuickActions,
	serviceTypeLabels,
	services,
	workOrders,
	customerDaysAgoText,
	customerScheduleLabel,
	quickActionTargetProps,
	recordClass,
	renderCustomerRankingPanel,
	renderQuickActionsTrigger,
	onBackToServices,
	onCreateService,
	onDeleteService,
	onOpenQuoteDetail,
	onOpenReservationDetail,
	onOpenServiceDashboard,
	onOpenServiceDetail,
	onOpenWorkOrderDetail,
}: ServicesPanelProps) {
	function renderServiceOperationalSnapshot(
		history: AnyRecord,
		upcomingReservations: AnyRecord[],
		recentQuotes: AnyRecord[],
	) {
		const insights = history.insights ?? {}
		const summary = history.summary ?? {}
		const nextReservation =
			insights.next_reservation ?? upcomingReservations[0] ?? null
		const latestQuote = recentQuotes[0] ?? null
		return (
			<Panel
				title="Estado del servicio"
				subtitle="Carga operativa, venta y apariciones adicionales"
			>
				<div className="customer-dashboard-insights">
					<div className="customer-dashboard-card">
						<span>Ultimo uso</span>
						<strong>
							{insights.last_used_at
								? formatDateLabel(insights.last_used_at)
								: 'Sin trabajos'}
						</strong>
						<small>
							{insights.last_used_at
								? `${customerDaysAgoText(
										insights.days_since_last_use,
										'Sin dato',
									)} · ${insights.last_customer_name || 'Sin cliente'} · ${
										insights.last_vehicle_label || 'Sin vehiculo'
									}`
								: 'Todavia no tiene ordenes principales registradas.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Proxima reserva</span>
						<strong>{customerScheduleLabel(nextReservation)}</strong>
						<small>
							{nextReservation
								? `${nextReservation.customer} · ${nextReservation.vehicle}`
								: 'Sin agenda futura como servicio principal.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Trabajos activos</span>
						<strong>{summary.active_work_orders_count ?? 0}</strong>
						<small>{`Facturado ${money(summary.sales_total)}`}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Cotizaciones abiertas</span>
						<strong>{summary.open_quotes_count ?? 0}</strong>
						<small>
							{latestQuote
								? `Ultima ${formatDateLabel(latestQuote.quote_date)} · ${money(
										latestQuote.total,
									)}`
								: `${summary.quotes_total ?? 0} cotizaciones con este servicio`}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Ticket promedio</span>
						<strong>{money(insights.average_ticket)}</strong>
						<small>{`${summary.work_orders_count ?? 0} trabajos historicos`}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Uso adicional/combo</span>
						<strong>
							{(summary.additional_reservation_items_count ?? 0) +
								(summary.quote_item_usages_count ?? 0)}
						</strong>
						<small>{`Reservas ${
							summary.additional_reservation_items_count ?? 0
						} · Cotizaciones ${summary.quote_item_usages_count ?? 0}`}</small>
					</div>
				</div>
			</Panel>
		)
	}

	function renderServiceUpcomingReservations(reservationsRows: AnyRecord[]) {
		return (
			<Panel
				title="Proximas reservas"
				subtitle={`${reservationsRows.length} reservas visibles`}
			>
				<div className="records compact-records">
					{reservationsRows.length ? (
						reservationsRows.map((reservation: AnyRecord) => {
							const detailReservation =
								reservations.find(
									(item) => String(item.id) === String(reservation.id),
								) ?? reservation
							return (
								<button
									className="record compact"
									key={`service-reservation-${reservation.id}`}
									onClick={() => onOpenReservationDetail(detailReservation)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												{reservation.customer} - {reservation.vehicle}
											</div>
											<div className="record-sub">
												{customerScheduleLabel(reservation)} -{' '}
												{reservation.services}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill
												value={reservation.status}
												labels={reservationLabels}
											/>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio no tiene reservas futuras." />
					)}
				</div>
			</Panel>
		)
	}

	function renderServiceActiveWorkOrders(orders: AnyRecord[]) {
		return (
			<Panel
				title="Trabajos activos"
				subtitle={`${orders.length} trabajos principales en curso`}
			>
				<div className="records compact-records">
					{orders.length ? (
						orders.map((order: AnyRecord) => {
							const detailOrder =
								workOrders.find(
									(item) => String(item.id) === String(order.id),
								) ?? order
							return (
								<button
									className="record compact"
									key={`service-workorder-${order.id}`}
									onClick={() => onOpenWorkOrderDetail(detailOrder)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												{order.customer_name} - {order.vehicle_label}
											</div>
											<div className="record-sub">
												{formatDateTimeLabel(order.received_at)} - cobrado{' '}
												{money(order.paid_amount)} - saldo{' '}
												{money(order.balance_due)} - materiales{' '}
												{money(order.material_cost)}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill value={order.status} labels={orderLabels} />
											<span className="status payment">
												{money(order.total_amount)}
											</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio no tiene trabajos activos." />
					)}
				</div>
			</Panel>
		)
	}

	function renderServiceRecentQuotes(quotesRows: AnyRecord[]) {
		return (
			<Panel
				title="Cotizaciones recientes"
				subtitle={`${quotesRows.length} cotizaciones con este servicio`}
			>
				<div className="records compact-records">
					{quotesRows.length ? (
						quotesRows.map((quote: AnyRecord) => {
							const detailQuote =
								quotes.find((item) => String(item.id) === String(quote.id)) ??
								quote
							return (
								<button
									className="record compact"
									key={`service-quote-${quote.id}`}
									onClick={() => onOpenQuoteDetail(detailQuote)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												Cotizacion {quote.public_code ?? `#${quote.id}`} -{' '}
												{quote.customer}
											</div>
											<div className="record-sub">
												{formatDateLabel(quote.quote_date)} -{' '}
												{quote.vehicle || 'Sin vehiculo'} - {quote.services}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill
												value={quote.status}
												labels={quoteStatusLabels}
											/>
											<span className="status payment">
												{money(quote.total)}
											</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio todavia no tiene cotizaciones." />
					)}
				</div>
			</Panel>
		)
	}

	if (serviceDashboard && canViewEconomy) {
		const hasDashboardHistory = Boolean(serviceDashboardHistory)
		const history = serviceDashboardHistory ?? {}
		const service = history.service ?? serviceDashboard
		const summary = history.summary ?? {}
		const topCustomers = history.top_customers ?? []
		const topVehicles = history.top_vehicles ?? []
		const upcomingReservations = history.upcoming_reservations ?? []
		const activeOrders = history.active_work_orders ?? []
		const recentQuotes = history.recent_quotes ?? []

		return (
			<div className="grid customer-dashboard service-dashboard">
				<Panel>
					<div className="customer-dashboard-head service-dashboard-head">
						<button type="button" className="ghost" onClick={onBackToServices}>
							<ChevronLeft size={16} />
							Servicios
						</button>
						<div>
							<h2>{serviceDisplayName(service)}</h2>
							<p>Dashboard especifico del servicio</p>
						</div>
						<button
							type="button"
							className="ghost"
							onClick={() => onOpenServiceDetail(service)}
						>
							Editar servicio
						</button>
					</div>
					<div className="customer-dashboard-profile service-dashboard-profile">
						<div>
							<span>Tipo</span>
							<strong>
								{serviceTypeLabels[service.service_type] ??
									service.service_type ??
									'Sin tipo'}
							</strong>
						</div>
						<div>
							<span>Precio base</span>
							<strong>{money(service.base_price)}</strong>
						</div>
						<div>
							<span>Duracion estimada</span>
							<strong>{service.estimated_duration_minutes ?? 0} min</strong>
						</div>
						<div>
							<span>Estado</span>
							<strong>
								{service.is_active === false ? 'Inactivo' : 'Activo'}
							</strong>
						</div>
						<div>
							<span>Notas</span>
							<strong>{service.notes || 'Sin notas'}</strong>
						</div>
					</div>
				</Panel>

				{serviceDashboardLoading ? (
					<LoadingState text="Cargando dashboard del servicio..." />
				) : null}

				{!serviceDashboardLoading && !hasDashboardHistory ? (
					<div className="info-note">
						No se pudo cargar el historial operativo del servicio. El
						listado sigue disponible para evitar datos incompletos.
					</div>
				) : null}

				{hasDashboardHistory ? (
					<>
						<div className="customer-dashboard-metrics service-dashboard-metrics">
							<MetricCard
								label="Ventas"
								value={money(summary.sales_total ?? summary.billed_total)}
							/>
							<MetricCard label="Cobrado" value={money(summary.paid_total)} />
							<MetricCard
								label="Saldo"
								value={money(summary.balance_due_total)}
							/>
							<MetricCard
								label="Materiales"
								value={money(summary.material_cost_total)}
							/>
							<MetricCard label="Margen" value={money(summary.margin_total)} />
							<MetricCard
								label="Trabajos"
								value={summary.work_orders_count ?? 0}
							/>
						</div>

						{renderServiceOperationalSnapshot(
							history,
							upcomingReservations,
							recentQuotes,
						)}

						<div className="grid two">
							{renderCustomerRankingPanel(
								'Clientes frecuentes',
								topCustomers,
								'name',
								'Este servicio todavia no tiene clientes frecuentes.',
							)}
							{renderCustomerRankingPanel(
								'Vehiculos frecuentes',
								topVehicles,
								'label',
								'Este servicio todavia no tiene vehiculos frecuentes.',
							)}
						</div>

						<div className="grid two">
							{renderServiceUpcomingReservations(upcomingReservations)}
							{renderServiceRecentQuotes(recentQuotes)}
						</div>

						{renderServiceActiveWorkOrders(activeOrders)}
					</>
				) : null}
			</div>
		)
	}

	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<div>
						<h2>Servicios</h2>
						<p>
							Lavados, detailing y combos disponibles para reservas y
							cotizaciones.
						</p>
					</div>
					<button type="button" className="primary" onClick={onCreateService}>
						<Plus size={16} />
						Nuevo servicio
					</button>
				</div>
				<div className="records">
					{services.length ? (
						services.map((item) => {
							const quickActions = serviceQuickActions(item)
							return (
								<MotionFlashSurface
									className={recordClass('service', item.id)}
									key={item.id}
									{...quickActionTargetProps(
										'Acciones de servicio',
										quickActions,
									)}
								>
									{renderQuickActionsTrigger(
										'Acciones de servicio',
										quickActions,
										'Acciones rapidas de servicio',
									)}
									<RecordCardHeader
										title={serviceDisplayName(item)}
										subtitle={joinDisplayParts([
											serviceTypeLabels[item.service_type],
											money(item.base_price),
											`${item.estimated_duration_minutes} min`,
										])}
										primaryAction={{
											ariaLabel: `Abrir servicio ${serviceDisplayName(item)}`,
											onClick: () => onOpenServiceDashboard(item),
										}}
										actions={
											<>
												<button
													type="button"
													className="ghost"
													onClick={() => onOpenServiceDetail(item)}
												>
													Editar
												</button>
												<button
													type="button"
													className="danger"
													onClick={() => onDeleteService(item)}
												>
													Inactivar
												</button>
											</>
										}
									/>
								</MotionFlashSurface>
							)
						})
					) : (
						<Empty
							text="Sin servicios."
							hint="Crea el primer servicio para reservar o cotizar."
						/>
					)}
				</div>
			</section>
		</div>
	)
}
