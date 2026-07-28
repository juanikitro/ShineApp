'use client'

import { CalendarClock, CreditCard } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { ModalFrame } from '@/app/components/ui/ModalFrame'
import { RecordCard } from '@/app/components/ui/RecordCard'
import { StatusPill } from '@/app/components/ui/StatusPill'
import {
	formatDateLabel,
	money,
	reservationLabels,
} from '@/lib/page-support'
import {
	type OverdueReservation,
	type OverdueReservationsLoadState,
} from '@/lib/overdue-reservations'

type OverdueReservationsModalProps = {
	canViewEconomy: boolean
	loadState: OverdueReservationsLoadState
	reservations: OverdueReservation[]
	onClose: () => void
	onOpenPayment: (workOrder: Record<string, any>) => void
	onOpenReservation: (reservation: OverdueReservation) => void
	onRetry: () => void
}

function overdueDaysLabel(value: unknown) {
	const days = Number(value) || 0
	return `${days} ${days === 1 ? 'dia vencida' : 'dias vencida'}`
}

export function OverdueReservationsModal({
	canViewEconomy,
	loadState,
	reservations,
	onClose,
	onOpenPayment,
	onOpenReservation,
	onRetry,
}: OverdueReservationsModalProps) {
	return (
		<ModalFrame title="Reservas vencidas" onClose={onClose}>
			<div className="overdue-reservations-modal">
				<p className="overdue-reservations-intro">
					Revisa las entregas y cobros pendientes, desde las reservas mas
					antiguas.
				</p>
				{loadState === 'idle' || loadState === 'loading' ? (
					<LoadingState text="Cargando reservas vencidas" />
				) : loadState === 'error' ? (
					<ErrorState
						text="No se pudieron cargar las reservas vencidas"
						hint="Reintenta para consultar el estado actual de la agenda."
						action={
							<Button type="button" variant="ghost" onClick={onRetry}>
								Reintentar
							</Button>
						}
					/>
				) : loadState === 'ready' && reservations.length === 0 ? (
					<Empty
						text="Agenda al dia"
						hint="No quedan reservas vencidas pendientes de resolver."
					/>
				) : (
					<div className="records overdue-reservations-list">
						{reservations.map((reservation) => {
							const paymentWorkOrder = reservation.payment_work_order
							return (
								<RecordCard
									className="overdue-reservation-card"
									key={reservation.id}
								>
									<button
										type="button"
										className="overdue-reservation-row-target"
										aria-label={`Abrir reserva de ${reservation.customer_name ?? 'cliente'}`}
										onClick={() => onOpenReservation(reservation)}
									/>
									<div className="overdue-reservation-main">
										<span
											className="overdue-reservation-icon"
											aria-hidden="true"
										>
											<CalendarClock size={16} />
										</span>
										<span className="overdue-reservation-copy">
											<strong>{reservation.customer_name || 'Cliente sin nombre'}</strong>
											<span>{reservation.vehicle_label || 'Vehiculo sin identificar'}</span>
											<span>{reservation.service_name || 'Servicio sin identificar'}</span>
											<small>
												Limite {formatDateLabel(reservation.deadline)} ·{' '}
												{overdueDaysLabel(reservation.days_overdue)}
											</small>
										</span>
									</div>
									<div className="overdue-reservation-side">
										<StatusPill
											value={String(reservation.status ?? '')}
											labels={reservationLabels}
										/>
										<div className="overdue-reservation-signals">
											{reservation.delivery_pending ? (
												<span className="overdue-signal">
													Falta entregar
												</span>
											) : null}
											{canViewEconomy && reservation.payment_pending ? (
												<span className="overdue-signal overdue-signal--payment">
													Falta cobrar
												</span>
											) : null}
										</div>
										{canViewEconomy && reservation.payment_pending ? (
											<div className="overdue-reservation-payment">
												<strong>{money(reservation.balance_due)}</strong>
												{paymentWorkOrder ? (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														aria-label={`Cobrar reserva de ${reservation.customer_name ?? 'cliente'}`}
														leadingIcon={<CreditCard size={16} />}
														onClick={() => onOpenPayment(paymentWorkOrder)}
													>
														Cobrar
													</Button>
												) : null}
											</div>
										) : null}
									</div>
								</RecordCard>
							)
						})}
					</div>
				)}
			</div>
		</ModalFrame>
	)
}
