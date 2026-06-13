'use client'

import { type MouseEvent } from 'react'

import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Button } from '@/app/components/ui/Button'
import { Empty } from '@/app/components/ui/Empty'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { cx } from '@/app/components/utils'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AnyRecord,
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

function customerOperationalStateHint(customer: AnyRecord) {
	const insights = customerListInsights(customer)
	if (customer?.has_birthday_alert && customer.birthday_label) {
		return String(customer.birthday_label)
	}
	if (insights.has_upcoming_reservation && insights.next_reservation?.day) {
		return formatDateLabel(insights.next_reservation.day)
	}
	if (insights.last_visit_at) {
		return customerDaysAgoText(insights.days_since_last_visit, '')
	}
	return ''
}

function customerPrimaryPill(
	customer: AnyRecord,
	showReservationTimes = true,
) {
	const insights = customerListInsights(customer)
	if (!insights.has_upcoming_reservation || !insights.next_reservation) {
		return null
	}
	const dateLabel = customerScheduleLabel(
		insights.next_reservation,
		showReservationTimes,
	)
	return {
		label: `Con reserva: ${dateLabel}`,
		className: 'customer-pill--reservation',
	}
}

function customerBirthdayLabel(customer: AnyRecord) {
	const dateLabel = formatDateLabel(customer.next_birthday)
	const days = Number(customer.days_until_birthday)
	if (days === 0) return `Cumple hoy: ${dateLabel}`
	if (days === 1) return `Cumple manana: ${dateLabel}`
	return `Cumple pronto: ${dateLabel}`
}

function customerContextChips(customer: AnyRecord) {
	if (!customer?.has_birthday_alert) return []
	return [
		{
			key: 'birthday',
			label: customerBirthdayLabel(customer),
			tone: 'alert',
		},
	]
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
				<Button type="button" variant="primary" onClick={onCreate}>
					<Plus size={16} />
					Nuevo cliente
				</Button>
			</div>
			<div className="customer-list-toolbar">
				<input
					type="search"
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
					<Button type="button" variant="ghost" onClick={onCreate}>
						<Plus size={16} />
						Sumar cliente
					</Button>
				</div>
			) : null}
			<div className="records customer-records">
				{customers.length ? (
					customers.map((customer) => {
						const insights = customerListInsights(customer)
						const customerName = serviceDisplayName(customer)
						const primaryPill = customerPrimaryPill(
							customer,
							showReservationTimes,
						)
						const nextReservation = insights.next_reservation
						const chips = customerContextChips(customer)
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
									{chips.length ? (
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
									) : null}
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
												: customerOperationalStateHint(customer)}
										</small>
									</div>
								</div>
								<div className="customer-record-actions">
									<Button
										type="button"
										variant="primary"
										aria-label={`Abrir ${primaryActionLabel.toLowerCase()} de ${customerName}`}
										onClick={() => onOpenDashboard(customer)}
									>
										<Eye size={16} />
										{primaryActionLabel}
									</Button>
									<div className="customer-secondary-actions">
										<Button
											variant="ghost"
											type="button"
											aria-label={`Editar cliente ${customerName}`}
											onClick={() => onEdit(customer)}
										>
											<Pencil size={16} />
											Editar
										</Button>
										<Button
											variant="danger"
											type="button"
											aria-label={`Dar de baja cliente ${customerName}`}
											onClick={() => onDelete(customer)}
										>
											<Trash2 size={16} />
											Baja
										</Button>
										{onOpenQuickActions ? (
											<Button
												variant="ghost"
												type="button"
												className="icon-button"
												aria-label={`Mas acciones de ${customerName}`}
												title="Mas acciones"
												onClick={(event) => onOpenQuickActions(event, customer)}
											>
												<MoreHorizontal size={16} />
											</Button>
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
								<Button
									type="button"
									variant="ghost"
									onClick={() => {
										onSearchChange('')
										onFilterChange('all')
									}}
								>
									Limpiar filtros
								</Button>
							) : (
								<Button type="button" variant="primary" onClick={onCreate}>
									<Plus size={16} />
									Nuevo cliente
								</Button>
							)
						}
					/>
				)}
			</div>
		</section>
	)
}
