'use client'

import { StatusPill } from '@/app/components/ui/StatusPill'
import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { reservationRangeLabel } from '@/lib/agenda-display'
import { customerScheduleLabel } from '@/lib/customer-display'
import { type AnyRecord } from '@/lib/page-support'

type CustomerUpcomingReservationsPanelProps = {
	reservationRows: AnyRecord[]
	reservations: AnyRecord[]
	reservationLabels: Record<string, string>
	useReservationTimes: boolean
	onOpenReservation: (reservation: AnyRecord) => void
}

export function CustomerUpcomingReservationsPanel({
	reservationRows,
	reservations,
	reservationLabels,
	useReservationTimes,
	onOpenReservation,
}: CustomerUpcomingReservationsPanelProps) {
	return (
		<Panel
			title="Agenda del cliente"
			subtitle={`${reservationRows.length} reservas futuras visibles`}
		>
			<div className="records compact-records">
				{reservationRows.length ? (
					reservationRows.map((reservation: AnyRecord) => {
						const detailReservation =
							reservations.find(
								(item) => String(item.id) === String(reservation.id),
							) ?? reservation
						return (
							<button
								className="record compact"
								key={`customer-reservation-${reservation.id}`}
								onClick={() => onOpenReservation(detailReservation)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{reservation.services} - {reservation.vehicle}
										</div>
										<div className="record-sub">
											{customerScheduleLabel(reservation, useReservationTimes)} -{' '}
											{reservationRangeLabel(reservation, useReservationTimes) ||
												'sin salida extendida'}
										</div>
									</div>
									<div className="record-actions">
										<StatusPill
											value={reservation.status}
											labels={reservationLabels}
										/>
									</div>
								</div>
							</button>
						)
					})
				) : (
					<Empty text="Este cliente no tiene reservas futuras." />
				)}
			</div>
		</Panel>
	)
}
