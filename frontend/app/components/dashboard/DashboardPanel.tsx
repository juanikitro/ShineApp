'use client'

import { type ReactNode } from 'react'

import { CalendarDays, CreditCard, Info } from 'lucide-react'

import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'
import { RecordCard } from '@/app/components/ui/RecordCard'
import { cx } from '@/app/components/utils'
import {
	type AnyRecord,
	type Section,
	formatDateLabel,
	money,
	numberValue,
	orderLabels,
	quantity,
	sectionMeta,
} from '@/lib/page-support'
import { serviceDisplayName } from '@/lib/service-display'

type DashboardPanelProps = {
	birthdayAlerts: ReactNode
	canViewEconomy: boolean
	dashboard: AnyRecord
	loading: boolean
	onOpenPaymentForOrder: (workOrder: AnyRecord) => void
	onOpenSection: (section: Section) => void
}

function dashboardCountText(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`
}

function dashboardTarget(record: AnyRecord): Section | null {
	const section = String(record.action_section ?? '')
	return section in sectionMeta ? (section as Section) : null
}

export function DashboardPanel({
	birthdayAlerts,
	canViewEconomy,
	dashboard,
	loading,
	onOpenPaymentForOrder,
	onOpenSection,
}: DashboardPanelProps) {
	const dashboardWorkStatusEntries = Object.entries(orderLabels)
	const dashboardWorkStatusTotal = dashboardWorkStatusEntries.reduce(
		(total, [key]) => total + numberValue(dashboard.work_orders_by_status?.[key]),
		0,
	)
	const dashboardWorkOrdersTotal = Math.max(
		numberValue(dashboard.work_orders_count),
		dashboardWorkStatusTotal,
	)
	const dashboardPreviousPeriod = dashboard.previous_period ?? {}
	const dashboardBilledTotal = numberValue(
		dashboard.billed_total ?? dashboard.sales_total,
	)
	const dashboardCollectedTotal = numberValue(
		dashboard.collected_total ?? dashboard.sales_total,
	)
	const dashboardBalanceDueTotal = numberValue(dashboard.balance_due_total)
	const dashboardBalanceDueWorkOrdersCount = numberValue(
		dashboard.work_orders_with_balance_due_count,
	)
	const dashboardMaterialCostTotal = numberValue(
		dashboard.material_cost_total ??
			dashboard.material_consumption_estimated,
	)
	const dashboardEstimatedMarginTotal = numberValue(
		dashboard.estimated_margin_total,
	)
	const dashboardCashflowIncomeTotal = numberValue(
		dashboard.cashflow_income_total ?? dashboard.today_income,
	)
	const dashboardCashflowExpenseTotal = numberValue(
		dashboard.cashflow_expense_total ?? dashboard.today_expense,
	)
	const dashboardCashflowBalance = numberValue(
		dashboard.cashflow_balance ?? dashboard.today_balance,
	)
	const dashboardOverdueDebtsTotal = numberValue(dashboard.overdue_debts_total)
	const dashboardOverdueDebtsCount = numberValue(dashboard.overdue_debts_count)
	const dashboardMaterialPurchasesTotal = numberValue(
		dashboard.material_purchases_total,
	)
	const dashboardEconomicAlerts = Array.isArray(dashboard.economic_alerts)
		? dashboard.economic_alerts
		: []
	const dashboardEconomicInsights = Array.isArray(dashboard.economic_insights)
		? dashboard.economic_insights
		: []
	const dashboardTopReceivables = Array.isArray(dashboard.top_receivables)
		? dashboard.top_receivables
		: []
	const dashboardReceivablesAging = Array.isArray(dashboard.receivables_aging)
		? dashboard.receivables_aging
		: []
	const dashboardDebtTiming =
		dashboard.debt_timing && typeof dashboard.debt_timing === 'object'
			? dashboard.debt_timing
			: {}
	const dashboardDebtOverdue = dashboardDebtTiming.overdue ?? {}
	const dashboardDebtDueSoon = dashboardDebtTiming.due_soon ?? {}
	const dashboardMarginBasis =
		dashboard.margin_basis && typeof dashboard.margin_basis === 'object'
			? dashboard.margin_basis
			: {}
	const dashboardDataQuality =
		dashboard.data_quality && typeof dashboard.data_quality === 'object'
			? dashboard.data_quality
			: {}
	const dashboardComparison =
		dashboard.comparison && typeof dashboard.comparison === 'object'
			? dashboard.comparison
			: {}
	const dashboardRankings =
		dashboard.rankings && typeof dashboard.rankings === 'object'
			? dashboard.rankings
			: {}
	const dashboardTopCustomersByBilled = Array.isArray(
		dashboardRankings.top_customers_by_billed,
	)
		? dashboardRankings.top_customers_by_billed
		: []
	const dashboardTopServicesByBilled = Array.isArray(
		dashboardRankings.top_services_by_billed,
	)
		? dashboardRankings.top_services_by_billed
		: []
	const dashboardTopWorkOrdersByMargin = Array.isArray(
		dashboardRankings.top_work_orders_by_margin,
	)
		? dashboardRankings.top_work_orders_by_margin
		: []
	const dashboardTopMaterialsByCost = Array.isArray(
		dashboardRankings.top_materials_by_cost,
	)
		? dashboardRankings.top_materials_by_cost
		: []
	const dashboardPreviousHasActivity =
		dashboardPreviousPeriod.has_activity === true ||
		(dashboardPreviousPeriod.has_activity !== false &&
			[
				'billed_total',
				'collected_total',
				'balance_due_total',
				'material_cost_total',
				'cashflow_balance',
			].some((field) => numberValue(dashboardPreviousPeriod[field]) !== 0))
	const dashboardHasBusinessActivity =
		dashboard.has_activity === true ||
		dashboardWorkOrdersTotal > 0 ||
		dashboardBilledTotal > 0 ||
		dashboardCollectedTotal > 0 ||
		dashboardBalanceDueTotal > 0 ||
		dashboardMaterialCostTotal > 0 ||
		dashboardMaterialPurchasesTotal > 0 ||
		dashboardCashflowIncomeTotal > 0 ||
		dashboardCashflowExpenseTotal > 0 ||
		dashboardOverdueDebtsTotal > 0 ||
		dashboardEconomicAlerts.length > 0
	const dashboardEmptyPeriod =
		String(dashboardDataQuality.state ?? '') === 'empty' &&
		!dashboardHasBusinessActivity
	const dashboardFirstReceivableWorkOrder =
		dashboardTopReceivables.reduce<AnyRecord | null>((selected, item) => {
			if (selected) return selected
			return Array.isArray(item.work_orders)
				? item.work_orders[0] ?? null
				: null
		}, null)
	const dashboardNextAction = dashboardFirstReceivableWorkOrder
		? {
				title: 'Cobrar saldo mas antiguo',
				detail: 'Hay trabajos con saldo pendiente y accion directa de cobro.',
				label: 'Cobrar ahora',
				icon: CreditCard,
				tone: 'attention',
				onSelect: () =>
					onOpenPaymentForOrder(dashboardFirstReceivableWorkOrder),
			}
		: dashboardOverdueDebtsTotal > 0
			? {
					title: 'Revisar deudas vencidas',
					detail: `${dashboardOverdueDebtsCount} ${
						dashboardOverdueDebtsCount === 1 ? 'deuda vencida' : 'deudas vencidas'
					} en el periodo.`,
					label: 'Ver deudas',
					icon: CreditCard,
					tone: 'attention',
					onSelect: () => onOpenSection('debts'),
				}
			: dashboardWorkOrdersTotal === 0
				? {
						title: 'Crear actividad del periodo',
						detail: 'Agenda el proximo trabajo para activar indicadores operativos.',
						label: 'Ir a Agenda',
						icon: CalendarDays,
						tone: 'neutral',
						onSelect: () => onOpenSection('agenda'),
					}
				: {
						title: 'Mantener la agenda al dia',
						detail: `${dashboardCountText(
							dashboardWorkOrdersTotal,
							'trabajo registrado',
							'trabajos registrados',
						)} en el periodo seleccionado.`,
						label: 'Ver Agenda',
						icon: CalendarDays,
						tone: 'neutral',
						onSelect: () => onOpenSection('agenda'),
					}
	const DashboardNextActionIcon = dashboardNextAction.icon

	function dashboardDeltaHint(
		current: any,
		previous: any,
		options: {
			label?: string
			polarity?: 'higher-is-good' | 'higher-is-bad' | 'neutral'
			hasPreviousActivity?: boolean
			metricKey?: string
		} = {},
	) {
		const {
			label = 'vs periodo anterior',
			polarity = 'higher-is-good',
			hasPreviousActivity = dashboardPreviousHasActivity,
			metricKey,
		} = options
		const comparisonMetric =
			metricKey && dashboardComparison[metricKey]
				? dashboardComparison[metricKey]
				: null
		const metricHasPreviousActivity =
			comparisonMetric?.has_previous_activity ?? hasPreviousActivity
		const metricPolarity =
			comparisonMetric?.polarity === 'higher-is-bad' ||
			comparisonMetric?.polarity === 'neutral' ||
			comparisonMetric?.polarity === 'higher-is-good'
				? comparisonMetric.polarity
				: polarity
		if (metricHasPreviousActivity === false) {
			return <span className="dashboard-delta">Sin actividad previa</span>
		}
		const previousInput = comparisonMetric?.previous ?? previous
		if (
			previousInput === undefined ||
			previousInput === null ||
			previousInput === ''
		) {
			return <span className="dashboard-delta">Sin comparacion previa</span>
		}
		const currentValue = numberValue(comparisonMetric?.current ?? current)
		const previousValue = numberValue(previousInput)
		const delta =
			comparisonMetric && comparisonMetric.delta !== undefined
				? numberValue(comparisonMetric.delta)
				: currentValue - previousValue
		if (previousValue === 0 && delta === 0) {
			return <span className="dashboard-delta">Sin variacion {label}</span>
		}
		const semanticDirection =
			metricPolarity === 'neutral'
				? 'flat'
				: metricPolarity === 'higher-is-bad'
					? delta > 0
						? 'down'
						: delta < 0
							? 'up'
							: 'flat'
					: delta > 0
						? 'up'
						: delta < 0
							? 'down'
							: 'flat'
		if (previousValue === 0) {
			return (
				<span
					className={cx(
						'dashboard-delta',
						`dashboard-delta--${semanticDirection}`,
					)}
				>
					Nuevo {label}
				</span>
			)
		}
		const percentValue =
			comparisonMetric?.delta_percent !== undefined &&
			comparisonMetric?.delta_percent !== null
				? Math.abs(numberValue(comparisonMetric.delta_percent))
				: Math.abs((delta / previousValue) * 100)
		const percent = percentValue.toLocaleString('es-AR', {
			maximumFractionDigits: 1,
		})
		const prefix = delta > 0 ? '+' : delta < 0 ? '-' : ''
		return (
			<span
				className={cx('dashboard-delta', `dashboard-delta--${semanticDirection}`)}
			>
				{prefix}
				{percent}% {label}
			</span>
		)
	}

	return (
		<div className="grid">
			{canViewEconomy ? (
				<>
					{loading && !dashboardHasBusinessActivity ? (
						<LoadingState
							text="Cargando indicadores del negocio..."
							hint="Mantenemos el tablero visible mientras llegan ventas, trabajos y caja."
						/>
					) : null}
					{!loading && dashboardEmptyPeriod ? (
						<Panel
							title="Sin actividad economica en el periodo"
							subtitle={String(
								dashboardDataQuality.message ??
									'No hay trabajos, pagos ni movimientos economicos en este rango.',
							)}
						>
							<Empty
								text="No hay datos para leer todavia."
								hint="Cambia el rango o registra trabajos, cobros y movimientos para activar la cabina economica."
								action={
									<button
										type="button"
										className="primary"
										onClick={() => onOpenSection('agenda')}
									>
										<CalendarDays size={16} />
										Ir a Agenda
									</button>
								}
							/>
						</Panel>
					) : null}
					{(!loading || dashboardHasBusinessActivity) &&
					!dashboardEmptyPeriod ? (
						<>
							<section className="dashboard-executive-grid">
								<MetricCard
									className="dashboard-executive-metric"
									label="Facturado"
									value={money(dashboardBilledTotal)}
									hint={dashboardDeltaHint(
										dashboardBilledTotal,
										dashboardPreviousPeriod.billed_total,
										{ metricKey: 'billed_total' },
									)}
								/>
								<MetricCard
									className="dashboard-executive-metric"
									label="Margen estimado"
									value={money(dashboardEstimatedMarginTotal)}
									hint={dashboardDeltaHint(
										dashboardEstimatedMarginTotal,
										dashboardPreviousPeriod.estimated_margin_total,
										{ metricKey: 'estimated_margin_total' },
									)}
								/>
								<MetricCard
									className="dashboard-executive-metric"
									label="Caja real"
									value={money(dashboardCashflowBalance)}
									hint={dashboardDeltaHint(
										dashboardCashflowBalance,
										dashboardPreviousPeriod.cashflow_balance,
										{ metricKey: 'cashflow_balance' },
									)}
								/>
								<MetricCard
									className={cx(
										'dashboard-executive-metric',
										dashboardBalanceDueTotal > 0 && 'metric--attention',
									)}
									label="Por cobrar"
									value={money(dashboardBalanceDueTotal)}
									hint={dashboardCountText(
										dashboardBalanceDueWorkOrdersCount,
										'trabajo con saldo',
										'trabajos con saldo',
									)}
								/>
							</section>
							<Panel
								className="dashboard-next-action-panel"
								title="Siguiente accion"
								subtitle="Prioridad operativa sugerida para este periodo."
							>
								<RecordCard
									className={cx(
										'dashboard-next-action',
										dashboardNextAction.tone === 'attention' &&
											'dashboard-next-action--attention',
									)}
								>
									<div className="dashboard-next-action-main">
										<span className="dashboard-next-action-icon" aria-hidden="true">
											<DashboardNextActionIcon size={16} />
										</span>
										<div className="dashboard-next-action-copy">
											<strong>{dashboardNextAction.title}</strong>
											<span>{dashboardNextAction.detail}</span>
										</div>
									</div>
									<button
										type="button"
										className="ghost"
										onClick={dashboardNextAction.onSelect}
									>
										{dashboardNextAction.label}
									</button>
								</RecordCard>
							</Panel>
							<div className="dashboard-insight-grid">
								<Panel
									title="Composicion economica"
									subtitle="Separacion entre facturado, cobrado, costos y obligaciones."
								>
									<div className="dashboard-composition-grid">
										<MetricCard
											label="Cobrado"
											value={money(dashboardCollectedTotal)}
											hint="Pagos registrados en el periodo"
										/>
										<MetricCard
											label="Materiales consumidos"
											value={money(dashboardMaterialCostTotal)}
											hint="Costo estimado imputado a trabajos"
										/>
										<MetricCard
											label="Compras materiales"
											value={money(dashboardMaterialPurchasesTotal)}
											hint="Reposicion e insumos del periodo"
										/>
										<MetricCard
											className={
												dashboardOverdueDebtsTotal > 0
													? 'metric--attention'
													: ''
											}
											label="Deudas vencidas"
											value={money(dashboardOverdueDebtsTotal)}
											hint={`${dashboardOverdueDebtsCount} pendientes`}
										/>
									</div>
									<div className="dashboard-economy-note">
										<Info size={16} />
										<div>
											<strong>
												{dashboardMarginBasis.label ??
													'Margen estimado por materiales'}
											</strong>
											<p>
												{dashboardMarginBasis.detail ??
													'El margen descuenta materiales imputados; no reemplaza la utilidad contable final.'}
											</p>
										</div>
									</div>
									<div className="dashboard-aging-grid">
										<div className="dashboard-aging-panel">
											<div className="dashboard-section-kicker">
												<span>Antiguedad por cobrar</span>
											</div>
											{dashboardReceivablesAging.length ? (
												<div className="dashboard-aging-bars">
													{dashboardReceivablesAging.map(
														(bucket: AnyRecord) => (
															<div
																className="dashboard-aging-row"
																key={bucket.id ?? bucket.label}
															>
																<span>{bucket.label}</span>
																<strong>{money(bucket.amount)}</strong>
																<small>
																	{dashboardCountText(
																		numberValue(bucket.count),
																		'trabajo',
																		'trabajos',
																	)}
																</small>
															</div>
														),
													)}
												</div>
											) : (
												<Empty text="Sin saldos a cobrar." />
											)}
										</div>
										<div className="dashboard-aging-panel">
											<div className="dashboard-section-kicker">
												<span>Deudas operativas</span>
											</div>
											<div className="dashboard-debt-timing">
												<div>
													<span>Vencidas</span>
													<strong>{money(dashboardDebtOverdue.amount)}</strong>
													<small>
														{dashboardCountText(
															numberValue(dashboardDebtOverdue.count),
															'deuda',
															'deudas',
														)}
													</small>
												</div>
												<div>
													<span>Por vencer</span>
													<strong>{money(dashboardDebtDueSoon.amount)}</strong>
													<small>
														{dashboardCountText(
															numberValue(dashboardDebtDueSoon.count),
															'deuda',
															'deudas',
														)}
													</small>
												</div>
											</div>
										</div>
									</div>
								</Panel>
								<div className="dashboard-side-stack">
									<Panel
										title="Alertas economicas"
										subtitle={
											dashboardEconomicAlerts.length
												? 'Prioridades para cobrar, pagar o corregir.'
												: 'Sin alertas economicas activas para el periodo.'
										}
									>
										{dashboardEconomicAlerts.length ? (
											<div className="records dashboard-alert-records">
												{dashboardEconomicAlerts.map((alert: AnyRecord) => {
													const target = dashboardTarget(alert)
													return (
														<RecordCard
															className={cx(
																'dashboard-alert-record',
																`dashboard-alert-record--${
																	alert.severity ?? 'warning'
																}`,
															)}
															key={alert.id ?? alert.title}
														>
															<div className="record-head">
																<div>
																	<span>{alert.title}</span>
																	<small>{alert.detail}</small>
																</div>
																<strong className="dashboard-alert-amount">
																	{money(alert.amount)}
																</strong>
															</div>
															{target ? (
																<button
																	type="button"
																	className="ghost"
																	onClick={() => onOpenSection(target)}
																>
																	{alert.action_label ??
																		`Ver ${sectionMeta[target].label}`}
																</button>
															) : null}
														</RecordCard>
													)
												})}
											</div>
										) : (
											<Empty
												text="Sin alertas economicas."
												hint="Cuando haya saldos a cobrar, caja negativa o deudas vencidas, van a aparecer aca."
											/>
										)}
										{dashboardEconomicInsights.length ? (
											<div className="dashboard-insights">
												<h3>Lectura rapida</h3>
												<div className="records dashboard-insight-records">
													{dashboardEconomicInsights.map((insight: AnyRecord) => {
														const target = dashboardTarget(insight)
														return (
															<RecordCard
																className="dashboard-insight-record"
																key={insight.id ?? insight.title}
															>
																<div>
																	<span>{insight.title}</span>
																	<small>{insight.detail}</small>
																</div>
																{target ? (
																	<button
																		type="button"
																		className="ghost"
																		onClick={() => onOpenSection(target)}
																	>
																		Ver {sectionMeta[target].label}
																	</button>
																) : null}
															</RecordCard>
														)
													})}
												</div>
											</div>
										) : null}
										{dashboardTopReceivables.length ? (
											<div className="dashboard-receivables">
												<h3>A cobrar primero</h3>
												<div className="records dashboard-receivable-records">
													{dashboardTopReceivables.map((item: AnyRecord) => (
														<RecordCard
															className="dashboard-receivable-record"
															key={item.customer_id ?? item.customer_name}
														>
															<div className="record-head">
																<div>
																	<span>{item.customer_name}</span>
																	<small>
																		{dashboardCountText(
																			numberValue(item.work_orders_count),
																			'trabajo con saldo',
																			'trabajos con saldo',
																		)}
																		{numberValue(item.oldest_balance_days) > 0
																			? ` - mas antiguo ${numberValue(
																					item.oldest_balance_days,
																				)} dias`
																			: ''}
																	</small>
																</div>
																<strong>{money(item.balance_due_total)}</strong>
															</div>
															{Array.isArray(item.work_orders) &&
															item.work_orders.length ? (
																<div className="dashboard-receivable-workorders">
																	{item.work_orders.map((workOrder: AnyRecord) => (
																		<div
																			className="dashboard-receivable-workorder"
																			key={workOrder.id}
																		>
																			<div>
																				<span>
																					#{workOrder.id} -{' '}
																					{serviceDisplayName(workOrder)}
																				</span>
																				<small>
																					{workOrder.vehicle_label} -{' '}
																					{numberValue(workOrder.age_days)} dias
																				</small>
																			</div>
																			<strong>{money(workOrder.balance_due)}</strong>
																			<button
																				type="button"
																				className="ghost"
																				onClick={() =>
																					onOpenPaymentForOrder(workOrder)
																				}
																			>
																				<CreditCard size={14} />
																				Cobrar
																			</button>
																		</div>
																	))}
																</div>
															) : null}
														</RecordCard>
													))}
												</div>
											</div>
										) : null}
									</Panel>
									<Panel
										title="Comparacion"
										subtitle={
											dashboardPreviousHasActivity
												? `${formatDateLabel(
														dashboardPreviousPeriod.from,
													)} a ${formatDateLabel(dashboardPreviousPeriod.to)}`
												: 'Sin actividad registrada en el periodo anterior'
										}
									>
										<div className="records dashboard-comparison-records">
											<RecordCard className="dashboard-comparison-record">
												<div className="record-head">
													<span>Facturado</span>
													<strong>{money(dashboardBilledTotal)}</strong>
												</div>
												<small>
													{dashboardDeltaHint(
														dashboardBilledTotal,
														dashboardPreviousPeriod.billed_total,
														{ metricKey: 'billed_total' },
													)}
												</small>
											</RecordCard>
											<RecordCard className="dashboard-comparison-record">
												<div className="record-head">
													<span>Cobrado</span>
													<strong>{money(dashboardCollectedTotal)}</strong>
												</div>
												<small>
													{dashboardDeltaHint(
														dashboardCollectedTotal,
														dashboardPreviousPeriod.collected_total,
														{ metricKey: 'collected_total' },
													)}
												</small>
											</RecordCard>
											<RecordCard className="dashboard-comparison-record">
												<div className="record-head">
													<span>Margen estimado</span>
													<strong>{money(dashboardEstimatedMarginTotal)}</strong>
												</div>
												<small>
													{dashboardDeltaHint(
														dashboardEstimatedMarginTotal,
														dashboardPreviousPeriod.estimated_margin_total,
														{ metricKey: 'estimated_margin_total' },
													)}
												</small>
											</RecordCard>
											<RecordCard className="dashboard-comparison-record">
												<div className="record-head">
													<span>Caja real</span>
													<strong>{money(dashboardCashflowBalance)}</strong>
												</div>
												<small>
													{dashboardDeltaHint(
														dashboardCashflowBalance,
														dashboardPreviousPeriod.cashflow_balance,
														{ metricKey: 'cashflow_balance' },
													)}
												</small>
											</RecordCard>
											<RecordCard className="dashboard-comparison-record">
												<div className="record-head">
													<span>Por cobrar</span>
													<strong>{money(dashboardBalanceDueTotal)}</strong>
												</div>
												<small>
													{dashboardDeltaHint(
														dashboardBalanceDueTotal,
														dashboardPreviousPeriod.balance_due_total,
														{
															metricKey: 'balance_due_total',
															polarity: 'higher-is-bad',
														},
													)}
												</small>
											</RecordCard>
										</div>
									</Panel>
								</div>
							</div>
							{dashboardTopCustomersByBilled.length ||
							dashboardTopServicesByBilled.length ||
							dashboardTopWorkOrdersByMargin.length ||
							dashboardTopMaterialsByCost.length ? (
								<Panel
									title="Rankings economicos"
									subtitle="Donde se concentra facturacion, margen y costo de materiales."
								>
									<div className="dashboard-ranking-grid">
										<div className="dashboard-ranking-column">
											<div className="dashboard-section-kicker">
												<span>Clientes por facturacion</span>
											</div>
											<div className="records dashboard-ranking-records">
												{dashboardTopCustomersByBilled.map(
													(item: AnyRecord) => (
														<RecordCard
															className="dashboard-ranking-record"
															key={item.customer_id ?? item.customer_name}
														>
															<div className="record-head">
																<div>
																	<span>{item.customer_name}</span>
																	<small>
																		{dashboardCountText(
																			numberValue(item.work_orders_count),
																			'trabajo',
																			'trabajos',
																		)}
																	</small>
																</div>
																<strong>{money(item.billed_total)}</strong>
															</div>
														</RecordCard>
													),
												)}
											</div>
										</div>
										<div className="dashboard-ranking-column">
											<div className="dashboard-section-kicker">
												<span>Servicios por facturacion</span>
											</div>
											<div className="records dashboard-ranking-records">
												{dashboardTopServicesByBilled.map(
													(item: AnyRecord) => (
														<RecordCard
															className="dashboard-ranking-record"
															key={item.service_id ?? item.service_name}
														>
															<div className="record-head">
																<div>
																	<span>{item.service_name}</span>
																	<small>
																		Margen {money(item.estimated_margin_total)}
																	</small>
																</div>
																<strong>{money(item.billed_total)}</strong>
															</div>
														</RecordCard>
													),
												)}
											</div>
										</div>
										<div className="dashboard-ranking-column">
											<div className="dashboard-section-kicker">
												<span>Trabajos por margen</span>
											</div>
											<div className="records dashboard-ranking-records">
												{dashboardTopWorkOrdersByMargin.map(
													(item: AnyRecord) => (
														<RecordCard
															className="dashboard-ranking-record"
															key={item.id}
														>
															<div className="record-head">
																<div>
																	<span>
																		#{item.id} - {item.customer_name}
																	</span>
																	<small>{item.service_name}</small>
																</div>
																<strong>{money(item.estimated_margin)}</strong>
															</div>
														</RecordCard>
													),
												)}
											</div>
										</div>
										<div className="dashboard-ranking-column">
											<div className="dashboard-section-kicker">
												<span>Materiales por costo</span>
											</div>
											<div className="records dashboard-ranking-records">
												{dashboardTopMaterialsByCost.map((item: AnyRecord) => (
													<RecordCard
														className="dashboard-ranking-record"
														key={item.material_id ?? item.material_name}
													>
														<div className="record-head">
															<div>
																<span>{item.material_name}</span>
																<small>
																	{quantity(item.quantity)} {item.unit}
																</small>
															</div>
															<strong>{money(item.estimated_total_cost)}</strong>
														</div>
													</RecordCard>
												))}
											</div>
										</div>
									</div>
								</Panel>
							) : null}
							<Panel
								title="Trabajo por estado"
								subtitle={
									dashboardWorkOrdersTotal
										? dashboardCountText(
												dashboardWorkOrdersTotal,
												'trabajo distribuido por avance',
												'trabajos distribuidos por avance',
											)
										: 'Sin trabajos registrados en el periodo seleccionado'
								}
							>
								{dashboardWorkOrdersTotal ? (
									<div className="records dashboard-status-records">
										{dashboardWorkStatusEntries.map(([key, label]) => (
											<RecordCard
												className="dashboard-status-record"
												key={key}
											>
												<div className="record-head">
													<span>{label}</span>
													<strong>
														{dashboard.work_orders_by_status?.[key] ?? 0}
													</strong>
												</div>
											</RecordCard>
										))}
									</div>
								) : (
									<Empty
										text="Sin trabajos en este periodo."
										hint="Cambia el rango o crea una reserva desde Agenda para iniciar la operacion."
										action={
											<button
												type="button"
												className="primary"
												onClick={() => onOpenSection('agenda')}
											>
												<CalendarDays size={16} />
												Ir a Agenda
											</button>
										}
									/>
								)}
							</Panel>
						</>
					) : null}
				</>
			) : null}
			{birthdayAlerts}
		</div>
	)
}
