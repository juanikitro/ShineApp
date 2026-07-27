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

const WORKLOAD_STATUSES = [
	'pending',
	'confirmed',
	'in_progress',
	'ready',
	'delivered',
	'canceled',
] as const

const WORKLOAD_TONES: Record<string, string> = {
	pending: 'var(--shop-ink-muted)',
	confirmed: 'var(--color-info)',
	in_progress: 'var(--color-warning)',
	ready: 'var(--color-info)',
	delivered: 'var(--color-success)',
	canceled: 'var(--color-danger)',
}

const COMPOSITION_TONES = [
	'var(--color-primary)',
	'var(--color-info)',
	'var(--color-success)',
	'var(--color-warning)',
	'var(--shop-ink-muted)',
]

const AGING_TONES: Record<string, string> = {
	'0_7': 'var(--color-info)',
	'8_15': 'var(--color-warning)',
	'16_30': 'var(--color-warning)',
	'31_plus': 'var(--color-danger)',
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

function proportionalShare(value: unknown, total: unknown) {
	const numerator = Math.max(numberValue(value), 0)
	const denominator = Math.max(numberValue(total), 0)
	if (!denominator) return 0
	return Math.min(100, (numerator / denominator) * 100)
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

function PeriodComparisonBars({
	current,
	previous,
}: {
	current: AnyRecord[]
	previous: AnyRecord[]
}) {
	const pointCount = Math.max(current.length, previous.length)
	const points = Array.from({ length: pointCount }, (_, index) => ({
		current: numberValue(current[index]?.billed_total),
		previous: numberValue(previous[index]?.billed_total),
		date: current[index]?.date ?? previous[index]?.date,
	}))
	const maxValue = Math.max(...points.flatMap((point) => [point.current, point.previous]), 0)
	const hasActivity = points.some((point) => point.current > 0 || point.previous > 0)

	if (!hasActivity) {
		return <Empty text="Sin facturación comparable en los períodos seleccionados." />
	}

	return (
		<div className="dashboard-analytics-bar-comparison">
			<div className="dashboard-analytics-legend" aria-hidden="true">
				<span>Actual</span>
				<span>Anterior</span>
			</div>
			<div
				aria-label="Facturación actual y período anterior por tramo"
				className="dashboard-analytics-period-bars"
				role="img"
			>
				{points.map((point, index) => (
					<div className="dashboard-analytics-period-bar-group" key={`${point.date}-${index}`}>
						<div className="dashboard-analytics-period-bar-pair" aria-hidden="true">
							<span
								className="dashboard-analytics-period-bar"
								style={
									{
										['--analytics-bar-height']: `${proportionalShare(point.current, maxValue)}%`,
									} as CSSProperties
								}
							/>
							<span
								className="dashboard-analytics-period-bar dashboard-analytics-period-bar--previous"
								style={
									{
										['--analytics-bar-height']: `${proportionalShare(point.previous, maxValue)}%`,
									} as CSSProperties
								}
							/>
						</div>
						<small>{point.date ? formatDateLabel(point.date) : `Tramo ${index + 1}`}</small>
					</div>
				))}
			</div>
		</div>
	)
}

type CompositionSlice = {
	label: string
	tone: string
	value: number
}

function compositionSlices(services: AnyRecord[]): CompositionSlice[] {
	const rows = services
		.map((service) => ({
			label: String(service.service_name ?? 'Servicio sin nombre'),
			value: Math.max(numberValue(service.current?.billed_total), 0),
		}))
		.filter((service) => service.value > 0)
	const primaryRows = rows.slice(0, 4)
	const otherTotal = rows.slice(4).reduce((total, service) => total + service.value, 0)
	const composed = otherTotal
		? [...primaryRows, { label: 'Otros servicios', value: otherTotal }]
		: primaryRows

	return composed.map((service, index) => ({
		...service,
		tone: COMPOSITION_TONES[index % COMPOSITION_TONES.length],
	}))
}

function ServiceCompositionChart({ services }: { services: AnyRecord[] }) {
	const slices = compositionSlices(services)
	const total = slices.reduce((sum, slice) => sum + slice.value, 0)
	const radius = 38
	const circumference = 2 * Math.PI * radius
	let offset = 0

	if (!total) {
		return <Empty text="Sin servicios facturados para componer en este período." />
	}

	return (
		<div className="dashboard-analytics-composition">
			<svg
				aria-label="Composición del facturado por servicio"
				className="dashboard-analytics-donut"
				role="img"
				viewBox="0 0 100 100"
			>
				<circle className="dashboard-analytics-donut-track" cx="50" cy="50" r={radius} />
				{slices.map((slice) => {
					const dash = (slice.value / total) * circumference
					const dashOffset = -offset
					offset += dash
					return (
						<circle
							className="dashboard-analytics-donut-segment"
							cx="50"
							cy="50"
							key={slice.label}
							r={radius}
							stroke={slice.tone}
							strokeDasharray={`${dash} ${circumference - dash}`}
							strokeDashoffset={dashOffset}
						/>
					)
				})}
				<text className="dashboard-analytics-donut-value" x="50" y="48">
					{money(total)}
				</text>
				<text className="dashboard-analytics-donut-label" x="50" y="59">
					facturado
				</text>
			</svg>
			<div className="dashboard-analytics-composition-legend">
				{slices.map((slice) => (
					<div key={slice.label}>
						<span
							aria-hidden="true"
							className="dashboard-analytics-composition-swatch"
							style={{ ['--analytics-composition-tone']: slice.tone } as CSSProperties}
						/>
						<span>{slice.label}</span>
						<strong>{percent((slice.value / total) * 100)}</strong>
					</div>
				))}
			</div>
		</div>
	)
}

function TicketComparison({
	current,
	previous,
	hasPrevious,
}: {
	current: unknown
	previous: unknown
	hasPrevious: boolean
}) {
	const currentValue = Math.max(numberValue(current), 0)
	const previousValue = Math.max(numberValue(previous), 0)
	const maxValue = Math.max(currentValue, previousValue, 1)
	const values = [
		{ label: 'Actual', value: currentValue, tone: 'current' },
		{ label: 'Anterior', value: previousValue, tone: 'previous' },
	]

	return (
		<div
			aria-label="Comparación del ticket promedio actual y anterior"
			className="dashboard-analytics-ticket"
			role="img"
		>
			<div className="dashboard-analytics-ticket-head">
				<strong>{money(currentValue)}</strong>
				<small>
					{hasPrevious
						? moneyDelta(currentValue, previousValue)
						: 'Sin ticket promedio previo disponible'}
				</small>
			</div>
			<div className="dashboard-analytics-ticket-bars" aria-hidden="true">
				{values.map((value) => (
					<div key={value.label}>
						<span>{value.label}</span>
						<i
							className={`dashboard-analytics-ticket-bar dashboard-analytics-ticket-bar--${value.tone}`}
							style={
								{
									['--analytics-ticket-share']: `${proportionalShare(value.value, maxValue)}%`,
								} as CSSProperties
							}
						/>
						<strong>{money(value.value)}</strong>
					</div>
				))}
			</div>
		</div>
	)
}

function WorkloadEvolution({ weeks }: { weeks: AnyRecord[] }) {
	const hasActivity = weeks.some((week) => numberValue(week.entered_count) > 0)
	if (!hasActivity) {
		return <Empty text="Sin órdenes ingresadas en este período." />
	}

	const maxEntered = Math.max(...weeks.map((week) => numberValue(week.entered_count)), 1)
	const activeStatuses = WORKLOAD_STATUSES.filter((status) =>
		weeks.some((week) => numberValue(week.by_status?.[status]) > 0),
	)

	return (
		<div className="dashboard-analytics-workload-evolution">
			<div className="dashboard-analytics-workload-legend" aria-hidden="true">
				{activeStatuses.map((status) => (
					<span key={status}>
						<i
							style={
								{
									['--analytics-workload-color']: WORKLOAD_TONES[status] ?? 'var(--shop-border)',
								} as CSSProperties
							}
						/>
						{orderLabels[status]}
					</span>
				))}
			</div>
			<div
				aria-label="Evolución semanal de trabajos por estado actual"
				className="dashboard-analytics-workload-columns"
				role="img"
			>
				{weeks.map((week, index) => {
					const enteredCount = numberValue(week.entered_count)
					const byStatus =
						week.by_status && typeof week.by_status === 'object' ? week.by_status : {}
					const statuses: Array<{ count: number; status: string }> = WORKLOAD_STATUSES.map(
						(status) => ({
							status,
							count: numberValue(byStatus[status]),
						}),
					).filter((entry) => entry.count > 0)
					const registeredCount = statuses.reduce((total, entry) => total + entry.count, 0)
					const unclassifiedCount = Math.max(enteredCount - registeredCount, 0)
					if (unclassifiedCount) {
						statuses.push({ status: 'unclassified', count: unclassifiedCount })
					}
					const columnTotal = Math.max(
						enteredCount,
						statuses.reduce((total, entry) => total + entry.count, 0),
						1,
					)

					return (
						<div className="dashboard-analytics-workload-column-group" key={week.from ?? index}>
							<strong>{enteredCount}</strong>
							<div
								aria-hidden="true"
								className="dashboard-analytics-workload-column"
								style={
									{
										['--analytics-workload-height']: `${proportionalShare(
											enteredCount,
											maxEntered,
										)}%`,
									} as CSSProperties
								}
							>
								{statuses.map((entry) => (
									<span
										className="dashboard-analytics-workload-column-segment"
										key={entry.status}
										style={
											{
												['--analytics-workload-color']:
													WORKLOAD_TONES[entry.status] ?? 'var(--shop-ink-muted)',
												['--analytics-workload-share']: `${proportionalShare(
													entry.count,
													columnTotal,
												)}%`,
											} as CSSProperties
										}
									/>
								))}
							</div>
							<small>{week.from ? formatDateLabel(week.from) : `Semana ${index + 1}`}</small>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function marginMeter(value: unknown) {
	if (value === null || value === undefined) return null
	const rate = numberValue(value)
	return (
		<span
			aria-hidden="true"
			className="dashboard-analytics-margin-meter"
			style={
				{
					['--analytics-margin-share']: `${Math.min(Math.max(rate, 0), 100)}%`,
					['--analytics-margin-tone']: rate < 0 ? 'var(--color-danger)' : 'var(--color-success)',
				} as CSSProperties
			}
		/>
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
	const agingMax = Math.max(...aging.map((bucket) => numberValue(bucket.amount)), 0)
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

			<div className="dashboard-analytics-financial-grid">
				<Panel
					title="Facturado vs. período anterior"
					subtitle="Comparación por tramo equivalente; las barras no mezclan acumulados con flujo diario."
				>
					<PeriodComparisonBars current={currentSeries} previous={previousSeries} />
				</Panel>
				<Panel
					title="Composición del facturado"
					subtitle="Participación por servicio a partir de los trabajos facturados."
				>
					<ServiceCompositionChart services={serviceRows} />
				</Panel>
				<Panel
					title="Ticket promedio"
					subtitle="Facturado dividido por órdenes operativas del período."
				>
					<TicketComparison
						current={dashboard.average_ticket}
						hasPrevious={previous.average_ticket !== undefined && previous.average_ticket !== null}
						previous={previous.average_ticket}
					/>
				</Panel>
			</div>

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
				title="Margen por servicio"
				subtitle="Margen estimado luego de materiales imputados; no reemplaza utilidad contable."
			>
				{serviceRows.length ? (
					<div className="dashboard-analytics-service-table">
						<div className="dashboard-analytics-service-head" aria-hidden="true">
							<span>Servicio</span>
							<span>Facturado actual</span>
							<span>Anterior</span>
							<span>Margen de materiales</span>
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
									{marginMeter(service.current?.margin_rate)}
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
					title="Evolución de trabajos"
					subtitle="Órdenes ingresadas por semana y su estado actual, no cohortes históricas de entrega."
				>
					<WorkloadEvolution weeks={workloadWeeks} />
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
							{aging.map((bucket) => {
								const amount = numberValue(bucket.amount)
								return (
									<div key={bucket.id ?? bucket.label}>
										<span>{bucket.label}</span>
										<small>{numberValue(bucket.count)} trabajos</small>
										<strong>{money(amount)}</strong>
										<i
											aria-hidden="true"
											className="dashboard-analytics-aging-bar"
											style={
												{
													['--analytics-aging-share']: `${proportionalShare(amount, agingMax)}%`,
													['--analytics-aging-tone']:
														AGING_TONES[String(bucket.id ?? '')] ?? 'var(--color-info)',
												} as CSSProperties
											}
										/>
									</div>
								)
							})}
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
