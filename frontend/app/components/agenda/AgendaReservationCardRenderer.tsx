import { type HTMLAttributes, type ReactNode } from 'react'

import { type AgendaOperationalRow } from '@/lib/agenda'
import {
	reservationAgendaServices,
	reservationRangeLabel,
	reservationShowsWork,
	reservationStartTimeLabel,
	reservationVehicleModel,
} from '@/lib/agenda-display'
import { type AnyRecord, agendaPhaseLabels } from '@/lib/page-support'
import {
	type AgendaReservationAction,
	buildAgendaReservationActions,
} from '@/lib/reservation-actions'
import { type ReservationStatusConfig } from '@/lib/reservation-status-config'
import { workStatusForReservation } from '@/lib/work-orders'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'

import { AgendaReservationCard } from './AgendaReservationCard'

type AgendaReservationCardRendererProps = {
	reservation: AnyRecord
	workOrder: AnyRecord | null | undefined
	row: AgendaOperationalRow
	statusMode?: 'reservation' | 'work-order'
	vehicles: AnyRecord[]
	useReservationTimes: boolean
	workOrderByReservation: Record<string, AnyRecord>
	canViewEconomy: boolean
	reservationStatusConfig: ReservationStatusConfig
	agendaMovePendingId: string | null
	isActionPending: (key: string) => boolean
	getQuickActions: (
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		actions: AgendaReservationAction[],
	) => QuickAction[]
	detailRecordProps: (
		title: string,
		data: AnyRecord,
	) => HTMLAttributes<HTMLDivElement>
	quickActionTargetProps: (
		title: string,
		actions: QuickAction[],
	) => HTMLAttributes<HTMLDivElement>
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	renderWorkDebt: (workOrder: AnyRecord) => ReactNode
	orderLabels: Record<string, string>
	reservationLabels: Record<string, string>
	onAction: (
		action: AgendaReservationAction,
		reservation: AnyRecord,
		workOrder: AnyRecord | null,
		row: AgendaOperationalRow,
	) => void | Promise<unknown>
}

type AgendaReservationCardRendererConfig = Omit<
	AgendaReservationCardRendererProps,
	'reservation' | 'workOrder' | 'row' | 'statusMode'
>

type AgendaReservationCardRenderOptions = Pick<
	AgendaReservationCardRendererProps,
	'statusMode'
>

export function createAgendaReservationCardRenderer(
	config: AgendaReservationCardRendererConfig,
) {
	return (
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		options: AgendaReservationCardRenderOptions = {},
	) =>
		renderAgendaReservationCardItem({
			...config,
			reservation,
			workOrder,
			row,
			statusMode: options.statusMode,
		})
}

export function renderAgendaReservationCardItem({
	reservation,
	workOrder,
	row,
	statusMode,
	vehicles,
	useReservationTimes,
	workOrderByReservation,
	canViewEconomy,
	reservationStatusConfig,
	agendaMovePendingId,
	isActionPending,
	getQuickActions,
	detailRecordProps,
	quickActionTargetProps,
	renderQuickActionsTrigger,
	renderWorkDebt,
	orderLabels,
	reservationLabels,
	onAction,
}: AgendaReservationCardRendererProps) {
	const showWork = reservationShowsWork(reservation, workOrder)
	const rangeLabel = reservationRangeLabel(reservation, useReservationTimes)
	const serviceLines = reservationAgendaServices(reservation)
	const vehicleModel = reservationVehicleModel(reservation, vehicles)
	const workOrderForDetail = workOrder
		? { ...workOrder, _agenda_day: row.day }
		: workOrder
	const workStatusValue = String(
		workStatusForReservation(reservation, workOrderByReservation) ??
			reservation.status ??
			'',
	)
	const reservationStatusValue = String(reservation.status ?? '')
	const actions = buildAgendaReservationActions({
		balanceDue: showWork ? workOrder?.balance_due : undefined,
		canCharge: Boolean(showWork && workOrder && canViewEconomy),
		reservationStatus: reservation.status,
		workOrderStatus: showWork ? workOrder?.status : undefined,
		config: reservationStatusConfig,
	})
	const quickActions = getQuickActions(reservation, workOrder, row, actions)

	const reservationIdStr = String(reservation.id ?? '')
	const workOrderId = workOrder?.id != null ? String(workOrder.id) : ''
	const cardSaving =
		(agendaMovePendingId !== null &&
			agendaMovePendingId === reservationIdStr) ||
		isActionPending(`reservation-status:${reservationIdStr}`) ||
		(workOrderId ? isActionPending(`wo-status:${workOrderId}`) : false)

	return (
		<AgendaReservationCard
			actions={actions}
			detailProps={{
				...detailRecordProps(
					'Reserva',
					showWork
						? { ...reservation, work_order: workOrderForDetail }
						: reservation,
				),
				...quickActionTargetProps('Acciones de agenda', quickActions),
			}}
			phase={row.phase}
			phaseLabel={agendaPhaseLabels[row.phase]}
			quickActionsTrigger={renderQuickActionsTrigger(
				'Acciones de agenda',
				quickActions,
				'Acciones rapidas de agenda',
			)}
			rangeLabel={rangeLabel}
			reservation={reservation}
			reservationStatusLabel={
				reservationLabels[reservationStatusValue] ?? reservationStatusValue
			}
			reservationStatusValue={reservationStatusValue}
			saving={cardSaving}
			serviceLines={serviceLines}
			statusMode={statusMode}
			timeLabel={reservationStartTimeLabel(
				reservation,
				useReservationTimes,
				'Sin hora',
			)}
			title={String(reservation.customer_name ?? '')}
			vehicleModel={vehicleModel}
			workDebt={showWork ? renderWorkDebt(workOrder as AnyRecord) : null}
			workStatusLabels={orderLabels}
			workStatusValue={workStatusValue}
			onAction={(action) =>
				onAction(
					action,
					reservation,
					showWork ? (workOrder as AnyRecord) : null,
					row,
				)
			}
		/>
	)
}
