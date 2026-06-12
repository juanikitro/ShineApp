'use client'

import { CalendarClock, CreditCard, Eye, RefreshCw, RotateCcw } from 'lucide-react'

import { FinanceRecordCard } from '@/app/components/finance/FinanceRecordCard'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { Field } from '@/app/components/ui/Field'
import { Button } from '@/app/components/ui/Button'
import { joinDisplayParts } from '@/lib/display-text'
import { type ApiErrorNotice } from '@/lib/api-errors'
import {
	type AnyRecord,
	debtPaymentMethodLabels,
	fixedExpenseIntervalLabels,
	formatDateLabel,
	money,
	numberValue,
	today,
} from '@/lib/page-support'

type FixedExpensePanelProps = {
	fixedExpenses: AnyRecord[]
	occurrences: AnyRecord[]
	loading: boolean
	loadBlocked: boolean
	loadErrorNotice: ApiErrorNotice | null
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	search: string
	onSearchChange: (value: string) => void
	onCreateFixedExpense: () => void
	onEditFixedExpense: (item: AnyRecord) => void
	onOpenOccurrenceDetail: (item: AnyRecord) => void
	onPayOccurrence: (item: AnyRecord) => void
	onUnpayOccurrence: (id: string | number) => void
	onPauseFixedExpense: (id: string | number) => void
	onResumeFixedExpense: (id: string | number) => void
	onDeleteFixedExpense: (id: string | number) => void
	onRefresh: () => void
}

function matchesSearch(text: string, query: string) {
	if (!query) return true
	return text.toLowerCase().includes(query.toLowerCase())
}

function monthlyEquivalent(plan: AnyRecord) {
	const amount = numberValue(plan.amount)
	const count = Math.max(Number(plan.interval_count) || 1, 1)
	const perMonth = plan.interval_unit === 'weeks' ? 52 / 12 / count : 1 / count
	return amount * perMonth
}

export function FixedExpensePanel({
	fixedExpenses,
	occurrences,
	loading,
	loadBlocked,
	loadErrorNotice,
	recordClass,
	search,
	onSearchChange,
	onCreateFixedExpense,
	onEditFixedExpense,
	onOpenOccurrenceDetail,
	onPayOccurrence,
	onUnpayOccurrence,
	onPauseFixedExpense,
	onResumeFixedExpense,
	onDeleteFixedExpense,
	onRefresh,
}: FixedExpensePanelProps) {
	const pending = occurrences.filter((item) => item.status === 'pending')
	const paid = occurrences.filter((item) => item.status === 'paid')
	const pendingTotal = pending.reduce((sum, item) => sum + numberValue(item.amount), 0)
	const activeCount = fixedExpenses.filter((item) => item.is_active).length
	const monthlyEstimate = fixedExpenses
		.filter((item) => item.is_active)
		.reduce((sum, item) => sum + monthlyEquivalent(item), 0)

	const filteredPlans = fixedExpenses.filter((plan) =>
		matchesSearch(joinDisplayParts([plan.concept, plan.supplier_name]) || '', search),
	)
	const filteredPending = pending.filter((item) =>
		matchesSearch(String(item.fixed_expense_concept ?? ''), search),
	)

	return (
		<div className="grid">
			<section
				className="panel finance-panel fixed-expense-panel"
				aria-label="Gastos fijos"
			>
				<div className="panel-head finance-panel-head">
					<div className="finance-action-rail">
						<div className="finance-primary-actions">
							<Button
								variant="primary"
								onClick={onCreateFixedExpense}
							>
								<CalendarClock size={16} />
								Nuevo gasto fijo
							</Button>
						</div>
					</div>
				</div>
				{loadBlocked ? (
					<ErrorState
						text={
							loadErrorNotice?.title ??
							'No se pudieron cargar los gastos fijos'
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
				{!loadBlocked && loading && !fixedExpenses.length && !occurrences.length ? (
					<SkeletonList rows={6} columns={4} label="Cargando gastos fijos" />
				) : null}
				{!loadBlocked && (!loading || fixedExpenses.length || occurrences.length) ? (
					<>
						<section className="grid three section-block-end">
							<div className="metric">
								<span>Gastos fijos activos</span>
								<strong>{activeCount}</strong>
							</div>
							<div className="metric">
								<span>Por pagar</span>
								<strong>{money(pendingTotal)}</strong>
							</div>
							<div className="metric">
								<span>Estimado mensual</span>
								<strong>{money(monthlyEstimate)}</strong>
							</div>
						</section>
						<section className="fixed-expense-filters section-block-end">
							<Field label="Buscar">
								<input
									placeholder="Concepto o proveedor"
									value={search}
									onChange={(event) => onSearchChange(event.target.value)}
								/>
							</Field>
						</section>
						{filteredPending.length ? (
							<>
								<h2 className="subsection-title">Por pagar del periodo</h2>
								<div className="records finance-records fixed-expense-records">
									{filteredPending.map((item) => {
										const overdue = Boolean(
											item.due_date && String(item.due_date) < today,
										)
										return (
											<FinanceRecordCard
												amount={{
													label: 'Monto',
													value: money(item.amount),
													tone: overdue ? 'expense' : 'warning',
												}}
												badges={[
													overdue
														? { label: 'Vencido', className: 'status overdue' }
														: { label: 'Por pagar', className: 'status warning' },
												]}
												className={recordClass(
													'fixed-expense-occurrence',
													item.id,
													'fixed-expense-record-card',
												)}
												key={item.id}
												primaryAction={{
													label: 'Registrar pago',
													icon: <CreditCard size={15} />,
													onClick: () => onPayOccurrence(item),
													variant: 'primary',
												}}
												secondaryActions={[
													{
														label: 'Detalle',
														icon: <Eye size={15} />,
														onClick: () => onOpenOccurrenceDetail(item),
														variant: 'ghost',
													},
												]}
												stats={[
													{
														label: 'Periodo',
														value: item.period_date
															? formatDateLabel(item.period_date)
															: 'Sin fecha',
													},
													{
														label: 'Vence',
														value: item.due_date
															? formatDateLabel(item.due_date)
															: 'Sin limite',
														hint: item.expense_subcategory || item.expense_category,
													},
												]}
												subtitle="Periodo pendiente de pago"
												title={item.fixed_expense_concept}
											/>
										)
									})}
								</div>
							</>
						) : null}
						<h2 className="subsection-title">Plantillas</h2>
						<section className="fixed-expense-list section-block-end">
							{filteredPlans.length ? (
								<ul>
									{filteredPlans.map((plan) => {
										const unit =
											fixedExpenseIntervalLabels[plan.interval_unit] ??
											plan.interval_unit
										return (
											<li
												key={plan.id}
												className={`fixed-expense-item${plan.is_active ? '' : ' paused'}`}
											>
												<button
													type="button"
													className="fixed-expense-item-main"
													onClick={() => onEditFixedExpense(plan)}
												>
													<strong>{plan.concept}</strong>
													<span>
														{money(plan.amount)} - cada {plan.interval_count}{' '}
														{unit}
													</span>
													{plan.next_occurrence ? (
														<span>Proximo: {formatDateLabel(plan.next_occurrence)}</span>
													) : (
														<span>Sin proximos periodos</span>
													)}
													{plan.auto_pay ? <span>Pago automatico</span> : null}
												</button>
												<div className="fixed-expense-item-actions">
													{plan.is_active ? (
														<Button
															variant="ghost"
															onClick={() => onPauseFixedExpense(plan.id)}
														>
															Pausar
														</Button>
													) : (
														<Button
															variant="ghost"
															onClick={() => onResumeFixedExpense(plan.id)}
														>
															Reanudar
														</Button>
													)}
													<Button
														variant="danger"
														onClick={() => onDeleteFixedExpense(plan.id)}
													>
														Eliminar
													</Button>
												</div>
											</li>
										)
									})}
								</ul>
							) : (
								<Empty
									text={
										fixedExpenses.length
											? 'Sin gastos fijos para esa busqueda.'
											: 'Sin gastos fijos cargados.'
									}
									hint={
										fixedExpenses.length
											? 'Ajusta el termino de busqueda.'
											: 'Carga servicios, alquiler o expensas para reflejarlos en los costos del periodo.'
									}
									action={
										fixedExpenses.length ? undefined : (
											<Button
												variant="primary"
												onClick={onCreateFixedExpense}
											>
												<CalendarClock size={16} />
												Nuevo gasto fijo
											</Button>
										)
									}
								/>
							)}
						</section>
						{paid.length ? (
							<>
								<h2 className="subsection-title">Pagos recientes</h2>
								<div className="records finance-records fixed-expense-payment-records">
									{paid.slice(0, 5).map((item) => (
										<FinanceRecordCard
											amount={{
												label: 'Pagado',
												value: money(item.amount),
												tone: 'expense',
											}}
											badges={[
												{
													label:
														debtPaymentMethodLabels[item.method] ?? item.method,
													className: 'status payment',
												},
											]}
											className={recordClass(
												'fixed-expense-occurrence',
												item.id,
												'fixed-expense-record-card',
											)}
											key={item.id}
											primaryAction={{
												label: 'Abrir detalle',
												icon: <Eye size={15} />,
												onClick: () => onOpenOccurrenceDetail(item),
												variant: 'primary',
											}}
											secondaryActions={[
												{
													label: 'Revertir',
													icon: <RotateCcw size={15} />,
													onClick: () => onUnpayOccurrence(item.id),
													variant: 'ghost',
												},
											]}
											stats={[
												{
													label: 'Periodo',
													value: item.period_date
														? formatDateLabel(item.period_date)
														: 'Sin fecha',
													hint: item.expense_subcategory || item.expense_category,
												},
											]}
											subtitle="Egreso registrado en caja"
											title={item.fixed_expense_concept}
										/>
									))}
								</div>
							</>
						) : null}
					</>
				) : null}
			</section>
		</div>
	)
}
