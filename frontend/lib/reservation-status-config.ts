export const RESERVATION_STATUS_VALUES = [
	'pending',
	'confirmed',
	'in_progress',
	'ready',
	'delivered',
] as const

export type ReservationFlowStatus = (typeof RESERVATION_STATUS_VALUES)[number]

export type ReservationStatusValue = ReservationFlowStatus | 'canceled'

export type ReservationStatusConfig = {
	usePending: boolean
	useInProgress: boolean
	useReady: boolean
	useCanceled: boolean
}

export const DEFAULT_RESERVATION_STATUS_CONFIG: ReservationStatusConfig = {
	usePending: true,
	useInProgress: true,
	useReady: true,
	useCanceled: true,
}

const REQUIRED_STATUSES: ReadonlySet<ReservationFlowStatus> = new Set([
	'confirmed',
	'delivered',
])

const OPTIONAL_FLAG_BY_STATUS: Record<
	Exclude<ReservationFlowStatus, 'confirmed' | 'delivered'>,
	keyof ReservationStatusConfig
> = {
	pending: 'usePending',
	in_progress: 'useInProgress',
	ready: 'useReady',
}

export function reservationStatusConfigFromProfile(
	profile: Record<string, unknown> | null | undefined,
): ReservationStatusConfig {
	if (!profile) return { ...DEFAULT_RESERVATION_STATUS_CONFIG }
	return {
		usePending: profile.reservation_use_pending !== false,
		useInProgress: profile.reservation_use_in_progress !== false,
		useReady: profile.reservation_use_ready !== false,
		useCanceled: profile.reservation_use_canceled !== false,
	}
}

export function isReservationStatusEnabled(
	status: ReservationStatusValue,
	config: ReservationStatusConfig,
): boolean {
	if (status === 'canceled') return config.useCanceled
	if (REQUIRED_STATUSES.has(status)) return true
	const flag = OPTIONAL_FLAG_BY_STATUS[status as keyof typeof OPTIONAL_FLAG_BY_STATUS]
	return flag ? config[flag] : true
}

export function activeReservationStatuses(
	config: ReservationStatusConfig,
): ReservationFlowStatus[] {
	return RESERVATION_STATUS_VALUES.filter((status) =>
		isReservationStatusEnabled(status, config),
	)
}

export function nextActiveStatus(
	current: ReservationStatusValue,
	config: ReservationStatusConfig,
): ReservationFlowStatus {
	const flow = activeReservationStatuses(config)
	if (current === 'canceled') {
		return flow[0] ?? 'confirmed'
	}
	const index = RESERVATION_STATUS_VALUES.indexOf(current)
	if (index === -1) return flow[0] ?? 'confirmed'
	for (let i = index + 1; i < RESERVATION_STATUS_VALUES.length; i += 1) {
		const candidate = RESERVATION_STATUS_VALUES[i]
		if (flow.includes(candidate)) {
			return candidate
		}
	}
	return 'delivered'
}

export function normalizeStatusForConfig(
	status: ReservationStatusValue,
	config: ReservationStatusConfig,
): ReservationStatusValue | null {
	if (status === 'canceled') {
		return config.useCanceled ? 'canceled' : null
	}
	if (isReservationStatusEnabled(status, config)) return status
	return nextActiveStatus(status, config)
}
