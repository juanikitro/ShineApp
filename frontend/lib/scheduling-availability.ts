export type AnyAvailabilityRecord = Record<string, unknown>

export type AvailabilityBucket = {
	max_slots: number
	used_slots: number
	available_slots: number
}

export type AvailabilityOccupied = {
	start_time: string
	duration_minutes: number
}

export type ScheduleAvailability = {
	sectors: Record<number, AvailabilityBucket>
	allowOverlap: boolean
	enforceCapacity: boolean
	occupied: AvailabilityOccupied[]
}

export const SLOT_STEP_MINUTES = 15
export const DEFAULT_OPENING_TIME = '08:00'
export const DEFAULT_CLOSING_TIME = '20:00'

export function todayIsoDate(): string {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function timeToMinutes(value: string | null | undefined): number | null {
	if (typeof value !== 'string' || !value) return null
	const [hourPart, minutePart] = value.split(':')
	const hours = Number(hourPart)
	const minutes = Number(minutePart)
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
	return hours * 60 + minutes
}

function minutesToTime(value: number): string {
	const hours = Math.floor(value / 60)
	const minutes = value % 60
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function roundUpToStep(value: number, step: number): number {
	if (value % step === 0) return value
	return value + (step - (value % step))
}

export type TimeSlot = {
	value: string
	label: string
	disabled: boolean
	disabledReason?: string
}

export function buildTimeSlots(options: {
	openingTime?: string | null
	closingTime?: string | null
	stepMinutes?: number
	occupied?: AvailabilityOccupied[]
	durationMinutes?: number
	allowOverlap: boolean
}): TimeSlot[] {
	const step = options.stepMinutes ?? SLOT_STEP_MINUTES
	const opening =
		timeToMinutes(options.openingTime ?? null) ??
		timeToMinutes(DEFAULT_OPENING_TIME) ??
		0
	const closing =
		timeToMinutes(options.closingTime ?? null) ??
		timeToMinutes(DEFAULT_CLOSING_TIME) ??
		24 * 60
	const start = roundUpToStep(Math.max(opening, 0), step)
	const slots: TimeSlot[] = []
	const duration = Math.max(options.durationMinutes ?? 0, 0)
	const occupied = options.allowOverlap ? [] : options.occupied ?? []
	for (let minutes = start; minutes <= closing; minutes += step) {
		const value = minutesToTime(minutes)
		const slotEnd = minutes + duration
		let disabled = false
		let disabledReason: string | undefined
		if (slotEnd > closing) {
			disabled = true
			disabledReason = 'Termina despues del cierre'
		}
		if (!disabled) {
			for (const entry of occupied) {
				const entryStart = timeToMinutes(entry.start_time)
				if (entryStart === null) continue
				const entryEnd = entryStart + Math.max(entry.duration_minutes || 0, 0)
				if (minutes < entryEnd && entryStart < slotEnd) {
					disabled = true
					disabledReason = 'Solapa con otra reserva'
					break
				}
			}
		}
		slots.push({ value, label: value, disabled, disabledReason })
	}
	return slots
}

export function scheduleAvailabilityForDay(options: {
	day: string
	allowOverlap: boolean
	enforceCapacity: boolean
	sectors: AnyAvailabilityRecord[]
	reservations: AnyAvailabilityRecord[]
	services: AnyAvailabilityRecord[]
	excludeReservationId?: number | string | null
}): ScheduleAvailability {
	const sectorCapacity = new Map<number, number>()
	for (const sector of options.sectors) {
		const id = Number(sector.id)
		if (!Number.isFinite(id) || id <= 0) continue
		sectorCapacity.set(id, Number(sector.default_capacity) || 0)
	}
	const activeStatuses = new Set([
		'pending',
		'confirmed',
		'in_progress',
		'ready',
		'delivered',
	])
	const usedBySector = new Map<number, number>()
	const occupied: AvailabilityOccupied[] = []
	for (const reservation of options.reservations) {
		if (String(reservation.day) !== options.day) continue
		const reservationId = reservation.id
		if (
			options.excludeReservationId !== undefined &&
			options.excludeReservationId !== null &&
			String(reservationId) === String(options.excludeReservationId)
		) {
			continue
		}
		const status = String(reservation.status ?? '').toLowerCase()
		if (!activeStatuses.has(status)) continue
		const sectorId = Number(reservation.sector)
		if (Number.isFinite(sectorId) && sectorId > 0) {
			usedBySector.set(sectorId, (usedBySector.get(sectorId) ?? 0) + 1)
		}
		const startTime =
			typeof reservation.start_time === 'string' && reservation.start_time
				? reservation.start_time.slice(0, 5)
				: null
		if (!startTime) continue
		const duration = Number(reservation.estimated_duration_minutes) || 60
		occupied.push({ start_time: startTime, duration_minutes: duration })
	}
	const sectors: Record<number, AvailabilityBucket> = {}
	for (const [sectorId, maxSlots] of sectorCapacity) {
		const used = usedBySector.get(sectorId) ?? 0
		sectors[sectorId] = {
			max_slots: maxSlots,
			used_slots: used,
			available_slots: Math.max(maxSlots - used, 0),
		}
	}
	return {
		sectors,
		allowOverlap: options.allowOverlap,
		enforceCapacity: options.enforceCapacity,
		occupied,
	}
}

export function formatCapacityLabel(bucket: AvailabilityBucket, label: string): string {
	if (bucket.max_slots <= 0) {
		return `${label}: sin cupo definido`
	}
	return `${label}: ${bucket.used_slots}/${bucket.max_slots} ocupados`
}

export function computeReservationFormItemsDuration(
	items: AnyAvailabilityRecord[] | undefined,
	services: AnyAvailabilityRecord[],
): number {
	if (!items || !items.length) return 0
	const serviceById = new Map<number, AnyAvailabilityRecord>()
	for (const service of services) {
		const id = Number(service.id)
		if (Number.isFinite(id) && id > 0) {
			serviceById.set(id, service)
		}
	}
	let total = 0
	for (const item of items) {
		const serviceId = Number(item.service)
		if (!Number.isFinite(serviceId) || serviceId <= 0) continue
		const service = serviceById.get(serviceId)
		if (!service) continue
		const duration = Number(service.estimated_duration_minutes) || 0
		const quantity = Math.max(Number(item.quantity ?? 1) || 1, 1)
		total += duration * quantity
	}
	return total
}

export function selectedSectorsFromItems(
	items: AnyAvailabilityRecord[] | undefined,
	services: AnyAvailabilityRecord[],
): Record<number, number> {
	const result: Record<number, number> = {}
	if (!items || !items.length) return result
	const sectorById = new Map<number, number>()
	for (const service of services) {
		const id = Number(service.id)
		if (!Number.isFinite(id) || id <= 0) continue
		const sectorId = Number(service.sector)
		if (Number.isFinite(sectorId) && sectorId > 0) {
			sectorById.set(id, sectorId)
		}
	}
	for (const item of items) {
		const serviceId = Number(item.service)
		if (!Number.isFinite(serviceId) || serviceId <= 0) continue
		const sectorId = sectorById.get(serviceId)
		if (sectorId != null) {
			result[sectorId] = (result[sectorId] ?? 0) + 1
		}
	}
	return result
}
