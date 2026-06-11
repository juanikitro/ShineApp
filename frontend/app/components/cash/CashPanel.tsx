'use client'

import {
	type MouseEvent,
	type ReactNode,
	useState,
} from 'react'

import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Eye,
	Info,
	LockKeyhole,
	LockOpen,
	ReceiptText,
	RefreshCw,
	SlidersHorizontal,
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
	selectedDay: string
	onCashFilterChange: (key: keyof CashFilterState, value: string) => void
	onCashQuickFilterChange: (value: CashQuickFilter) => void
	onCashSortChange: (value: CashSortKey) => void
	onCashSummaryModeChange: (value: CashSummaryMode) => void
	onClearCashFilters: () => void
	onCloseDay: () => void
	onReopenDay: () => void
	onCollectWork: () => void
	onCreateMovement: () => void
	onMoveSelectedDay: (offset: number) => void
	onOpenCashEntryDetail: (entry: AnyRecord) => void
	onPayDebt: () => void
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
	selectedDay,
	onCashFilterChange,
	onCashQuickFilterChange,
	onCashSortChange,
	onCashSummaryModeChange,
	onClearCashFilters,
	onCloseDay,
	onReopenDay,
	onCollectWork,
	onCreateMovement,
	onMoveSelectedDay,
	onOpenCashEntryDetail,
	onPayDebt,
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

	function renderCashSummaryBalance(label: string, amount: number) {
		return (
			<div className="cash-summary-balance" key={label}>
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
				aria-label="Caja diaria"
			>
				<div className="toolbar toolbar-spaced cash-toolbar">
					<Field label="Dia">
						<div className="date-stepper">
							<button
								type="button"
								className="ghost date-stepper-button"
								onClick={() => onMoveSelectedDay(-1)}
								aria-label="Ver dia anterior"
							>
								<ChevronLeft size={16} />
							</button>
							<input
								type="date"
								aria-label="Dia de caja"
								name="cash_day"
								value={selectedDay}
								onChange={(event) => onSelectedDayChange(event.target.value)}
							/>
							<button
								type="button"
								className="ghost date-stepper-button"
								onClick={() => onMoveSelectedDay(1)}
								aria-label="Ver dia siguiente"
							>
								<ChevronRight size={16} />
							</button>
							<button
								type="button"
								className={cx('ghost date-stepper-button', selectedDay === todayStr && 'is-today')}
								onClick={() => onSelectedDayChange(todayStr)}
								aria-pressed={selectedDay === todayStr}
							>
								Hoy
							</button>
						</div>
					</Field>
					<span
						className={`cash-status ${cashStatusClass}`}
						role="status"
						aria-label={`Caja ${cashStatusLabel.toLowerCase()}`}
					>
						{cashStatusLabel}
					</span>
					<div className="finance-action-rail">
						<div className="finance-primary-actions">
							<button
								type="button"
								className="primary"
								disabled={cashIsClosed}
								onClick={onCollectWork}
							>
								<CreditCard size={16} />
								Cobrar trabajo
							</button>
							<button
								type="button"
								className="ghost"
								disabled={cashIsClosed}
								onClick={onCreateMovement}
							>
								<ReceiptText size={16} />
								Ingreso / egreso
							</button>
						</div>
						<div className="finance-secondary-actions">
							<button
								type="button"
								className="ghost"
								disabled={cashIsClosed}
								onClick={onPayDebt}
							>
								<CreditCard size={16} />
								Pagar deuda
							</button>
							<button
								type="button"
								className="ghost"
								disabled={cashIsClosed}
								onClick={onCloseDay}
							>
								<LockKeyhole size={16} />
								Cerrar dia
							</button>
							{cashIsClosed ? (
								<>
									<button
										type="button"
										className="ghost"
										onClick={onRegisterAdjustment}
									>
										<ReceiptText size={16} />
										Registrar ajuste hoy
									</button>
									<button
										type="button"
										className="ghost"
										onClick={onReopenDay}
									>
										<LockOpen size={16} />
										Reabrir caja
									</button>
								</>
							) : null}
						</div>
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
							<button type="button" className="ghost" onClick={onRefresh}>
								<RefreshCw size={16} />
								Actualizar
							</button>
						}
					/>
				) : null}
				{!loadBlocked && loading && !cashEntries.length ? (
					<SkeletonList rows={6} columns={4} label="Cargando caja del dia" />
				) : null}
				{!loadBlocked && (!loading || cashEntries.length) ? (
					<>
						<div className="info-note">
							Flujo de caja muestra el dinero que entro o salio hoy: cobros,
							pagos de deuda, compras, movimientos manuales y ajustes.
							Resultado del dia cuenta ingresos y gastos sin duplicar pagos de
							deudas.
							{cashClosure
								? ` Cierre guardado: flujo de caja ${money(cashClosure.cashflow_balance ?? cashClosure.balance)}.`
								: ''}
						</div>
						<section className="grid three section-block-end cash-metrics-primary">
							<div className="metric cash-metric">
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
							<div className="metric cash-metric">
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
								<span>Saldo de caja</span>
								<strong>
									<AnimatedNumber
										value={numberValue(cashflowTotals.balance)}
										format={money}
									/>
								</strong>
							</div>
						</section>
						<section className="cash-economic-panel section-block-end">
							<div>
								<span>Resultado del dia</span>
								<strong>
									<AnimatedNumber
										value={numberValue(economicTotals.balance)}
										format={money}
									/>
								</strong>
							</div>
							<p>
								<span className="cash-term income">Ingresos</span>{' '}
								{money(economicTotals.income)} -{' '}
								<span className="cash-term expense">egresos</span>{' '}
								{money(economicTotals.expense)}. Incluye deudas originales
								devengadas.
							</p>
						</section>
						<section className="cash-flow-card section-block-end">
							<div className="cash-flow-head">
								<div>
									<h3>
										Flujo de dinero del dia
										<Info size={16} aria-hidden="true" />
									</h3>
									<p>
										Resumen completo del dia en modo {cashSummaryModeLabel}.
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
								{renderCashSummaryBalance(
									'Balance comercial',
									cashFlowSummary.commercialBalance,
								)}
								{renderCashSummaryGroup('partner_contributions')}
								{renderCashSummaryGroup('investments')}
								{renderCashSummaryGroup('partner_withdrawals')}
								{renderCashSummaryGroup('adjustments', {
									hideWhenEmpty: true,
								})}
								{renderCashSummaryBalance(
									'Balance financiero',
									cashFlowSummary.financialBalance,
								)}
								{renderCashSummaryBalance(
									'Flujo neto de dinero',
									cashFlowSummary.netFlow,
								)}
							</div>
						</section>
						<section
							className="cash-filters section-block-end"
							aria-labelledby="cash-filters-title"
						>
							<div className="cash-filters-head">
								<div>
									<h3 id="cash-filters-title">Movimientos del dia</h3>
									<p>
										Filtra el listado sin modificar el resumen del dia.
									</p>
								</div>
								<div className="cash-filter-actions">
									<span className="cash-filter-counter">
										{filteredCashEntries.length} de {cashEntries.length}
									</span>
									<button
										type="button"
										className="ghost"
										disabled={!cashFiltersActive}
										onClick={onClearCashFilters}
									>
										Limpiar
									</button>
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
								<button
									type="button"
									className={cx(
										'ghost cash-advanced-toggle',
										advancedFiltersOpen && 'is-open',
									)}
									aria-expanded={advancedFiltersOpen}
									onClick={() => setAdvancedFiltersOpen((open) => !open)}
								>
									<SlidersHorizontal size={14} aria-hidden="true" />
									{advancedFiltersOpen ? 'Cerrar filtros' : 'Mas filtros'}
								</button>
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
											: 'Sin movimientos para el dia.'
									}
									hint={
										cashEntries.length
											? 'Ajusta busqueda, origen, categoria o montos.'
											: cashIsClosed
												? 'La caja esta cerrada; si falta un movimiento, registra un ajuste para este dia.'
												: 'Registra un cobro, pago de deuda o movimiento manual para comenzar.'
									}
									action={
										cashEntries.length ? undefined : cashIsClosed ? (
											<button
												type="button"
												className="ghost"
												onClick={onRegisterAdjustment}
											>
												<ReceiptText size={16} />
												Registrar ajuste hoy
											</button>
										) : (
											<button
												type="button"
												className="primary"
												onClick={onCollectWork}
											>
												<CreditCard size={16} />
												Cobrar trabajo
											</button>
										)
									}
								/>
							)}
						</div>
					</>
				) : null}
			</section>
		</div>
	)
}
