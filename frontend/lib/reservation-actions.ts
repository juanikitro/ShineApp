import {
	DEFAULT_RESERVATION_STATUS_CONFIG,
	nextActiveStatus,
	type ReservationStatusConfig,
	type ReservationStatusValue,
} from './reservation-status-config'

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
	config?: ReservationStatusConfig
}

const actionPriorityOrder: Record<AgendaReservationActionPriority, number> = {
	high: 0,
	medium: 1,
	low: 2,
}

const WORK_STATUS_LABELS: Record<WorkOrderStatusValue, string> = {
	in_progress: 'Iniciar',
	ready: 'Marcar listo',
	delivered: 'Entregar',
}

const PROGRESS_FROM_STATUSES = new Set<ReservationStatusValue>([
	'confirmed',
	'in_progress',
	'ready',
])

function resolveConfig(config?: ReservationStatusConfig): ReservationStatusConfig {
	return config ?? DEFAULT_RESERVATION_STATUS_CONFIG
}

function workOrderStatusAction(
	status: unknown,
	config: ReservationStatusConfig,
): WorkOrderStatusAgendaAction | null {
	if (typeof status !== 'string') return null
	if (!PROGRESS_FROM_STATUSES.has(status as ReservationStatusValue)) {
		return null
	}
	const target = nextActiveStatus(status as ReservationStatusValue, config)
	if (target === status || target === 'pending' || target === 'confirmed') {
		return null
	}
	return {
		kind: 'work-order-status',
		label: WORK_STATUS_LABELS[target as WorkOrderStatusValue] ?? 'Avanzar',
		priority: 'high',
		status: target as WorkOrderStatusValue,
		variant: 'filled',
	}
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
	config: ReservationStatusConfig,
): AgendaReservationAction[] {
	if (
		options.reservationStatus === 'pending' ||
		options.reservationStatus === 'canceled'
	) {
		return []
	}

	const statusAction = workOrderStatusAction(options.workOrderStatus, config)
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
			statusAction.status === 'delivered' &&
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

function cancelOrDeleteAction(
	config: ReservationStatusConfig,
): ReservationStatusAction {
	if (config.useCanceled) {
		return {
			action: 'cancel',
			ariaLabel: 'Cancelar reserva',
			icon: 'trash',
			kind: 'reservation',
			label: 'Cancelar',
			priority: 'low',
			variant: 'icon-danger',
		}
	}
	return {
		action: 'delete',
		ariaLabel: 'Eliminar reserva',
		icon: 'trash',
		kind: 'reservation',
		label: 'Eliminar',
		priority: 'low',
		variant: 'icon-danger',
	}
}

export function reservationStatusActions(
	status: unknown,
	config?: ReservationStatusConfig,
): ReservationStatusAction[] {
	const resolvedConfig = resolveConfig(config)

	if (status === 'pending') {
		return [
			{
				action: 'confirm',
				kind: 'reservation',
				label: 'Confirmar',
				priority: 'high',
				variant: 'filled',
			},
			cancelOrDeleteAction(resolvedConfig),
		]
	}

	if (status === 'confirmed') {
		return [cancelOrDeleteAction(resolvedConfig)]
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
				priority: 'high',
				variant: 'icon-danger',
			},
		]
	}

	return []
}

export function buildAgendaReservationActions(
	options: BuildAgendaReservationActionsOptions,
): AgendaReservationAction[] {
	const config = resolveConfig(options.config)
	return [
		...buildWorkOrderActions(options, config),
		...reservationStatusActions(options.reservationStatus, config),
	].sort(
		(left, right) =>
			actionPriorityOrder[left.priority] - actionPriorityOrder[right.priority],
	)
}
