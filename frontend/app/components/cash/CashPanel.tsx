'use client'

import {
	type MouseEvent,
	type ReactNode,
	useState,
} from 'react'

import {
	ArrowDownRight,
	ArrowUpRight,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Eye,
	Info,
	LockKeyhole,
	LockOpen,
	Plus,
	ReceiptText,
	RefreshCw,
	Scale,
	SlidersHorizontal,
	TrendingDown,
	TrendingUp,
	Wallet,
} from 'lucide-react'

import { CashEntryRow } from '@/app/components/cash/CashEntryRow'
import { AnimatedNumber } from '@/app/components/motion/AnimatedNumber'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import {
	type QuickAction,
} from '@/app/components/ui/QuickActionsMenu'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { Button } from '@/app/components/ui/Button'
import { cx } from '@/app/components/utils'
import { type ApiErrorNotice } from '@/lib/api-errors'
import {
	type CashQuickFilter,
	type CashSortKey,
	cashQuickFilterOptions,
	cashSortOptions,
} from '@/lib/cash-entry'
import {
	type AnyRecord,
	money,
	numberValue,
} from '@/lib/page-support'

export type CashSummaryMode = 'cashflow' | 'economic'

export type CashFilterState = {
	query: string
	movementType: string
	sourceKind: string
	category: string
	subcategory: string
	effect: string
	amountMin: string
	amountMax: string
}

export type CashSummaryLine = {
	key: string
	label: string
	count: number
	amount: number
	percent: number
}

export type CashSummaryGroup = {
	key: string
	label: string
	count: number
	amount: number
	lines: CashSummaryLine[]
}

export type CashFlowSummary = {
	groups: CashSummaryGroup[]
	commercialBalance: number
	financialBalance: number
	netFlow: number
}

type CashTotals = {
	income: any
	expense: any
	balance: any
}

type CashPanelProps = {
	cashClosure?: AnyRecord | null
	cashEntries: AnyRecord[]
	cashFilterCategoryOptions: SelectOption[]
	cashFilters: CashFilterState
	cashFiltersActive: boolean
	cashFilterSubcategoryOptions: SelectOption[]
	cashFlowSummary: CashFlowSummary
	cashIsClosed: boolean
	cashQuickFilter: CashQuickFilter
	cashSortKey: CashSortKey
	cashSourceKindLabel: (kind: any, fallback?: any) => string
	cashSourceKindOptions: SelectOption[]
	cashSummaryMode: CashSummaryMode
	economicTotals: CashTotals
	filteredCashEntries: AnyRecord[]
	loading: boolean
	loadBlocked: boolean
	loadErrorNotice: ApiErrorNotice | null
	recordClass: (kind: string, id: any) => string
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel: string,
	) => ReactNode
	cashViewMode: 'day' | 'week'
	selectedDay: string
	onCashFilterChange: (key: keyof CashFilterState, value: string) => void
	onCashQuickFilterChange: (value: CashQuickFilter) => void
	onCashSortChange: (value: CashSortKey) => void
	onCashSummaryModeChange: (value: CashSummaryMode) => void
	onCashViewModeChange: (value: 'day' | 'week') => void
	onClearCashFilters: () => void
	onCloseDay: () => void
	onReopenDay: () => void
	onCreateMovement: () => void
	onMoveSelectedDay: (offset: number) => void
	onOpenCashEntryDetail: (entry: AnyRecord) => void
	onQuickActionsContext: (
		event: MouseEvent<HTMLDivElement>,
		title: string,
		actions: QuickAction[],
	) => void
	onRefresh: () => void
	onRegisterAdjustment: () => void
	onSelectedDayChange: (value: string) => void
	cashEntryKey: (entry: AnyRecord) => string
	cashEntryQuickActions: (entry: AnyRecord) => QuickAction[]
	cashflowTotals: CashTotals
}

const cashSummaryModeOptions: Array<{
	value: CashSummaryMode
	label: string
}> = [
	{ value: 'cashflow', label: 'Flujo de caja' },
	{ value: 'economic', label: 'Resultado del dia' },
]

const cashViewModeOptions: Array<{ value: 'day' | 'week'; label: string }> = [
	{ value: 'day', label: 'Día' },
	{ value: 'week', label: 'Semana' },
]

function weekBounds(day: string): { start: Date; end: Date } {
	const d = new Date(day + 'T12:00')
	const start = new Date(d)
	start.setDate(d.getDate() - ((d.getDay() + 6) % 7))
	const end = new Date(start)
	end.setDate(start.getDate() + 6)
	return { start, end }
}

function formatWeekLabel(day: string): string {
	const { start, end } = weekBounds(day)
	const fmt = (d: Date) =>
		d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
	return `${fmt(start)} – ${fmt(end)}`
}

const cashMovementTypeOptions = [
	{ value: 'income', label: 'Ingresos' },
	{ value: 'expense', label: 'Egresos' },
]

const cashEffectOptions = [
	{ value: 'cashflow', label: 'Impacta caja' },
	{ value: 'economic_only', label: 'Solo resultado' },
]

function cashSummaryAmountClass(amount: number) {
	if (amount > 0) return 'positive'
	if (amount < 0) return 'negative'
	return 'neutral'
}

function formatCashPercent(value: number) {
	return value.toLocaleString('es-AR', {
		maximumFractionDigits: value >= 1 ? 0 : 2,
		style: 'percent',
	})
}

function cashBalanceTone(amount: number) {
	if (amount > 0) return 'positive'
	if (amount < 0) return 'negative'
	return 'neutral'
}

function cashBalanceLabel(amount: number) {
	if (amount > 0) return 'Cash flow positivo'
	if (amount < 0) return 'Cash flow negativo'
	return 'Cash flow equilibrado'
}

export function CashPanel({
	cashClosure,
	cashEntries,
	cashEntryKey,
	cashEntryQuickActions,
	cashFilterCategoryOptions,
	cashFilters,
	cashFiltersActive,
	cashFilterSubcategoryOptions,
	cashflowTotals,
	cashFlowSummary,
	cashIsClosed,
	cashQuickFilter,
	cashSortKey,
	cashSourceKindLabel,
	cashSourceKindOptions,
	cashSummaryMode,
	economicTotals,
	filteredCashEntries,
	loading,
	loadBlocked,
	loadErrorNotice,
	recordClass,
	renderQuickActionsTrigger,
	cashViewMode,
	selectedDay,
	onCashFilterChange,
	onCashQuickFilterChange,
	onCashSortChange,
	onCashSummaryModeChange,
	onCashViewModeChange,
	onClearCashFilters,
	onCloseDay,
	onReopenDay,
	onCreateMovement,
	onMoveSelectedDay,
	onOpenCashEntryDetail,
	onQuickActionsContext,
	onRefresh,
	onRegisterAdjustment,
	onSelectedDayChange,
}: CashPanelProps) {
	const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
	const today = new Date()
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
	const cashStatusLabel = cashIsClosed ? 'Cerrada' : 'Abierta'
	const cashStatusClass = cashIsClosed ? 'closed' : 'open'
	const cashSummaryModeLabel =
		cashSummaryModeOptions.find((option) => option.value === cashSummaryMode)
			?.label ?? 'Flujo de caja'
	const consolidatedTotals = cashSummaryMode === 'cashflow' ? cashflowTotals : economicTotals
	const consolidatedBalance = numberValue(consolidatedTotals.balance)
	const consolidatedIncome = numberValue(consolidatedTotals.income)
	const consolidatedExpense = numberValue(consolidatedTotals.expense)
	const partnerContributions =
		cashFlowSummary.groups.find((group) => group.key === 'partner_contributions')?.amount ?? 0
	const investments =
		cashFlowSummary.groups.find((group) => group.key === 'investments')?.amount ?? 0
	const partnerWithdrawals =
		cashFlowSummary.groups.find((group) => group.key === 'partner_withdrawals')?.amount ?? 0
	const cashBalance = numberValue(cashflowTotals.balance)
	const cashBalanceToneClass = cashBalanceTone(cashBalance)

	function renderCashSummaryLine(line: CashSummaryLine) {
		return (
			<div className="cash-summary-line" key={line.key}>
				<span className="cash-summary-line-label">
					{line.amount < 0 ? '↓ ' : ''}
					{line.label}
					<small>
						({line.count}) {formatCashPercent(line.percent)}
					</small>
				</span>
				<span
					className={`cash-summary-line-amount ${cashSummaryAmountClass(
						line.amount,
					)}`}
				>
					{money(line.amount)}
				</span>
			</div>
		)
	}

	function renderCashSummaryGroup(
		groupKey: string,
		options: { hideWhenEmpty?: boolean } = {},
	) {
		const group = cashFlowSummary.groups.find((item) => item.key === groupKey)
		if (!group || (options.hideWhenEmpty && group.count === 0)) return null
		return (
			<div className="cash-summary-group" key={group.key}>
				<div className="cash-summary-group-head">
					<span className="cash-summary-group-title">
						{group.label}
						{group.lines.length ? <Eye size={15} aria-hidden="true" /> : null}
					</span>
					<strong
						className={`cash-summary-total ${cashSummaryAmountClass(
							group.amount,
						)}`}
					>
						{money(group.amount)}
					</strong>
				</div>
				{group.lines.length ? (
					<div className="cash-summary-lines">
						{group.lines.map(renderCashSummaryLine)}
					</div>
				) : null}
			</div>
		)
	}

	function renderCashSummaryBalance(
		label: string,
		amount: number,
		options: { highlight?: boolean } = {},
	) {
		return (
			<div
				className={cx(
					'cash-summary-balance',
					options.highlight && 'cash-summary-balance--highlight',
				)}
				key={label}
			>
				<span>{label}</span>
				<strong
					className={`cash-summary-total ${cashSummaryAmountClass(amount)}`}
				>
					{money(amount)}
				</strong>
			</div>
		)
	}

	function renderConsolidatedRow(label: string, amount: number) {
		return (
			<div className="cash-consolidated-row" key={label}>
				<span>{label}</span>
				<strong
					className={`cash-summary-total ${cashSummaryAmountClass(amount)}`}
				>
					{money(amount)}
				</strong>
			</div>
		)
	}

	return (
		<div className="grid">
			<section
				className="panel finance-panel cash-panel"
				aria-label={cashViewMode === 'week' ? 'Caja semanal' : 'Caja diaria'}
			>
				<div className="toolbar toolbar-spaced cash-toolbar">
					<SegmentedControl
						ariaLabel="Vista de caja"
						options={cashViewModeOptions}
						value={cashViewMode}
						onChange={onCashViewModeChange}
					/>
					<Field label={cashViewMode === 'week' ? 'Semana' : 'Dia'}>
						<div className="date-stepper">
							<Button
								variant="ghost"
								className="date-stepper-button"
								onClick={() => onMoveSelectedDay(cashViewMode === 'week' ? -7 : -1)}
								aria-label={cashViewMode === 'week' ? 'Ver semana anterior' : 'Ver dia anterior'}
							>
								<ChevronLeft size={16} />
							</Button>
							{cashViewMode === 'week' ? (
								<output className="date-stepper-week-label">
									{formatWeekLabel(selectedDay)}
								</output>
							) : (
								<input
									type="date"
									aria-label="Dia de caja"
									name="cash_day"
									value={selectedDay}
									onChange={(event) => onSelectedDayChange(event.target.value)}
								/>
							)}
							<Button
								variant="ghost"
								className="date-stepper-button"
								onClick={() => onMoveSelectedDay(cashViewMode === 'week' ? 7 : 1)}
								aria-label={cashViewMode === 'week' ? 'Ver semana siguiente' : 'Ver dia siguiente'}
							>
								<ChevronRight size={16} />
							</Button>
							<Button
								variant="ghost"
								className={cx('date-stepper-button', selectedDay === todayStr && 'is-today')}
								onClick={() => onSelectedDayChange(todayStr)}
								aria-pressed={selectedDay === todayStr}
							>
								{cashViewMode === 'week' ? 'Esta sem.' : 'Hoy'}
							</Button>
						</div>
					</Field>
					{cashViewMode === 'day' ? (
						<span
							className={`cash-status ${cashStatusClass}`}
							role="status"
							aria-label={`Caja ${cashStatusLabel.toLowerCase()}`}
						>
							{cashStatusLabel}
						</span>
					) : null}
					<div className="finance-action-rail cash-action-rail">
						<Button
							variant="primary"
							disabled={cashViewMode === 'day' && cashIsClosed}
							onClick={onCreateMovement}
						>
							<Plus size={16} />
							Cargar movimiento
						</Button>
						{cashViewMode === 'day' ? (
							<>
								<Button
									variant="ghost"
									disabled={cashIsClosed}
									onClick={onCloseDay}
								>
									<LockKeyhole size={16} />
									Cerrar dia
								</Button>
								{cashIsClosed ? (
									<>
										<Button
											variant="ghost"
											onClick={onRegisterAdjustment}
										>
											<ReceiptText size={16} />
											Registrar ajuste hoy
										</Button>
										<Button
											variant="ghost"
											onClick={onReopenDay}
										>
											<LockOpen size={16} />
											Reabrir caja
										</Button>
									</>
								) : null}
							</>
						) : null}
					</div>
				</div>
				{loadBlocked ? (
					<ErrorState
						text={
							loadErrorNotice?.title ??
							'No se pudieron cargar los datos de caja'
						}
						hint={loadErrorNotice?.description}
						action={
							<Button variant="ghost" onClick={onRefresh}>
								<RefreshCw size={16} />
								Actualizar
							</Button>
						}
					/>
				) : null}
				{!loadBlocked && loading && !cashEntries.length ? (
					<SkeletonList rows={6} columns={4} label={cashViewMode === 'week' ? 'Cargando caja de la semana' : 'Cargando caja del dia'} />
				) : null}
				{!loadBlocked && (!loading || cashEntries.length) ? (
					<>
						<div className="info-note">
							{cashViewMode === 'week'
								? 'Flujo de caja muestra el dinero que entro o salio en la semana. Resultado de la semana cuenta ingresos y gastos sin duplicar pagos de deudas.'
								: <>
									Flujo de caja muestra el dinero que entro o salio hoy: cobros,
									pagos de deuda, compras, movimientos manuales y ajustes.
									Resultado del dia cuenta ingresos y gastos sin duplicar pagos de
									deudas.
									{cashClosure
										? ` Cierre guardado: flujo de caja ${money(cashClosure.cashflow_balance ?? cashClosure.balance)}.`
										: ''}
								</>}
						</div>
						<section className="grid three section-block-end cash-metrics-primary">
							<div className="metric cash-metric cash-metric--income">
								<span className="metric-icon" aria-hidden="true">
									<TrendingUp size={20} />
								</span>
								<span>
									<span className="cash-term income">Ingresos</span> de caja
								</span>
								<strong>
									<AnimatedNumber
										value={numberValue(cashflowTotals.income)}
										format={money}
									/>
								</strong>
							</div>
							<div className="metric cash-metric cash-metric--expense">
								<span className="metric-icon" aria-hidden="true">
									<TrendingDown size={20} />
								</span>
								<span>
									<span className="cash-term expense">Egresos</span> de caja
								</span>
								<strong>
									<AnimatedNumber
										value={numberValue(cashflowTotals.expense)}
										format={money}
									/>
								</strong>
							</div>
							<div className="metric cash-metric cash-metric-balance">
								<span className="metric-icon" aria-hidden="true">
									<Wallet size={20} />
								</span>
								<span>Saldo de caja</span>
								<strong>
									<AnimatedNumber
										value={cashBalance}
										format={money}
									/>
								</strong>
								<small
									className={`cash-balance-status cash-balance-status--${cashBalanceToneClass}`}
								>
									{cashBalance > 0 ? (
										<ArrowUpRight size={12} aria-hidden="true" />
									) : cashBalance < 0 ? (
										<ArrowDownRight size={12} aria-hidden="true" />
									) : null}
									{cashBalanceLabel(cashBalance)}
								</small>
							</div>
						</section>
						<section className="cash-flow-grid section-block-end">
							<article className="cash-flow-card cash-flow-card--main">
								<div className="cash-flow-head">
									<div>
										<h3>
											{cashViewMode === 'week' ? 'Flujo de dinero de la semana' : 'Flujo de dinero del dia'}
											<Info size={16} aria-hidden="true" />
										</h3>
										<p>
											Resumen completo {cashViewMode === 'week' ? 'de la semana' : 'del dia'} en modo {cashSummaryModeLabel}.
											Los filtros de abajo no alteran estos totales.
										</p>
									</div>
									<SegmentedControl
										ariaLabel="Vista del resumen"
										className="cash-summary-toggle"
										options={cashSummaryModeOptions}
										value={cashSummaryMode}
										onChange={onCashSummaryModeChange}
									/>
								</div>
								<div className="cash-summary-body">
									{renderCashSummaryGroup('charges')}
									{renderCashSummaryGroup('payments')}
									{renderCashSummaryGroup('adjustments', {
										hideWhenEmpty: true,
									})}
								</div>
								<footer className="cash-flow-result">
									<div className="cash-flow-result__main">
										<span>Resultado final</span>
										<strong
											className={`cash-flow-result__amount cash-summary-total ${cashSummaryAmountClass(consolidatedBalance)}`}
										>
											<AnimatedNumber
												value={consolidatedBalance}
												format={money}
											/>
										</strong>
									</div>
									<div className="cash-flow-result__side">
										<div className="cash-flow-result__side-item">
											<span>Ingresos totales</span>
											<strong className="cash-flow-result__side-amount positive">
												{money(consolidatedIncome)}
											</strong>
										</div>
										<div className="cash-flow-result__side-item">
											<span>Egresos totales</span>
											<strong className="cash-flow-result__side-amount negative">
												{money(consolidatedExpense)}
											</strong>
										</div>
									</div>
								</footer>
							</article>
							<aside
								className="cash-consolidated-card"
								aria-label="Metricas consolidadas"
							>
								<div className="cash-consolidated-head">
									<h3>
										Metricas consolidadas
										<Scale size={16} aria-hidden="true" />
									</h3>
								</div>
								<div className="cash-consolidated-body">
									{renderConsolidatedRow(
										'Balance comercial',
										cashFlowSummary.commercialBalance,
									)}
									{renderConsolidatedRow('Aportes', partnerContributions)}
									{renderConsolidatedRow('Inversiones', investments)}
									{renderConsolidatedRow('Retiros', partnerWithdrawals)}
									{renderConsolidatedRow(
										'Balance financiero',
										cashFlowSummary.financialBalance,
									)}
									{renderCashSummaryBalance(
										'Flujo neto de dinero',
										cashFlowSummary.netFlow,
										{ highlight: true },
									)}
								</div>
							</aside>
						</section>
						<section
							className="cash-filters section-block-end"
							aria-labelledby="cash-filters-title"
						>
							<div className="cash-filters-head">
								<div>
									<h3 id="cash-filters-title">Movimientos del dia</h3>
									<p>
										Listado cronologico de todas las operaciones del dia.
										Los filtros no alteran los totales de arriba.
									</p>
								</div>
								<div className="cash-filter-actions">
									<span className="cash-filter-counter">
										{filteredCashEntries.length} de {cashEntries.length}
									</span>
									<Button
										variant="ghost"
										disabled={!cashFiltersActive}
										onClick={onClearCashFilters}
									>
										Limpiar
									</Button>
								</div>
							</div>
							<div className="cash-quick-bar">
								<div className="cash-quick-chips" role="tablist" aria-label="Filtro rapido">
									{cashQuickFilterOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											role="tab"
											aria-selected={option.value === cashQuickFilter}
											className={cx(
												'cash-quick-chip',
												option.value === cashQuickFilter && 'is-active',
											)}
											onClick={() => onCashQuickFilterChange(option.value)}
										>
											{option.label}
										</button>
									))}
								</div>
								<label className="cash-sort">
									<span className="cash-sort-label">Orden</span>
									<div className="cash-sort-select">
										<select
											aria-label="Orden del listado"
											value={cashSortKey}
											onChange={(event) =>
												onCashSortChange(event.target.value as typeof cashSortKey)
											}
										>
											{cashSortOptions.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										<ChevronDown size={14} aria-hidden="true" />
									</div>
								</label>
							</div>
							<div className="cash-search-row">
								<Field label="Buscar">
									<input
										placeholder="Buscar por cliente, proveedor, categoria, detalle o monto"
										value={cashFilters.query}
										onChange={(event) =>
											onCashFilterChange('query', event.target.value)
										}
									/>
								</Field>
								<Button
									variant="ghost"
									className={cx(
										'cash-advanced-toggle',
										advancedFiltersOpen && 'is-open',
									)}
									aria-expanded={advancedFiltersOpen}
									onClick={() => setAdvancedFiltersOpen((open) => !open)}
								>
									<SlidersHorizontal size={14} aria-hidden="true" />
									{advancedFiltersOpen ? 'Cerrar filtros' : 'Mas filtros'}
								</Button>
							</div>
							{advancedFiltersOpen ? (
								<div className="cash-filter-grid">
									<SearchSelect
										label="Tipo"
										value={cashFilters.movementType}
										options={cashMovementTypeOptions}
										placeholder="Todos"
										onChange={(value) =>
											onCashFilterChange('movementType', value)
										}
									/>
									<SearchSelect
										label="Origen"
										value={cashFilters.sourceKind}
										options={cashSourceKindOptions}
										placeholder="Todos los origenes"
										onChange={(value) =>
											onCashFilterChange('sourceKind', value)
										}
									/>
									<SearchSelect
										label="Categoria"
										value={cashFilters.category}
										options={cashFilterCategoryOptions}
										placeholder="Todas"
										onChange={(value) => onCashFilterChange('category', value)}
									/>
									<SearchSelect
										label="Subcategoria"
										value={cashFilters.subcategory}
										options={cashFilterSubcategoryOptions}
										placeholder="Todas"
										onChange={(value) =>
											onCashFilterChange('subcategory', value)
										}
									/>
									<SearchSelect
										label="Efecto"
										value={cashFilters.effect}
										options={cashEffectOptions}
										placeholder="Todos"
										onChange={(value) => onCashFilterChange('effect', value)}
									/>
									<Field label="Monto minimo">
										<input
											type="number"
											min="0"
											step="0.01"
											value={cashFilters.amountMin}
											onChange={(event) =>
												onCashFilterChange('amountMin', event.target.value)
											}
										/>
									</Field>
									<Field label="Monto maximo">
										<input
											type="number"
											min="0"
											step="0.01"
											value={cashFilters.amountMax}
											onChange={(event) =>
												onCashFilterChange('amountMax', event.target.value)
											}
										/>
									</Field>
								</div>
							) : null}
						</section>
						{filteredCashEntries.length ? (
							<div
								className="cash-entry-columns"
								aria-hidden="true"
								role="presentation"
							>
								<span>Hora</span>
								<span>Concepto / Categoria</span>
								<span>Cliente / Detalle</span>
								<span className="cash-entry-columns__amount">Monto</span>
							</div>
						) : null}
						<div className="cash-entry-list">
							{filteredCashEntries.length ? (
								filteredCashEntries.map((item: AnyRecord) => {
									const quickActions = cashEntryQuickActions(item)
									return (
										<CashEntryRow
											className={recordClass('cash-movement', item.id)}
											entry={item}
											key={cashEntryKey(item)}
											onClick={() => onOpenCashEntryDetail(item)}
											onContextMenu={(event) =>
												onQuickActionsContext(
													event,
													'Acciones de caja',
													quickActions,
												)
											}
											quickActionsTrigger={renderQuickActionsTrigger(
												'Acciones de caja',
												quickActions,
												'Acciones rapidas de caja',
											)}
										/>
									)
								})
							) : (
								<Empty
									text={
										cashEntries.length
											? 'Sin entradas para los filtros aplicados.'
											: cashViewMode === 'week'
												? 'Sin movimientos en la semana.'
												: 'Sin movimientos para el dia.'
									}
									hint={
										cashEntries.length
											? 'Ajusta busqueda, origen, categoria o montos.'
											: cashViewMode === 'week'
												? 'Registra cobros, pagos de deuda o movimientos manuales para comenzar.'
												: cashIsClosed
													? 'La caja esta cerrada; si falta un movimiento, registra un ajuste para este dia.'
													: 'Registra un cobro, pago de deuda o movimiento manual para comenzar.'
									}
									action={
										cashEntries.length ? undefined : cashIsClosed ? (
											<Button
												variant="ghost"
												onClick={onRegisterAdjustment}
											>
												<ReceiptText size={16} />
												Registrar ajuste hoy
											</Button>
										) : (
											<Button
												variant="primary"
												onClick={onCreateMovement}
											>
												<Plus size={16} />
												Cargar movimiento
											</Button>
										)
									}
								/>
							)}
						</div>
						{filteredCashEntries.length ? (
							<div className="cash-entry-footer" role="status" aria-live="polite">
								Mostrando {filteredCashEntries.length} de {cashEntries.length} movimientos
							</div>
						) : null}
					</>
				) : null}
			</section>
		</div>
	)
}
