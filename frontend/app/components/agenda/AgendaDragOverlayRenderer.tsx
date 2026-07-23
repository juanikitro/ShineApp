import { type ReactNode } from 'react'

import { type AgendaOperationalRow } from '@/lib/agenda'
import {
	reservationAgendaServices,
	reservationShowsWork,
	reservationStartTimeLabel,
	reservationVehicleModel,
} from '@/lib/agenda-display'
import { type AnyRecord } from '@/lib/page-support'
import { workStatusForReservation } from '@/lib/work-orders'

import { AgendaDragOverlayCard } from './AgendaDragOverlayCard'

type AgendaDragOverlayRendererProps = {
	row: AgendaOperationalRow | null
	statusMode?: 'reservation' | 'work-order'
	vehicles: AnyRecord[]
	useReservationTimes: boolean
	workOrderByReservation: Record<string, AnyRecord>
	agendaCardClass: (row: AgendaOperationalRow) => string
	orderLabels: Record<string, string>
	reservationLabels: Record<string, string>
	renderWorkDebt: (workOrder: AnyRecord) => ReactNode
}

type AgendaDragOverlayRendererConfig = Omit<
	AgendaDragOverlayRendererProps,
	'row' | 'statusMode'
>

type AgendaDragOverlayRenderOptions = Pick<
	AgendaDragOverlayRendererProps,
	'statusMode'
>

export function createAgendaDragOverlayRenderer(
	config: AgendaDragOverlayRendererConfig,
) {
	return (
		row: AgendaOperationalRow | null,
		options: AgendaDragOverlayRenderOptions = {},
	) =>
		renderAgendaDragOverlayCard({
			...config,
			row,
			statusMode: options.statusMode,
		})
}

export function renderAgendaDragOverlayCard({
	row,
	statusMode = 'reservation',
	vehicles,
	useReservationTimes,
	workOrderByReservation,
	agendaCardClass,
	orderLabels,
	reservationLabels,
	renderWorkDebt,
}: AgendaDragOverlayRendererProps) {
	if (!row?.reservation) return null
	const workOrder = row.workOrder
	const reservation = row.reservation
	const showWork = reservationShowsWork(reservation, workOrder)
	const showWorkStatus = statusMode === 'work-order' && Boolean(workOrder)
	const serviceLines = reservationAgendaServices(reservation)
	const vehicleModel = reservationVehicleModel(reservation, vehicles)
	const timeLabel = reservationStartTimeLabel(
		reservation,
		useReservationTimes,
		'Sin hora',
	)
	const workStatusValue = String(
		workStatusForReservation(reservation, workOrderByReservation) ??
			reservation.status ??
			'',
	)
	return (
		<AgendaDragOverlayCard
			cardClass={agendaCardClass(row)}
			showWorkStatus={showWorkStatus}
			timeLabel={timeLabel}
			customerName={String(reservation.customer_name ?? '')}
			serviceLines={serviceLines}
			vehicleModel={vehicleModel}
			statusValue={showWorkStatus ? workStatusValue : reservation.status}
			statusLabels={showWorkStatus ? orderLabels : reservationLabels}
			workDebt={showWork ? renderWorkDebt(workOrder as AnyRecord) : null}
		/>
	)
}
