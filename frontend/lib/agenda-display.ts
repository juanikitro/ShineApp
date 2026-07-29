import { formatTimeLabel } from './customer-display'
import { type AgendaMonthChip } from './agenda'
import { formatDayLabel } from './page-support'
import { serviceDisplayName } from './service-display'

type AgendaDisplayRecord = Record<string, any>

export type AgendaServiceLine = {
	key: string
	name: string
}

export function agendaSectorSelectOptions(sectors: AgendaDisplayRecord[]) {
	return sectors
		.filter((sector) => sector.is_active !== false)
		.map((sector) => ({
			value: String(sector.id),
			label: String(sector.name ?? ''),
		}))
}

export function agendaMonthChipLabel(chip: AgendaMonthChip) {
	const reservation = chip.reservation
	const time = String(reservation.start_time ?? '').slice(0, 5)
	const name = String(
		reservation.customer_name ?? reservation.vehicle_label ?? 'Reserva',
	)
	return time ? `${time} ${name}` : name
}

export function agendaMonthChipClass(chip: AgendaMonthChip) {
	const status = String(chip.reservation.status ?? '')
	return status ? `agenda-month-chip--${status.replace(/_/g, '-')}` : ''
}

export function reservationVehicleModel(
	reservation: AgendaDisplayRecord,
	vehicles: AgendaDisplayRecord[],
) {
	const vehicle = vehicles.find(
		(item) => String(item.id) === String(reservation.vehicle),
	)
	return [vehicle?.brand, vehicle?.model]
		.map((value) => String(value ?? '').trim())
		.filter(Boolean)
		.join(' ')
}

export function reservationStartTimeLabel(
	reservation: AgendaDisplayRecord | null | undefined,
	useReservationTimes: boolean,
	fallback = '',
) {
	if (!useReservationTimes) return ''
	return formatTimeLabel(reservation?.start_time) || fallback
}

export function reservationExitTimeLabel(
	reservation: AgendaDisplayRecord | null | undefined,
	useReservationTimes: boolean,
) {
	if (!useReservationTimes) return ''
	return formatTimeLabel(reservation?.exit_time)
}

export function reservationSelectOptions(
	reservations: AgendaDisplayRecord[],
	useReservationTimes: boolean,
	reservationLabels: Record<string, string>,
) {
	return reservations
		.filter((item) => item.status !== 'canceled')
		.map((item) => {
			const startTime = reservationStartTimeLabel(
				item,
				useReservationTimes,
				'Sin hora',
			)
			return {
				value: String(item.id),
				label: startTime
					? `${item.day} ${startTime} - ${item.customer_name}`
					: `${item.day} - ${item.customer_name}`,
				meta: `${item.vehicle_label} - ${serviceDisplayName(item)} - ${reservationLabels[item.status] ?? item.status}`,
			}
		})
}

export function reservationRangeLabel(
	reservation: AgendaDisplayRecord,
	useReservationTimes: boolean,
) {
	const entryDay = String(reservation.day ?? '')
	const exitDay = String(reservation.exit_day ?? '')
	const startTime = reservationStartTimeLabel(
		reservation,
		useReservationTimes,
	)
	const exitTime = reservationExitTimeLabel(reservation, useReservationTimes)
	if (!entryDay) {
		return ''
	}
	if (!exitDay || exitDay === entryDay) {
		return exitTime ? `Egreso ${exitTime}` : ''
	}
	const entryLabel = `${formatDayLabel(entryDay)}${startTime ? ` ${startTime}` : ''}`
	const exitLabel = `${formatDayLabel(exitDay)}${exitTime ? ` ${exitTime}` : ''}`
	return `Ingresa ${entryLabel} - Egresa ${exitLabel}`
}

export function quoteTentativeTimeLabel(
	value: any,
	useReservationTimes: boolean,
) {
	if (!useReservationTimes) return ''
	const time = formatTimeLabel(value)
	return time ? ` ${time}` : ''
}

export function createQuoteTentativeTimeLabel(useReservationTimes: boolean) {
	return (value: any) => quoteTentativeTimeLabel(value, useReservationTimes)
}

export function reservationShowsWork(
	reservation: AgendaDisplayRecord,
	workOrder: unknown,
) {
	return Boolean(
		workOrder &&
			!['pending', 'canceled'].includes(String(reservation.status ?? '')),
	)
}

export function reservationAgendaServices(
	reservation: AgendaDisplayRecord,
): AgendaServiceLine[] {
	const itemLines = Array.isArray(reservation.items)
		? reservation.items
				.map((item: AgendaDisplayRecord, index: number) => ({
					key: String(item.id ?? item.service ?? item.description ?? index),
					name: serviceDisplayName(
						{
							service_icon: item.service_icon,
							service_name: item.service_name ?? item.description,
						},
						'',
					),
				}))
				.filter((item) => item.name)
		: []
	if (itemLines.length) return itemLines
	return String(reservation.service_name ?? '')
		.split(',')
		.map((name, index) => ({
			key: `${name.trim()}-${index}`,
			name: name.trim(),
		}))
		.filter((item) => item.name)
}
