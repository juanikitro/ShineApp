'use client'

import {
	type MouseEvent,
	type ReactNode,
} from 'react'

import {
	CreditCard,
	Eye,
	ReceiptText,
	RefreshCw,
} from 'lucide-react'

import { FinanceRecordCard } from '@/app/components/finance/FinanceRecordCard'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import {
	type QuickAction,
} from '@/app/components/ui/QuickActionsMenu'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { joinDisplayParts } from '@/lib/display-text'
import { type ApiErrorNotice } from '@/lib/api-errors'
import {
	type AnyRecord,
	debtPaymentMethodLabels,
	debtStatusLabels,
	formatDateLabel,
	money,
	numberValue,
} from '@/lib/page-support'

export type DebtFilterState = {
	status: string
	balance: string
}

export type DebtSummary = {
	original: number
	paid: number
	pending: number
	open: number
}

type DebtPanelProps = {
	debtFilters: DebtFilterState
	debtFiltersActive: boolean
	debtOptions: SelectOption[]
	debtPayments: AnyRecord[]
	debtSummary: DebtSummary
	debts: AnyRecord[]
	filteredDebts: AnyRecord[]
	loading: boolean
	loadBlocked: boolean
	loadErrorNotice: ApiErrorNotice | null
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel: string,
	) => ReactNode
	search: string
	debtPaymentQuickActions: (payment: AnyRecord) => QuickAction[]
	debtQuickActions: (debt: AnyRecord) => QuickAction[]
	onClearDebtFilters: () => void
	onCreateDebt: () => void
	onCreateDebtPayment: () => void
	onDebtFilterChange: (key: keyof DebtFilterState, value: string) => void
	onOpenDebtDetail: (debt: AnyRecord) => void
	onOpenDebtPaymentDetail: (payment: AnyRecord) => void
	onOpenDebtPaymentForDebt: (debt: AnyRecord) => void
	onQuickActionsContext: (
		event: MouseEvent<HTMLDivElement>,
		title: string,
		actions: QuickAction[],
	) => void
	onRefresh: () => void
	onSearchChange: (value: string) => void
}

const debtBalanceFilterOptions = [
	{ value: 'open', label: 'Con saldo' },
	{ value: 'settled', label: 'Saldadas' },
]

const debtStatusFilterOptions = Object.entries(debtStatusLabels).map(
	([value, label]) => ({ value, label }),
)

export function DebtPanel({
	debtFilters,
	debtFiltersActive,
	debtOptions,
	debtPaymentQuickActions,
	debtPayments,
	debtQuickActions,
	debtSummary,
	debts,
	filteredDebts,
	loading,
	loadBlocked,
	loadErrorNotice,
	recordClass,
	renderQuickActionsTrigger,
	search,
	onClearDebtFilters,
	onCreateDebt,
	onCreateDebtPayment,
	onDebtFilterChange,
	onOpenDebtDetail,
	onOpenDebtPaymentDetail,
	onOpenDebtPaymentForDebt,
	onQuickActionsContext,
	onRefresh,
	onSearchChange,
}: DebtPanelProps) {
	return (
		<div className="grid">
			<section
				className="panel finance-panel debt-panel"
				aria-label="Deudas"
			>
				<div className="panel-head finance-panel-head">
					<div className="finance-action-rail">
						<div className="finance-primary-actions">
							<button
								type="button"
								className="primary"
								onClick={onCreateDebtPayment}
							>
								<CreditCard size={16} />
								Registrar pago
							</button>
						</div>
						<div className="finance-secondary-actions">
							<button type="button" className="ghost" onClick={onCreateDebt}>
								<ReceiptText size={16} />
								Nueva deuda
							</button>
						</div>
					</div>
				</div>
				{loadBlocked ? (
					<ErrorState
						text={
							loadErrorNotice?.title ??
							'No se pudieron cargar los datos de deudas'
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
				{!loadBlocked && loading && !debts.length && !debtPayments.length ? (
					<LoadingState
						text="Cargando deudas..."
						hint="Estamos preparando saldos, estado y pagos recientes."
					/>
				) : null}
				{!loadBlocked && (!loading || debts.length || debtPayments.length) ? (
					<>
						<section className="grid three section-block-end">
							<div className="metric">
								<span>Deuda original</span>
								<strong>{money(debtSummary.original)}</strong>
							</div>
							<div className="metric">
								<span>Total pagado</span>
								<strong>{money(debtSummary.paid)}</strong>
							</div>
							<div className="metric">
								<span>Saldo pendiente</span>
								<strong>{money(debtSummary.pending)}</strong>
							</div>
						</section>
						<div className="info-note">
							Deudas abiertas: <strong>{debtSummary.open}</strong>.
							El reporte economico cuenta el egreso al crear la deuda; los
							pagos no duplican ese gasto.
						</div>
						<section
							className="cash-filters debt-filters section-block-end"
							aria-labelledby="debt-filters-title"
						>
							<div className="cash-filters-head">
								<div>
									<h3 id="debt-filters-title">Filtros de deudas</h3>
									<p>
										Busca por concepto, acreedor o proveedor y separa lo
										pendiente de lo saldado.
									</p>
								</div>
								<div className="cash-filter-actions">
									<span className="cash-filter-counter">
										{filteredDebts.length} de {debts.length}
									</span>
									<button
										type="button"
										className="ghost"
										disabled={!debtFiltersActive}
										onClick={onClearDebtFilters}
									>
										Limpiar filtros
									</button>
								</div>
							</div>
							<div className="debt-filter-grid">
								<Field label="Buscar">
									<input
										placeholder="Concepto, acreedor, proveedor o monto"
										value={search}
										onChange={(event) => onSearchChange(event.target.value)}
									/>
								</Field>
								<SearchSelect
									label="Estado"
									value={debtFilters.status}
									options={debtStatusFilterOptions}
									placeholder="Todos"
									onChange={(value) => onDebtFilterChange('status', value)}
								/>
								<SearchSelect
									label="Saldo"
									value={debtFilters.balance}
									options={debtBalanceFilterOptions}
									placeholder="Todas"
									onChange={(value) => onDebtFilterChange('balance', value)}
								/>
							</div>
						</section>
						<div className="records finance-records debt-records">
							{filteredDebts.length ? (
								filteredDebts.map((item) => {
									const quickActions = debtQuickActions(item)
									const hasBalance = numberValue(item.balance_due) > 0
									const baseBadges = [
										{
											label:
												debtStatusLabels[item.status] ?? item.status,
											className: `status ${item.status}`,
										},
										{
											label: hasBalance ? 'Con saldo' : 'Saldada',
											className: hasBalance
												? 'status warning'
												: 'status paid',
										},
									]
									const badges = baseBadges
									return (
										<FinanceRecordCard
											amount={{
												label: 'Saldo',
												value: money(item.balance_due),
												tone: hasBalance ? 'warning' : 'payment',
											}}
											badges={badges}
											className={recordClass(
												'debt',
												item.id,
												'debt-record-card',
											)}
											key={item.id}
											onContextMenu={(event) =>
												onQuickActionsContext(
													event,
													'Acciones de deuda',
													quickActions,
												)
											}
											primaryAction={
												hasBalance
													? {
															label: 'Registrar pago',
															icon: <CreditCard size={15} />,
															onClick: () => onOpenDebtPaymentForDebt(item),
															variant: 'primary',
														}
													: {
															label: 'Abrir detalle',
															icon: <Eye size={15} />,
															onClick: () => onOpenDebtDetail(item),
															variant: 'primary',
														}
											}
											secondaryActions={
												hasBalance
													? [
															{
																label: 'Detalle',
																icon: <Eye size={15} />,
																onClick: () => onOpenDebtDetail(item),
																variant: 'ghost',
															},
														]
													: []
											}
											quickActionsTrigger={renderQuickActionsTrigger(
												'Acciones de deuda',
												quickActions,
												'Acciones rapidas de deuda',
											)}
											stats={[
												{
													label: 'Original',
													value: money(item.principal_amount),
													hint: item.origin_date
														? `Origen ${formatDateLabel(item.origin_date)}`
														: 'Sin fecha de origen',
												},
												{
													label: 'Pagado',
													value: money(item.total_paid),
													hint: 'Pagos registrados',
												},
												{
													label: 'Vencimiento',
													value: item.due_date
														? formatDateLabel(item.due_date)
														: 'Sin limite',
													hint: item.expense_subcategory || item.expense_category,
												},
											]}
											subtitle={joinDisplayParts([
												item.creditor || 'Sin acreedor',
												item.supplier_name,
											])}
											title={item.concept}
										/>
									)
								})
							) : (
								<Empty
									text={
										debts.length
											? 'Sin deudas para estos filtros.'
											: 'Sin deudas registradas.'
									}
									hint={
										debts.length
											? 'Ajusta la busqueda, estado o saldo.'
											: 'Crea una deuda para registrar un egreso adeudado y seguir sus pagos sin duplicar caja.'
									}
									action={
										debts.length ? undefined : (
											<button
												type="button"
												className="primary"
												onClick={onCreateDebt}
											>
												<ReceiptText size={16} />
												Nueva deuda
											</button>
										)
									}
								/>
							)}
						</div>
						<h2 className="subsection-title">Pagos recientes</h2>
						<div className="records finance-records debt-payment-records">
							{debtPayments.slice(0, 5).map((item) => {
								const quickActions = debtPaymentQuickActions(item)
								return (
									<FinanceRecordCard
										amount={{
											label: 'Pago',
											value: money(item.amount),
											tone: 'expense',
										}}
										badges={[
											{
												label:
													debtPaymentMethodLabels[item.method] ??
													item.method,
												className: 'status payment',
											},
										]}
										className={recordClass(
											'debt-payment',
											item.id,
											'debt-payment-record-card',
										)}
										key={item.id}
										onContextMenu={(event) =>
											onQuickActionsContext(
												event,
												'Acciones de pago',
												quickActions,
											)
										}
										primaryAction={{
											label: 'Abrir detalle',
											icon: <Eye size={15} />,
											onClick: () => onOpenDebtPaymentDetail(item),
											variant: 'primary',
										}}
										quickActionsTrigger={renderQuickActionsTrigger(
											'Acciones de pago',
											quickActions,
											'Acciones rapidas de pago',
										)}
										stats={[
											{
												label: 'Fecha',
												value: item.paid_at
													? formatDateLabel(item.paid_at)
													: 'Sin fecha',
												hint: item.notes || 'Pago parcial de deuda',
											},
										]}
										subtitle="Pago parcial registrado"
										title={item.debt_concept}
									/>
								)
							})}
							{debtPayments.length ? null : (
								<Empty
									text="Sin pagos de deuda registrados."
									hint="Cuando pagues una deuda, queda trazada aca sin duplicar el gasto economico."
									action={
										debtOptions.length ? (
											<button
												type="button"
												className="primary"
												onClick={onCreateDebtPayment}
											>
												<CreditCard size={16} />
												Registrar pago
											</button>
										) : (
											<button
												type="button"
												className="ghost"
												onClick={onCreateDebt}
											>
												<ReceiptText size={16} />
												Nueva deuda
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
