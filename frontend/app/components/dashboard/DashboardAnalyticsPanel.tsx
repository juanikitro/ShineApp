import { type CSSProperties } from 'react'

import { Empty } from '@/app/components/ui/Empty'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'
import { RecordCard } from '@/app/components/ui/RecordCard'
import {
	type AnyRecord,
	formatDateLabel,
	money,
	numberValue,
	orderLabels,
} from '@/lib/page-support'

const WORKLOAD_STATUSES = ['in_progress', 'ready', 'delivered'] as const

const WORKLOAD_TONES: Record<string, string> = {
	in_progress: 'var(--color-warning)',
	ready: 'var(--color-info)',
	delivered: 'var(--color-success)',
}

function records(value: unknown): AnyRecord[] {
	return Array.isArray(value) ? value : []
}

function percent(value: number) {
	return `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

function percentagePoints(value: number) {
	return `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })} pp`
}

function moneyDelta(current: unknown, previous: unknown) {
	const difference = numberValue(current) - numberValue(previous)
	if (difference === 0) return 'Sin variación vs. período previo'
	return `${difference > 0 ? '+' : '-'}${money(Math.abs(difference))} vs. período previo`
}

function marginRate(value: unknown) {
	if (value === null || value === undefined) return 'Sin base'
	return percent(numberValue(value))
}

function marginRateDelta(value: unknown) {
	if (value === null || value === undefined) return 'Sin comparación previa'
	const delta = numberValue(value)
	return `${delta > 0 ? '+' : ''}${percentagePoints(delta)}`
}

function normalizedPoints(values: number[], minValue: number, maxValue: number) {
	if (!values.length || minValue === maxValue) return ''
	const denominator = Math.max(values.length - 1, 1)
	return values
		.map((value, index) => {
			const x = (index / denominator) * 100
			const y = 94 - ((value - minValue) / (maxValue - minValue)) * 82
			return `${x.toFixed(2)},${y.toFixed(2)}`
		})
		.join(' ')
}

function PeriodTrend({
	current,
	previous,
	valueKey,
	label,
}: {
	current: AnyRecord[]
	previous: AnyRecord[]
	valueKey: string
	label: string
}) {
	const currentValues = current.map((point) => numberValue(point[valueKey]))
	const previousValues = previous.map((point) => numberValue(point[valueKey]))
	const chartValues = [...currentValues, ...previousValues, 0]
	const minValue = Math.min(...chartValues)
	const maxValue = Math.max(...chartValues)
	const currentLine = normalizedPoints(currentValues, minValue, maxValue)
	const previousLine = normalizedPoints(previousValues, minValue, maxValue)
	const currentTotal = currentValues.reduce((total, value) => total + value, 0)
	const previousTotal = previousValues.reduce((total, value) => total + value, 0)

	return (
		<div className="dashboard-analytics-trend">
			<div className="dashboard-analytics-trend-head">
				<div>
					<span>{label}</span>
					<strong>{money(currentTotal)}</strong>
				</div>
				<small>{moneyDelta(currentTotal, previousTotal)}</small>
			</div>
			{currentLine || previousLine ? (
				<>
					<div className="dashboard-analytics-legend" aria-hidden="true">
						<span>Actual</span>
						{previousLine ? <span>Anterior</span> : null}
					</div>
					<svg
						aria-label={`${label}: comparación de período actual y anterior`}
						className="dashboard-analytics-chart"
						preserveAspectRatio="none"
						role="img"
						viewBox="0 0 100 100"
					>
						<line className="dashboard-analytics-chart-grid" x1="0" x2="100" y1="20" y2="20" />
						<line className="dashboard-analytics-chart-grid" x1="0" x2="100" y1="57" y2="57" />
						<line className="dashboard-analytics-chart-grid" x1="0" x2="100" y1="94" y2="94" />
						{previousLine ? (
							<polyline
								className="dashboard-analytics-chart-line dashboard-analytics-chart-line--previous"
								fill="none"
								points={previousLine}
							/>
						) : null}
						{currentLine ? (
							<polyline
								className="dashboard-analytics-chart-line"
								fill="none"
								points={currentLine}
							/>
						) : null}
					</svg>
				</>
			) : (
				<small className="dashboard-analytics-muted">Sin flujo registrado en este período.</small>
			)}
		</div>
	)
}

function funnelStage(label: string, value: unknown, total: number, tone: string) {
	const count = numberValue(value)
	const width = total > 0 ? Math.min(100, (count / total) * 100) : 0
	return (
		<div className="dashboard-analytics-funnel-stage" key={label}>
			<div>
				<span>{label}</span>
				<strong>{count}</strong>
			</div>
			<span
				aria-hidden="true"
				className="dashboard-analytics-funnel-bar"
				style={
					{
						['--analytics-share']: `${width}%`,
						['--analytics-fill']: tone,
					} as CSSProperties
				}
			/>
		</div>
	)
}

function currentPeriodLabel(dashboard: AnyRecord) {
	return `${formatDateLabel(dashboard.from)} a ${formatDateLabel(dashboard.to)}`
}

export function DashboardAnalyticsPanel({ dashboard }: { dashboard: AnyRecord }) {
	const analytics =
		dashboard.analytics && typeof dashboard.analytics === 'object' ? dashboard.analytics : null
	if (!analytics) {
		return (
			<Panel
				id="dashboard-analytics"
				title="Análisis operativo"
				subtitle="Esta vista se habilita con el resumen analítico del período."
			>
				<Empty
					text="No hay análisis disponible todavía."
					hint="Actualiza el dashboard para cargar comparativas, embudo comercial y carga operativa."
				/>
			</Panel>
		)
	}

	const currentSeries = records(dashboard.series?.points)
	const previousSeries = records(analytics.previous_series?.points)
	const serviceRows = records(analytics.service_comparison)
	const funnel =
		analytics.commercial_funnel && typeof analytics.commercial_funnel === 'object'
			? analytics.commercial_funnel
			: {}
	const recurrence =
		analytics.customer_recurrence && typeof analytics.customer_recurrence === 'object'
			? analytics.customer_recurrence
			: {}
	const workload =
		analytics.weekly_workload && typeof analytics.weekly_workload === 'object'
			? analytics.weekly_workload
			: {}
	const workloadWeeks = records(workload.weeks)
	const aging = records(dashboard.receivables_aging)
	const topCustomers = records(dashboard.rankings?.top_customers_by_billed)
	const billedTotal = numberValue(dashboard.billed_total ?? dashboard.sales_total)
	const marginTotal = numberValue(dashboard.estimated_margin_total)
	const cashBalance = numberValue(dashboard.cashflow_balance ?? dashboard.today_balance)
	const balanceDue = numberValue(dashboard.balance_due_total)
	const previous = dashboard.previous_period ?? {}
	const totalQuotes = numberValue(funnel.total_quotes)
	const acceptedQuotes = numberValue(funnel.accepted_quotes)
	const bookedQuotes = numberValue(funnel.booked_quotes)
	const deliveredQuotes = numberValue(funnel.delivered_quotes)
	const collectedQuotes = numberValue(funnel.collected_quotes)
	const bookingRate = totalQuotes > 0 ? (numberValue(funnel.booked_quotes) / totalQuotes) * 100 : 0
	const collectionRate = deliveredQuotes > 0 ? (collectedQuotes / deliveredQuotes) * 100 : 0
	const topService = serviceRows[0] ?? null
	const negativeMarginService = serviceRows.find(
		(service) => numberValue(service.margin_rate_delta_pp) < 0,
	)
	const insights = [
		totalQuotes > 0
			? `${acceptedQuotes} de ${totalQuotes} cotizaciones quedaron aceptadas; ${numberValue(funnel.booked_quotes)} ya tienen reserva.`
			: null,
		balanceDue > 0
			? `${money(balanceDue)} sigue facturado sin cobrar; la antigüedad detalla dónde priorizar.`
			: `${money(balanceDue)} facturado sin cobrar en el período.`,
		numberValue(recurrence.customers_count) > 0
			? `${percent(numberValue(recurrence.repeat_rate))} de los clientes del período ya tenía trabajo operativo anterior.`
			: null,
		negativeMarginService
			? `${negativeMarginService.service_name} bajó ${percentagePoints(
					Math.abs(numberValue(negativeMarginService.margin_rate_delta_pp)),
				)} en margen de materiales contra el período previo.`
			: topService
				? `${topService.service_name} concentra ${money(topService.current?.billed_total)} facturados en el período.`
				: null,
	].filter(Boolean)
	const operationRibbon = [
		{ label: 'Cotizadas', value: totalQuotes, detail: 'comercial', tone: 'var(--color-info)' },
		{ label: 'Aceptadas', value: acceptedQuotes, detail: 'decisión', tone: 'var(--color-primary)' },
		{ label: 'Con reserva', value: bookedQuotes, detail: 'agenda', tone: 'var(--color-warning)' },
		{
			label: 'Entregadas',
			value: deliveredQuotes,
			detail: 'operación',
			tone: 'var(--color-success)',
		},
		{ label: 'Sin saldo', value: collectedQuotes, detail: 'cobro', tone: 'var(--color-success)' },
	]

	return (
		<div
			aria-label="Análisis operativo del dashboard"
			className="dashboard-analytics"
			id="dashboard-analytics"
			role="tabpanel"
		>
			<Panel
				className="dashboard-analytics-hero"
				title="Análisis operativo"
				subtitle={`Compará el período ${currentPeriodLabel(dashboard)} sin perder la lectura de caja y ejecución.`}
			>
				<div className="dashboard-analytics-summary-grid">
					<MetricCard
						animateValue={false}
						hint={moneyDelta(billedTotal, previous.billed_total)}
						label="Facturado"
						value={money(billedTotal)}
					/>
					<MetricCard
						animateValue={false}
						hint={moneyDelta(marginTotal, previous.estimated_margin_total)}
						label="Margen estimado"
						value={money(marginTotal)}
					/>
					<MetricCard
						animateValue={false}
						hint={moneyDelta(cashBalance, previous.cashflow_balance)}
						label="Caja real"
						value={money(cashBalance)}
					/>
					<MetricCard
						animateValue={false}
						hint={`${acceptedQuotes} aceptadas · ${percent(bookingRate)} con reserva`}
						label="Embudo comercial"
						value={totalQuotes ? percent((acceptedQuotes / totalQuotes) * 100) : 'Sin cotizaciones'}
					/>
				</div>
				<div className="dashboard-analytics-ribbon" aria-label="Cinta de operación">
					<div className="dashboard-analytics-ribbon-head">
						<span>Cinta de operación</span>
						<small>Del interés comercial al cobro sin saldo.</small>
					</div>
					<div className="dashboard-analytics-ribbon-stages">
						{operationRibbon.map((stage) => (
							<div
								className="dashboard-analytics-ribbon-stage"
								key={stage.label}
								style={{ ['--analytics-ribbon-tone']: stage.tone } as CSSProperties}
							>
								<span>{stage.label}</span>
								<strong>{stage.value}</strong>
								<small>{stage.detail}</small>
							</div>
						))}
					</div>
				</div>
			</Panel>

			<Panel
				title="Pulso comparativo"
				subtitle="Evolución equivalente del período actual frente al anterior."
			>
				<div className="dashboard-analytics-trend-grid">
					<PeriodTrend
						current={currentSeries}
						label="Facturación"
						previous={previousSeries}
						valueKey="billed_total"
					/>
					<PeriodTrend
						current={currentSeries}
						label="Caja real"
						previous={previousSeries}
						valueKey="cashflow_balance"
					/>
				</div>
			</Panel>

			<div className="dashboard-analytics-split-grid">
				<Panel
					title="Embudo comercial"
					subtitle="Cada etapa cuenta una cotización, incluso si es grupal."
				>
					{totalQuotes ? (
						<>
							<div className="dashboard-analytics-funnel">
								{funnelStage('Cotizaciones', totalQuotes, totalQuotes, 'var(--color-info)')}
								{funnelStage(
									'Aceptadas',
									funnel.accepted_quotes,
									totalQuotes,
									'var(--color-primary)',
								)}
								{funnelStage(
									'Con reserva',
									funnel.booked_quotes,
									totalQuotes,
									'var(--color-warning)',
								)}
								{funnelStage(
									'Entregadas',
									funnel.delivered_quotes,
									totalQuotes,
									'var(--color-success)',
								)}
								{funnelStage(
									'Cobradas sin saldo',
									funnel.collected_quotes,
									totalQuotes,
									'var(--color-success)',
								)}
							</div>
							<div className="dashboard-analytics-funnel-footnote">
								<span>{numberValue(funnel.sent_quotes)} enviadas</span>
								<span>{numberValue(funnel.draft_quotes)} borradores</span>
								<span>{numberValue(funnel.rejected_quotes)} rechazadas</span>
								<strong>{percent(collectionRate)} cobradas tras entrega</strong>
							</div>
						</>
					) : (
						<Empty
							text="Sin cotizaciones en este período."
							hint="El embudo se completa cuando se registran cotizaciones individuales o grupales."
						/>
					)}
				</Panel>

				<Panel
					title="Clientes y recurrencia"
					subtitle="La recurrencia se calcula sobre trabajos operativos previos, no sobre contactos."
				>
					<div className="dashboard-analytics-recurrence">
						<div>
							<span>Clientes del período</span>
							<strong>{numberValue(recurrence.customers_count)}</strong>
						</div>
						<div>
							<span>Recurrentes</span>
							<strong>{numberValue(recurrence.recurring_customers_count)}</strong>
						</div>
						<div>
							<span>Tasa de repetición</span>
							<strong>{percent(numberValue(recurrence.repeat_rate))}</strong>
						</div>
					</div>
					{topCustomers.length ? (
						<div className="dashboard-analytics-top-customers">
							<span>Mayor facturación por cliente</span>
							{topCustomers.slice(0, 3).map((customer) => (
								<div key={customer.customer_id ?? customer.customer_name}>
									<span>{customer.customer_name}</span>
									<strong>{money(customer.billed_total)}</strong>
								</div>
							))}
						</div>
					) : null}
				</Panel>
			</div>

			<Panel
				title="Servicios: facturación y margen"
				subtitle="Margen estimado luego de materiales imputados; no reemplaza utilidad contable."
			>
				{serviceRows.length ? (
					<div className="dashboard-analytics-service-table">
						<div className="dashboard-analytics-service-head" aria-hidden="true">
							<span>Servicio</span>
							<span>Facturado actual</span>
							<span>Anterior</span>
							<span>Margen</span>
						</div>
						{serviceRows.map((service) => (
							<RecordCard
								className="dashboard-analytics-service-row"
								key={service.service_id ?? service.service_name}
							>
								<div className="dashboard-analytics-service-name">
									<span>{service.service_name}</span>
									<small>{numberValue(service.current?.work_orders_count)} trabajos actuales</small>
								</div>
								<strong>{money(service.current?.billed_total)}</strong>
								<span>{money(service.previous?.billed_total)}</span>
								<div className="dashboard-analytics-service-margin">
									<strong>{marginRate(service.current?.margin_rate)}</strong>
									<small>{marginRateDelta(service.margin_rate_delta_pp)}</small>
								</div>
							</RecordCard>
						))}
					</div>
				) : (
					<Empty text="Sin servicios operativos en este período." />
				)}
			</Panel>

			<div className="dashboard-analytics-split-grid">
				<Panel
					title="Carga semanal"
					subtitle="Órdenes ingresadas por semana y su estado actual, no cohortes históricas de entrega."
				>
					{workloadWeeks.length ? (
						<div className="dashboard-analytics-workload">
							{workloadWeeks.map((week) => {
								const enteredCount = numberValue(week.entered_count)
								const byStatus =
									week.by_status && typeof week.by_status === 'object' ? week.by_status : {}
								return (
									<div className="dashboard-analytics-workload-row" key={week.from}>
										<div>
											<span>
												{formatDateLabel(week.from)} a {formatDateLabel(week.to)}
											</span>
											<strong>{enteredCount} ingresadas</strong>
										</div>
										<div
											aria-label={`${enteredCount} órdenes ingresadas; estado actual distribuido entre proceso, listo y entregado`}
											className="dashboard-analytics-workload-bar"
											role="img"
										>
											{WORKLOAD_STATUSES.map((status) => {
												const label = orderLabels[status]
												const count = numberValue(byStatus[status])
												const width = enteredCount > 0 ? (count / enteredCount) * 100 : 0
												return (
													<span
														aria-label={`${label}: ${count}`}
														className="dashboard-analytics-workload-segment"
														key={status}
														style={
															{
																['--analytics-workload-share']: `${width}%`,
																['--analytics-workload-color']:
																	WORKLOAD_TONES[status] ?? 'var(--shop-border)',
															} as CSSProperties
														}
													/>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					) : (
						<Empty text="Sin órdenes ingresadas en este período." />
					)}
				</Panel>

				<Panel
					title="Caja y cuentas a cobrar"
					subtitle="Exposición actual por antigüedad de los saldos facturados."
				>
					<div className="dashboard-analytics-cash-summary">
						<div>
							<span>Facturado sin cobrar</span>
							<strong>{money(balanceDue)}</strong>
						</div>
						<div>
							<span>Cobrado en el período</span>
							<strong>{money(dashboard.collected_total)}</strong>
						</div>
					</div>
					{aging.length ? (
						<div className="dashboard-analytics-aging">
							{aging.map((bucket) => (
								<div key={bucket.id ?? bucket.label}>
									<span>{bucket.label}</span>
									<small>{numberValue(bucket.count)} trabajos</small>
									<strong>{money(bucket.amount)}</strong>
								</div>
							))}
						</div>
					) : (
						<Empty text="Sin saldos a cobrar." />
					)}
				</Panel>
			</div>

			<Panel
				className="dashboard-analytics-insights-panel"
				title="Lecturas derivadas"
				subtitle="Conclusiones descriptivas a partir de los datos disponibles, sin completar relaciones inexistentes."
			>
				{insights.length ? (
					<div className="dashboard-analytics-insights">
						{insights.map((insight) => (
							<RecordCard key={String(insight)}>{insight}</RecordCard>
						))}
					</div>
				) : (
					<Empty text="Todavía no hay suficiente actividad para una lectura derivada." />
				)}
				<p className="dashboard-analytics-limitations">
					No se muestran rentabilidad por técnico, metas configuradas ni cohortes históricas de
					entrega porque esos datos todavía no existen en el modelo.
				</p>
			</Panel>
		</div>
	)
}
