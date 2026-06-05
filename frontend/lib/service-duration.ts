// Duracion de servicios: el backend siempre almacena minutos (`estimated_duration_minutes`).
// Estas utilidades permiten al frontend operar con minutos / horas / dias / semanas
// y volver siempre a minutos enteros para no romper el contrato.

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks'

type DurationUnitDef = {
	value: DurationUnit
	label: string
	short: string
	minutes: number
}

export const DURATION_UNITS: readonly DurationUnitDef[] = [
	{ value: 'minutes', label: 'Minutos', short: 'min', minutes: 1 },
	{ value: 'hours', label: 'Horas', short: 'h', minutes: 60 },
	{ value: 'days', label: 'Dias', short: 'd', minutes: 60 * 24 },
	{ value: 'weeks', label: 'Semanas', short: 'sem', minutes: 60 * 24 * 7 },
] as const

export const DURATION_UNIT_OPTIONS = DURATION_UNITS.map(({ value, label }) => ({
	value,
	label,
}))

const UNIT_BY_VALUE: Record<DurationUnit, DurationUnitDef> = Object.fromEntries(
	DURATION_UNITS.map((unit) => [unit.value, unit]),
) as Record<DurationUnit, DurationUnitDef>

const DEFAULT_UNIT: DurationUnit = 'minutes'

export function isDurationUnit(value: unknown): value is DurationUnit {
	return typeof value === 'string' && value in UNIT_BY_VALUE
}

export function resolveDurationUnit(value: unknown): DurationUnit {
	return isDurationUnit(value) ? value : DEFAULT_UNIT
}

function toFiniteNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null
	const num = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(num) ? num : null
}

// Convierte cantidad + unidad a minutos enteros (clamp a >= 0). Devuelve null si la
// cantidad es invalida; el backend requiere PositiveIntegerField, asi que el form
// validara que sea >= 1 antes de enviar.
export function durationToMinutes(
	amount: unknown,
	unit: unknown,
): number | null {
	const value = toFiniteNumber(amount)
	if (value === null) return null
	const factor = UNIT_BY_VALUE[resolveDurationUnit(unit)].minutes
	return Math.max(0, Math.round(value * factor))
}

// Elige la unidad mas grande que represente los minutos exactamente. Util para
// inicializar el form al editar un servicio existente sin perder fidelidad.
export function pickExactUnitForMinutes(
	minutes: unknown,
): { amount: number; unit: DurationUnit } {
	const total = toFiniteNumber(minutes)
	if (total === null || total <= 0) {
		return { amount: total ?? 0, unit: DEFAULT_UNIT }
	}
	const rounded = Math.round(total)
	for (let i = DURATION_UNITS.length - 1; i >= 0; i -= 1) {
		const unit = DURATION_UNITS[i]
		if (rounded % unit.minutes === 0) {
			return { amount: rounded / unit.minutes, unit: unit.value }
		}
	}
	return { amount: rounded, unit: DEFAULT_UNIT }
}

// Devuelve la cantidad expresada en la unidad elegida (con decimales si no divide
// exactamente). Sirve para reflejar la unidad seleccionada por el usuario sin
// recalcular siempre la mas exacta.
export function minutesToDurationAmount(
	minutes: unknown,
	unit: unknown,
): number | null {
	const total = toFiniteNumber(minutes)
	if (total === null) return null
	const factor = UNIT_BY_VALUE[resolveDurationUnit(unit)].minutes
	return total / factor
}

function trimAmount(amount: number): string {
	if (!Number.isFinite(amount)) return ''
	if (Number.isInteger(amount)) return String(amount)
	// Hasta 2 decimales, sin ceros sobrantes.
	const fixed = amount.toFixed(2)
	return fixed.replace(/\.?0+$/, '')
}

// Etiqueta corta y natural en la unidad mas grande sin perder precision.
// 60 -> "1 h", 90 -> "1 h 30 min", 1440 -> "1 d", 10800 -> "1 sem 12 h".
export function formatDurationLabel(minutes: unknown): string | null {
	const total = toFiniteNumber(minutes)
	if (total === null || total <= 0) return null
	let remaining = Math.round(total)
	const parts: string[] = []
	for (let i = DURATION_UNITS.length - 1; i >= 0; i -= 1) {
		const unit = DURATION_UNITS[i]
		if (remaining >= unit.minutes) {
			const count = Math.floor(remaining / unit.minutes)
			remaining -= count * unit.minutes
			parts.push(`${count} ${unit.short}`)
		}
		if (remaining === 0) break
	}
	if (!parts.length) return `${Math.round(total)} ${UNIT_BY_VALUE.minutes.short}`
	return parts.join(' ')
}

// Helpers para el form: arman/leen el par (amount, unit) sobre cualquier objeto
// usando keys explicitas, sin acoplarse a un AnyRecord particular.
export type DurationFormKeys = {
	minutesKey: string
	unitKey: string
}

export const SERVICE_DURATION_KEYS: DurationFormKeys = {
	minutesKey: 'estimated_duration_minutes',
	unitKey: 'estimated_duration_unit',
}

export function readDurationDraft(
	form: Record<string, any> | null | undefined,
	keys: DurationFormKeys = SERVICE_DURATION_KEYS,
): { amount: string; unit: DurationUnit } {
	const rawUnit = form?.[keys.unitKey]
	const unit = resolveDurationUnit(rawUnit)
	const rawMinutes = form?.[keys.minutesKey]
	const totalMinutes = toFiniteNumber(rawMinutes)
	if (totalMinutes === null) {
		return { amount: '', unit }
	}
	// Si el form ya guardo una unidad, respetar la cantidad expresada en esa unidad.
	if (isDurationUnit(rawUnit)) {
		const amount = minutesToDurationAmount(totalMinutes, unit)
		return { amount: amount === null ? '' : trimAmount(amount), unit }
	}
	// Sin unidad previa: elegir la mas exacta para no perder precision al cargar.
	const picked = pickExactUnitForMinutes(totalMinutes)
	return { amount: trimAmount(picked.amount), unit: picked.unit }
}

export function writeDurationDraft(
	form: Record<string, any>,
	patch: { amount?: unknown; unit?: unknown },
	keys: DurationFormKeys = SERVICE_DURATION_KEYS,
): Record<string, any> {
	const current = readDurationDraft(form, keys)
	const nextUnit = patch.unit !== undefined ? resolveDurationUnit(patch.unit) : current.unit
	const nextAmountRaw = patch.amount !== undefined ? patch.amount : current.amount
	const minutes = durationToMinutes(nextAmountRaw, nextUnit)
	return {
		...form,
		[keys.unitKey]: nextUnit,
		[keys.minutesKey]: minutes === null ? '' : String(minutes),
	}
}
