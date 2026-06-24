export type CashViewMode = 'day' | 'week' | 'month'

function parseIsoDate(value: string) {
	const date = new Date(`${value}T12:00:00`)
	return Number.isNaN(date.getTime()) ? new Date() : date
}

function toIsoDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function formatShortDate(date: Date) {
	return date.toLocaleDateString('es-AR', {
		day: 'numeric',
		month: 'short',
	})
}

export function cashWeekStart(day: string) {
	const date = parseIsoDate(day)
	date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
	return toIsoDate(date)
}

export function cashWeekEnd(day: string) {
	const date = parseIsoDate(cashWeekStart(day))
	date.setDate(date.getDate() + 6)
	return toIsoDate(date)
}

export function cashMonthStart(day: string) {
	const date = parseIsoDate(day)
	return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function cashMonthEnd(day: string) {
	const date = parseIsoDate(day)
	return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function cashRangeLabel(day: string, mode: CashViewMode) {
	if (mode === 'day') return day
	const start = parseIsoDate(
		mode === 'week' ? cashWeekStart(day) : cashMonthStart(day),
	)
	const end = parseIsoDate(mode === 'week' ? cashWeekEnd(day) : cashMonthEnd(day))
	return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

export function cashStepDays(mode: CashViewMode) {
	return mode === 'week' ? 7 : 1
}

export function addCashPeriod(day: string, mode: CashViewMode, offset: number) {
	const date = parseIsoDate(day)
	if (mode === 'month') {
		date.setDate(1)
		date.setMonth(date.getMonth() + offset)
		return cashMonthStart(toIsoDate(date))
	}
	date.setDate(date.getDate() + offset * cashStepDays(mode))
	return toIsoDate(date)
}
