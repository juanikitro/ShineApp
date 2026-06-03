export type AgendaReservationActionVariant =
	| 'filled'
	| 'outline'
	| 'icon-danger'

export type AgendaReservationActionPriority = 'high' | 'medium' | 'low'

export type AgendaReservationActionIcon = 'trash'

type ReservationEndpointAction = 'confirm' | 'cancel' | 'delete'
type WorkOrderStatusValue = 'in_progress' | 'ready' | 'delivered'

export type ReservationStatusAction = {
	action: ReservationEndpointAction
	ariaLabel?: string
	icon?: AgendaReservationActionIcon
	kind: 'reservation'
	label: string
	priority: AgendaReservationActionPriority
	variant: AgendaReservationActionVariant
}

export type WorkOrderStatusAgendaAction = {
	kind: 'work-order-status'
	label: string
	priority: Exclude<AgendaReservationActionPriority, 'low'>
	status: WorkOrderStatusValue
	variant: Exclude<AgendaReservationActionVariant, 'icon-danger'>
}

export type WorkOrderChargeAgendaAction = {
	kind: 'work-order-charge'
	label: 'Cobrar'
	priority: Exclude<AgendaReservationActionPriority, 'low'>
	variant: Exclude<AgendaReservationActionVariant, 'icon-danger'>
}

export type AgendaReservationAction =
	| ReservationStatusAction
	| WorkOrderStatusAgendaAction
	| WorkOrderChargeAgendaAction

type BuildAgendaReservationActionsOptions = {
	balanceDue?: unknown
	canCharge?: boolean
	reservationStatus: unknown
	workOrderStatus?: unknown
}

const actionPriorityOrder: Record<AgendaReservationActionPriority, number> = {
	high: 0,
	medium: 1,
	low: 2,
}

function workOrderStatusAction(
	status: unknown,
): WorkOrderStatusAgendaAction | null {
	if (status === 'confirmed') {
		return {
			kind: 'work-order-status',
			label: 'Iniciar',
			priority: 'high',
			status: 'in_progress',
			variant: 'filled',
		}
	}

	if (status === 'in_progress') {
		return {
			kind: 'work-order-status',
			label: 'Marcar listo',
			priority: 'high',
			status: 'ready',
			variant: 'filled',
		}
	}

	if (status === 'ready') {
		return {
			kind: 'work-order-status',
			label: 'Entregar',
			priority: 'high',
			status: 'delivered',
			variant: 'filled',
		}
	}

	return null
}

function chargeAgendaAction(
	variant: WorkOrderChargeAgendaAction['variant'],
	priority: WorkOrderChargeAgendaAction['priority'],
): WorkOrderChargeAgendaAction {
	return {
		kind: 'work-order-charge',
		label: 'Cobrar',
		priority,
		variant,
	}
}

function asSecondaryStatusAction(
	action: WorkOrderStatusAgendaAction,
): WorkOrderStatusAgendaAction {
	return {
		...action,
		priority: 'medium',
		variant: 'outline',
	}
}

function buildWorkOrderActions(
	options: BuildAgendaReservationActionsOptions,
): AgendaReservationAction[] {
	if (
		options.reservationStatus === 'pending' ||
		options.reservationStatus === 'canceled'
	) {
		return []
	}

	const statusAction = workOrderStatusAction(options.workOrderStatus)
	const balanceDue = Number(options.balanceDue ?? 0)
	const canCharge =
		Boolean(options.canCharge) &&
		Number.isFinite(balanceDue) &&
		balanceDue > 0

	if (!statusAction && !canCharge) {
		return []
	}

	if (statusAction && canCharge) {
		const prioritizeCharge =
			options.workOrderStatus === 'ready' &&
			balanceDue > 0

		if (prioritizeCharge) {
			return [
				chargeAgendaAction('filled', 'high'),
				asSecondaryStatusAction(statusAction),
			]
		}

		return [statusAction, chargeAgendaAction('outline', 'medium')]
	}

	if (statusAction) {
		return [statusAction]
	}

	return [chargeAgendaAction('filled', 'high')]
}

export function reservationStatusActions(
	status: unknown,
): ReservationStatusAction[] {
	if (status === 'pending') {
		return [
			{
				action: 'confirm',
				kind: 'reservation',
				label: 'Confirmar',
				priority: 'high',
				variant: 'filled',
			},
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		]
	}

	if (status === 'confirmed') {
		return [
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		]
	}

	if (status === 'canceled') {
		return [
			{
				action: 'confirm',
				kind: 'reservation',
				label: 'Activar',
				priority: 'high',
				variant: 'filled',
			},
			{
				action: 'delete',
				ariaLabel: 'Eliminar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Eliminar',
				priority: 'low',
				variant: 'icon-danger',
			},
		]
	}

	return []
}

export function buildAgendaReservationActions(
	options: BuildAgendaReservationActionsOptions,
): AgendaReservationAction[] {
	return [
		...buildWorkOrderActions(options),
		...reservationStatusActions(options.reservationStatus),
	].sort(
		(left, right) =>
			actionPriorityOrder[left.priority] - actionPriorityOrder[right.priority],
	)
}
