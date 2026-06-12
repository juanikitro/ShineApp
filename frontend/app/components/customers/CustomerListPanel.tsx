'use client'

import { type MouseEvent } from 'react'

import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { cx } from '@/app/components/utils'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AnyRecord,
	birthdayText,
	formatDateLabel,
	money,
} from '@/lib/page-support'
import { serviceDisplayName } from '@/lib/service-display'

export type CustomerCardFilter =
	| 'all'
	| 'with_reservation'
	| 'birthday_soon'
	| 'no_upcoming'
	| 'with_balance'

type CustomerFilterOption = {
	value: CustomerCardFilter
	label: string
}

type CustomerListPanelProps = {
	customers: AnyRecord[]
	totalCustomers: number
	search: string
	filter: CustomerCardFilter
	filterOptions: CustomerFilterOption[]
	canViewEconomy: boolean
	showReservationTimes: boolean
	vehicleCountByCustomerId: ReadonlyMap<string, number>
	getRecordClassName: (customer: AnyRecord) => string
	onSearchChange: (value: string) => void
	onFilterChange: (value: CustomerCardFilter) => void
	onCreate: () => void
	onOpenDashboard: (customer: AnyRecord) => void
	onEdit: (customer: AnyRecord) => void
	onDelete: (customer: AnyRecord) => void
	onOpenQuickActions?: (
		event: MouseEvent<HTMLElement>,
		customer: AnyRecord,
	) => void
	onOpenQuickActionsFromTrigger?: (
		event: MouseEvent<HTMLButtonElement>,
		customer: AnyRecord,
	) => void
}

function formatTimeLabel(value: any) {
	const raw = String(value ?? '')
	return raw.length >= 5 ? raw.slice(0, 5) : ''
}

function customerScheduleLabel(
	reservation: AnyRecord | null | undefined,
	showReservationTimes = true,
) {
	if (!reservation?.day) return 'Sin reserva futura'
	const time =
		showReservationTimes && reservation.start_time
			? ` ${formatTimeLabel(reservation.start_time)}`
			: ''
	return `${formatDateLabel(reservation.day)}${time}`
}

function customerListInsights(customer: AnyRecord) {
	return customer?.list_insights ?? {}
}

function customerDaysText(value: any, emptyText = 'Sin dato') {
	const days = Number(value)
	if (!Number.isFinite(days)) return emptyText
	if (days === 0) return 'Hoy'
	if (days === 1) return '1 dia'
	return `${days} dias`
}

function customerDaysAgoText(value: any, emptyText = 'Sin dato') {
	const label = customerDaysText(value, emptyText)
	if (label === emptyText || label === 'Hoy') return label
	return `Hace ${label}`
}

function customerNextVisitText(
	customer: AnyRecord,
	showReservationTimes = true,
) {
	const insights = customerListInsights(customer)
	if (!insights.has_upcoming_reservation || !insights.next_reservation) {
		return 'Sin proxima visita'
	}
	return customerScheduleLabel(insights.next_reservation, showReservationTimes)
}

function customerOperationalStateText(customer: AnyRecord) {
	const insights = customerListInsights(customer)
	if (customer?.has_birthday_alert) return 'Cumple pronto'
	if (insights.has_balance_due) return 'Con saldo'
	if (insights.has_upcoming_reservation) return 'Con reserva'
	if (insights.needs_follow_up) return 'Seguimiento pendiente'
	return 'Sin novedades'
}

function customerPrimaryPill(customer: AnyRecord, canViewEconomy: boolean) {
	const insights = customerListInsights(customer)
	if (customer?.has_birthday_alert) {
		return { label: 'Cumple pronto', className: 'customer-pill--birthday' }
	}
	if (canViewEconomy && insights.has_balance_due) {
		return { label: 'Con saldo', className: 'customer-pill--balance' }
	}
	if (insights.has_upcoming_reservation) {
		return { label: 'Con reserva', className: 'customer-pill--reservation' }
	}
	if (insights.needs_follow_up) {
		return {
			label: 'Sin proxima visita',
			className: 'customer-pill--follow-up',
		}
	}
	return null
}

function customerContextChips(
	customer: AnyRecord,
	canViewEconomy: boolean,
	showReservationTimes = true,
) {
	const insights = customerListInsights(customer)
	const chips: Array<{ key: string; label: string; tone?: string }> = []

	if (customer?.has_birthday_alert) {
		chips.push({
			key: 'birthday',
			label: birthdayText(customer),
			tone: 'alert',
		})
	}
	if (insights.has_upcoming_reservation && insights.next_reservation) {
		chips.push({
			key: 'reservation',
			label: `Reserva ${customerScheduleLabel(
				insights.next_reservation,
				showReservationTimes,
			)}`,
			tone: 'info',
		})
	} else {
		chips.push({
			key: 'follow-up',
			label: 'Sin proxima visita',
			tone: 'muted',
		})
	}
	if (insights.last_service_name) {
		chips.push({
			key: 'service',
			label: `Ultimo servicio: ${insights.last_service_name}`,
			tone: 'muted',
		})
	}
	if (canViewEconomy && insights.has_balance_due) {
		chips.push({
			key: 'balance',
			label: `Saldo ${money(insights.balance_due_total)}`,
			tone: 'warning',
		})
	}

	return chips.slice(0, 4)
}

export function CustomerListPanel({
	customers,
	totalCustomers,
	search,
	filter,
	filterOptions,
	canViewEconomy,
	showReservationTimes,
	vehicleCountByCustomerId,
	getRecordClassName,
	onSearchChange,
	onFilterChange,
	onCreate,
	onOpenDashboard,
	onEdit,
	onDelete,
	onOpenQuickActions,
	onOpenQuickActionsFromTrigger,
}: CustomerListPanelProps) {
	const hasSearch = Boolean(search.trim())
	const hasActiveFilter = hasSearch || filter !== 'all'
	const showLowDataGuidance =
		totalCustomers > 0 && totalCustomers < 3 && !hasActiveFilter
	const filterLabel =
		filterOptions.find((option) => option.value === filter)?.label ?? 'Todos'
	const primaryActionLabel = canViewEconomy ? 'Dashboard' : 'Detalle'

	return (
		<section className="panel customer-list-panel">
			<div className="panel-head customer-list-head">
				<div>
					<p>
						{customers.length} de {totalCustomers}{' '}
						{totalCustomers === 1 ? 'cliente visible' : 'clientes visibles'} ·{' '}
						{filterLabel}
					</p>
				</div>
				<button type="button" className="primary" onClick={onCreate}>
					<Plus size={16} />
					Nuevo cliente
				</button>
			</div>
			<div className="customer-list-toolbar">
				<input
					aria-label="Buscar clientes"
					name="customer_search"
					placeholder="Buscar por nombre, telefono, email, patente o modelo"
					value={search}
					onChange={(event) => onSearchChange(event.target.value)}
				/>
				<SegmentedControl
					ariaLabel="Filtrar clientes"
					className="customer-filter-toggle"
					options={filterOptions}
					value={filter}
					onChange={onFilterChange}
				/>
			</div>
			{showLowDataGuidance ? (
				<div className="customer-guidance" role="note">
					<div className="customer-guidance-copy">
						<strong>Cartera en armado</strong>
						<span>
							Suma clientes con vehiculo y proxima visita para que el tablero
							priorice seguimiento, reservas y saldo.
						</span>
					</div>
					<button type="button" className="ghost" onClick={onCreate}>
						<Plus size={16} />
						Sumar cliente
					</button>
				</div>
			) : null}
			<div className="records customer-records">
				{customers.length ? (
					customers.map((customer) => {
						const insights = customerListInsights(customer)
						const customerName = serviceDisplayName(customer)
						const primaryPill = customerPrimaryPill(customer, canViewEconomy)
						const nextReservation = insights.next_reservation
						const chips = customerContextChips(
							customer,
							canViewEconomy,
							showReservationTimes,
						)
						const vehicleCount =
							vehicleCountByCustomerId.get(String(customer.id)) ??
							Number(insights.vehicles_count ?? 0)
						const lastVisitText = insights.last_visit_at
							? formatDateLabel(insights.last_visit_at)
							: 'Sin trabajos'
						const lastVisitHint = insights.last_visit_at
							? joinDisplayParts([
									customerDaysAgoText(insights.days_since_last_visit),
									insights.last_service_name,
									insights.last_vehicle_label,
								])
							: 'Sin historial operativo'
						const balanceValue = canViewEconomy
							? money(insights.balance_due_total)
							: customerOperationalStateText(customer)

						return (
							<MotionFlashSurface
								className={cx(
									getRecordClassName(customer),
									'customer-record-card',
								)}
								key={customer.id}
								onContextMenu={(event) =>
									onOpenQuickActions?.(event, customer)
								}
							>
								<div className="customer-record-identity">
									<div className="customer-record-name">
										<span className="record-title">{customerName}</span>
										{primaryPill ? (
											<span className={cx('customer-pill', primaryPill.className)}>
												{primaryPill.label}
											</span>
										) : null}
									</div>
									<div className="record-sub">
										{joinDisplayParts([
											customer.phone || 'Sin telefono',
											customer.email || 'Sin email',
										])}
									</div>
									<div className="customer-card-meta">
										{chips.map((chip) => (
											<span
												className={cx(
													'customer-chip',
													chip.tone && `customer-chip--${chip.tone}`,
												)}
												key={`${customer.id}-${chip.key}`}
											>
												{chip.label}
											</span>
										))}
									</div>
								</div>
								<div className="customer-record-stats">
									<div className="customer-record-stat">
										<span>Proxima visita</span>
										<strong>
											{customerNextVisitText(customer, showReservationTimes)}
										</strong>
										<small>
											{nextReservation
												? nextReservation.services ||
													nextReservation.vehicle ||
													'Reserva programada'
												: 'Sin agenda futura'}
										</small>
									</div>
									<div className="customer-record-stat">
										<span>Ultima visita</span>
										<strong>{lastVisitText}</strong>
										<small>{lastVisitHint}</small>
									</div>
									<div className="customer-record-stat">
										<span>Vehiculos</span>
										<strong>{vehicleCount}</strong>
										<small>
											{insights.last_vehicle_label ||
												'Sin vehiculo reciente'}
										</small>
									</div>
									<div className="customer-record-stat">
										<span>{canViewEconomy ? 'Saldo' : 'Estado'}</span>
										<strong>{balanceValue}</strong>
										<small>
											{canViewEconomy
												? `${insights.balance_due_work_orders_count ?? 0} trabajos con saldo`
												: customerOperationalStateText(customer)}
										</small>
									</div>
								</div>
								<div className="customer-record-actions">
									<button
										type="button"
										className="primary"
										aria-label={`Abrir ${primaryActionLabel.toLowerCase()} de ${customerName}`}
										onClick={() => onOpenDashboard(customer)}
									>
										<Eye size={15} />
										{primaryActionLabel}
									</button>
									<div className="customer-secondary-actions">
										<button
											className="ghost"
											type="button"
											aria-label={`Editar cliente ${customerName}`}
											onClick={() => onEdit(customer)}
										>
											<Pencil size={15} />
											Editar
										</button>
										<button
											className="danger"
											type="button"
											aria-label={`Dar de baja cliente ${customerName}`}
											onClick={() => onDelete(customer)}
										>
											<Trash2 size={15} />
											Baja
										</button>
										{onOpenQuickActionsFromTrigger ? (
											<button
												className="ghost icon-button quick-actions-trigger"
												type="button"
												aria-label={`Acciones rapidas de ${customerName}`}
												title={`Acciones rapidas de ${customerName}`}
												onClick={(event) =>
													onOpenQuickActionsFromTrigger(event, customer)
												}
											>
												<MoreHorizontal size={15} />
											</button>
										) : null}
									</div>
								</div>
							</MotionFlashSurface>
						)
					})
				) : (
					<Empty
						text={
							hasActiveFilter
								? 'Sin clientes para este criterio.'
								: 'Todavia no hay clientes cargados.'
						}
						hint={
							hasActiveFilter
								? 'Limpia la busqueda o cambia el filtro para volver a la cartera completa.'
								: 'Crea el primer cliente para empezar a vincular vehiculos, reservas y pagos.'
						}
						action={
							hasActiveFilter ? (
								<button
									type="button"
									className="ghost"
									onClick={() => {
										onSearchChange('')
										onFilterChange('all')
									}}
								>
									Limpiar filtros
								</button>
							) : (
								<button type="button" className="primary" onClick={onCreate}>
									<Plus size={16} />
									Nuevo cliente
								</button>
							)
						}
					/>
				)}
			</div>
		</section>
	)
}
