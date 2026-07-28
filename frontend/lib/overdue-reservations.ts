import { useCallback, useReducer, useRef } from 'react'

export type OverdueReservationsLoadState =
	| 'idle'
	| 'loading'
	| 'ready'
	| 'error'

export type OverdueReservation = Record<string, any> & {
	id: string | number
	customer_name?: string
	vehicle_label?: string
	service_name?: string
	deadline?: string
	days_overdue?: number
	status?: string
	delivery_pending?: boolean
	payment_pending?: boolean
	balance_due?: string | number
	payment_work_order?: Record<string, any> | null
}

type ReturnTarget = 'detail' | 'payment' | null

type OverdueReservationsFlowState = {
	rows: OverdueReservation[]
	loadState: OverdueReservationsLoadState
	listOpen: boolean
	returnTarget: ReturnTarget
	toastShown: boolean
	loadErrorVersion: number
}

type OverdueReservationsFlowAction =
	| { type: 'load-start' }
	| { type: 'load-success'; rows: OverdueReservation[] }
	| { type: 'load-error' }
	| { type: 'open-list' }
	| { type: 'close-list' }
	| { type: 'open-child'; target: Exclude<ReturnTarget, null> }
	| { type: 'child-error' }
	| { type: 'return-start' }
	| { type: 'return-success'; rows: OverdueReservation[] }
	| { type: 'return-error' }
	| { type: 'mark-toast' }
	| { type: 'reset' }

const initialOverdueReservationsFlowState: OverdueReservationsFlowState = {
	rows: [],
	loadState: 'idle',
	listOpen: false,
	returnTarget: null,
	toastShown: false,
	loadErrorVersion: 0,
}

function overdueReservationsFlowReducer(
	state: OverdueReservationsFlowState,
	action: OverdueReservationsFlowAction,
): OverdueReservationsFlowState {
	switch (action.type) {
		case 'load-start':
			return { ...state, loadState: 'loading' }
		case 'load-success':
			return { ...state, rows: action.rows, loadState: 'ready' }
		case 'load-error':
			return {
				...state,
				loadState: 'error',
				loadErrorVersion: state.loadErrorVersion + 1,
			}
		case 'open-list':
			return { ...state, listOpen: true }
		case 'close-list':
			return { ...state, listOpen: false }
		case 'open-child':
			return {
				...state,
				listOpen: false,
				returnTarget: action.target,
			}
		case 'child-error':
			return { ...state, listOpen: true, returnTarget: null }
		case 'return-start':
			return {
				...state,
				listOpen: true,
				loadState: 'loading',
				returnTarget: null,
			}
		case 'return-success':
			return {
				...state,
				rows: action.rows,
				loadState: 'ready',
				listOpen: state.listOpen && action.rows.length > 0,
			}
		case 'return-error':
			return {
				...state,
				listOpen: true,
				loadState: 'error',
				returnTarget: null,
			}
		case 'mark-toast':
			return { ...state, toastShown: true }
		case 'reset':
			return initialOverdueReservationsFlowState
	}
}

export function overdueReservationPreview<T>(rows: T[], limit = 3) {
	return rows.slice(0, Math.max(limit, 0))
}

export function overdueReservationCountText(count: number) {
	return `${count} ${count === 1 ? 'reserva vencida' : 'reservas vencidas'}`
}

export function sectionUsesOverdueReservations(section: string) {
	return section === 'dashboard' || section === 'agenda'
}

export async function refreshOverdueReservationsForSection<T>(
	section: string,
	refresh: () => Promise<T>,
): Promise<T | undefined> {
	if (!sectionUsesOverdueReservations(section)) return undefined
	return await refresh()
}

export function overdueLoadErrorToast({
	section,
	loadState,
	listOpen,
}: {
	section: string
	loadState: OverdueReservationsLoadState
	listOpen: boolean
}) {
	if (
		!sectionUsesOverdueReservations(section) ||
		loadState !== 'error' ||
		listOpen
	) {
		return null
	}
	return {
		title: 'No se pudieron cargar las reservas vencidas',
		description: 'Reintenta para consultar el estado actual de la agenda.',
	}
}

export function overdueAgendaToast({
	isAgendaActive,
	loadState,
	count,
	alreadyShown,
}: {
	isAgendaActive: boolean
	loadState: OverdueReservationsLoadState
	count: number
	alreadyShown: boolean
}) {
	if (
		!isAgendaActive ||
		loadState !== 'ready' ||
		count <= 0 ||
		alreadyShown
	) {
		return null
	}
	return {
		title: `Tenes ${overdueReservationCountText(count)}`,
		description: 'Revisalas para completar entregas o cobros pendientes',
	}
}

export function useOverdueReservationsFlow() {
	const [state, dispatch] = useReducer(
		overdueReservationsFlowReducer,
		initialOverdueReservationsFlowState,
	)
	const sessionVersionRef = useRef(0)
	const rowsVersionRef = useRef(0)
	const detailVersionRef = useRef(0)

	const refresh = useCallback(
		async (
			loadRows: () => Promise<OverdueReservation[]>,
		): Promise<
			| { ok: true; rows: OverdueReservation[] }
			| { ok: false; error?: unknown; stale?: true }
		> => {
			const sessionVersion = sessionVersionRef.current
			const rowsVersion = rowsVersionRef.current + 1
			rowsVersionRef.current = rowsVersion
			const isCurrent = () =>
				sessionVersionRef.current === sessionVersion &&
				rowsVersionRef.current === rowsVersion
			dispatch({ type: 'load-start' })
			try {
				const rows = await loadRows()
				if (!isCurrent()) return { ok: false, stale: true }
				dispatch({ type: 'load-success', rows })
				return { ok: true, rows }
			} catch (error) {
				if (!isCurrent()) return { ok: false, stale: true }
				dispatch({ type: 'load-error' })
				return { ok: false, error }
			}
		},
		[],
	)

	const openReservation = useCallback(
		async (
			summary: OverdueReservation,
			dependencies: {
				hydrateAgenda: () => Promise<boolean>
				loadReservation: (
					id: string | number,
				) => Promise<Record<string, any>>
			},
		): Promise<
			| { ok: true; reservation: Record<string, any> }
			| { ok: false; error?: unknown; stale?: true }
		> => {
			const sessionVersion = sessionVersionRef.current
			const detailVersion = detailVersionRef.current + 1
			detailVersionRef.current = detailVersion
			const isCurrent = () =>
				sessionVersionRef.current === sessionVersion &&
				detailVersionRef.current === detailVersion
			dispatch({ type: 'open-child', target: 'detail' })
			try {
				const hydrated = await dependencies.hydrateAgenda()
				if (!isCurrent()) return { ok: false, stale: true }
				if (!hydrated) {
					dispatch({ type: 'child-error' })
					return { ok: false }
				}
				const reservation = await dependencies.loadReservation(summary.id)
				if (!isCurrent()) return { ok: false, stale: true }
				return { ok: true, reservation }
			} catch (error) {
				if (!isCurrent()) return { ok: false, stale: true }
				dispatch({ type: 'child-error' })
				return { ok: false, error }
			}
		},
		[],
	)

	const openPayment = useCallback(() => {
		detailVersionRef.current += 1
		dispatch({ type: 'open-child', target: 'payment' })
	}, [])

	const returnFromChild = useCallback(
		async (
			loadRows: () => Promise<OverdueReservation[]>,
		): Promise<
			| { status: 'ignored'; stale?: true }
			| { status: 'reopen'; rows: OverdueReservation[] }
			| { status: 'complete'; rows: [] }
			| { status: 'error'; error: unknown }
		> => {
			if (state.returnTarget === null) return { status: 'ignored' }
			const sessionVersion = sessionVersionRef.current
			const rowsVersion = rowsVersionRef.current + 1
			const detailVersion = detailVersionRef.current + 1
			rowsVersionRef.current = rowsVersion
			detailVersionRef.current = detailVersion
			const isCurrent = () =>
				sessionVersionRef.current === sessionVersion &&
				rowsVersionRef.current === rowsVersion &&
				detailVersionRef.current === detailVersion
			dispatch({ type: 'return-start' })
			try {
				const rows = await loadRows()
				if (!isCurrent()) return { status: 'ignored', stale: true }
				dispatch({ type: 'return-success', rows })
				return rows.length === 0
					? { status: 'complete', rows: [] }
					: { status: 'reopen', rows }
			} catch (error) {
				if (!isCurrent()) return { status: 'ignored', stale: true }
				dispatch({ type: 'return-error' })
				return { status: 'error', error }
			}
		},
		[state.returnTarget],
	)

	const openList = useCallback(() => {
		detailVersionRef.current += 1
		dispatch({ type: 'open-list' })
	}, [])
	const closeList = useCallback(() => dispatch({ type: 'close-list' }), [])
	const markToastShown = useCallback(
		() => dispatch({ type: 'mark-toast' }),
		[],
	)
	const reset = useCallback(() => {
		sessionVersionRef.current += 1
		rowsVersionRef.current += 1
		detailVersionRef.current += 1
		dispatch({ type: 'reset' })
	}, [])

	return {
		...state,
		refresh,
		openReservation,
		openPayment,
		returnFromChild,
		openList,
		closeList,
		markToastShown,
		reset,
	}
}
