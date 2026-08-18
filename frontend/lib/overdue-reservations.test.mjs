import assert from 'node:assert/strict'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	overdueAgendaToast,
	overdueLoadErrorToast,
	overdueReservationCountText,
	overdueReservationPreview,
	refreshOverdueReservationsForSection,
	sectionUsesOverdueReservations,
	useOverdueReservationsFlow,
} from './overdue-reservations'

afterEach(cleanup)

const rows = [
	{ id: 1, customer_name: 'Primero', deadline: '2026-07-20' },
	{ id: 2, customer_name: 'Segundo', deadline: '2026-07-21' },
	{ id: 3, customer_name: 'Tercero', deadline: '2026-07-22' },
	{ id: 4, customer_name: 'Cuarto', deadline: '2026-07-23' },
]

function deferred() {
	let resolve
	let reject
	const promise = new Promise((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})
	return { promise, resolve, reject }
}

test('dashboard preview keeps the first three server-ordered overdue reservations', () => {
	assert.deepEqual(
		overdueReservationPreview(rows).map((row) => row.id),
		[1, 2, 3],
	)
	assert.deepEqual(overdueReservationPreview(rows, 0), [])
	assert.equal(overdueReservationCountText(1), '1 reserva vencida')
	assert.equal(overdueReservationCountText(4), '4 reservas vencidas')
})

test('only Dashboard and Agenda keep the overdue backlog synchronized', async () => {
	assert.equal(sectionUsesOverdueReservations('dashboard'), true)
	assert.equal(sectionUsesOverdueReservations('agenda'), true)
	assert.equal(sectionUsesOverdueReservations('cash'), false)
	assert.equal(sectionUsesOverdueReservations('settings'), false)

	const calls = []
	const refresh = async () => {
		calls.push('refresh')
		return 'ready'
	}
	assert.equal(
		await refreshOverdueReservationsForSection('dashboard', refresh),
		'ready',
	)
	assert.equal(
		await refreshOverdueReservationsForSection('agenda', refresh),
		'ready',
	)
	assert.equal(
		await refreshOverdueReservationsForSection('cash', refresh),
		undefined,
	)
	assert.deepEqual(calls, ['refresh', 'refresh'])
})

test('isolated backlog loading exposes ready and error without changing section data', async () => {
	const sectionData = { work_orders_count: 8 }
	const { result } = renderHook(() => useOverdueReservationsFlow())

	await act(async () => {
		const loaded = await result.current.refresh(async () => rows)
		assert.equal(loaded.ok, true)
	})
	assert.equal(result.current.loadState, 'ready')
	assert.equal(result.current.rows.length, 4)
	assert.deepEqual(sectionData, { work_orders_count: 8 })

	await act(async () => {
		const failed = await result.current.refresh(async () => {
			throw new Error('overdue unavailable')
		})
		assert.equal(failed.ok, false)
	})
	assert.equal(result.current.loadState, 'error')
	assert.equal(result.current.loadErrorVersion, 1)
	assert.deepEqual(sectionData, { work_orders_count: 8 })
})

test('latest concurrent backlog request wins even when the older one resolves last', async () => {
	const older = deferred()
	const newer = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let olderResult
	let newerResult

	act(() => {
		olderResult = result.current.refresh(() => older.promise)
		newerResult = result.current.refresh(() => newer.promise)
	})
	await act(async () => {
		newer.resolve([{ id: 22, customer_name: 'Tenant actual' }])
		assert.equal((await newerResult).ok, true)
	})
	assert.equal(result.current.rows[0].id, 22)

	await act(async () => {
		older.resolve([{ id: 11, customer_name: 'Respuesta obsoleta' }])
		assert.deepEqual(await olderResult, { ok: false, stale: true })
	})
	assert.equal(result.current.rows[0].id, 22)
})

test('reset invalidates an in-flight backlog response from the previous session', async () => {
	const pending = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let pendingResult

	act(() => {
		pendingResult = result.current.refresh(() => pending.promise)
	})
	assert.equal(result.current.loadState, 'loading')
	act(() => result.current.reset())

	await act(async () => {
		pending.resolve([{ id: 99, customer_name: 'Tenant anterior' }])
		assert.deepEqual(await pendingResult, { ok: false, stale: true })
	})
	assert.equal(result.current.loadState, 'idle')
	assert.deepEqual(result.current.rows, [])
})

test('opening a row hydrates Agenda before loading the complete reservation', async () => {
	const calls = []
	const detail = { id: 1, customer: 9, items: [{ service: 3 }] }
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let opened

	act(() => result.current.openList())
	await act(async () => {
		opened = await result.current.openReservation(rows[0], {
			hydrateAgenda: async () => {
				calls.push('agenda')
				return true
			},
			loadReservation: async (id) => {
				calls.push(`reservation:${id}`)
				return detail
			},
		})
	})

	assert.deepEqual(calls, ['agenda', 'reservation:1'])
	assert.deepEqual(opened, { ok: true, reservation: detail })
	assert.equal(result.current.listOpen, false)
	assert.equal(result.current.returnTarget, 'detail')
})

test('failed Agenda hydration restores the list and never loads a partial editor', async () => {
	let detailLoads = 0
	const { result } = renderHook(() => useOverdueReservationsFlow())

	act(() => result.current.openList())
	await act(async () => {
		const opened = await result.current.openReservation(rows[0], {
			hydrateAgenda: async () => false,
			loadReservation: async () => {
				detailLoads += 1
				return rows[0]
			},
		})
		assert.equal(opened.ok, false)
	})

	assert.equal(detailLoads, 0)
	assert.equal(result.current.listOpen, true)
	assert.equal(result.current.returnTarget, null)
})

test('a failed complete-reservation request restores the list with the error', async () => {
	const failure = new Error('reservation unavailable')
	const { result } = renderHook(() => useOverdueReservationsFlow())

	act(() => result.current.openList())
	await act(async () => {
		const opened = await result.current.openReservation(rows[0], {
			hydrateAgenda: async () => true,
			loadReservation: async () => {
				throw failure
			},
		})
		assert.deepEqual(opened, { ok: false, error: failure })
	})

	assert.equal(result.current.listOpen, true)
	assert.equal(result.current.returnTarget, null)
})

test('reset prevents an in-flight detail request from opening after logout', async () => {
	const detailRequest = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let opened

	act(() => {
		opened = result.current.openReservation(rows[0], {
			hydrateAgenda: async () => true,
			loadReservation: () => detailRequest.promise,
		})
	})
	act(() => result.current.reset())

	await act(async () => {
		detailRequest.resolve({ id: rows[0].id })
		assert.deepEqual(await opened, { ok: false, stale: true })
	})
	assert.equal(result.current.listOpen, false)
	assert.equal(result.current.returnTarget, null)
})

test('a successful payment can close before a failed refresh without allowing resubmission', async () => {
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let returned

	act(() => result.current.openPayment())
	assert.equal(result.current.returnTarget, 'payment')

	await act(async () => {
		returned = await result.current.returnFromChild(async () => {
			throw new Error('refresh failed')
		})
	})

	assert.equal(returned.status, 'error')
	assert.equal(result.current.returnTarget, null)
	assert.equal(result.current.listOpen, true)
	assert.equal(result.current.loadState, 'error')
})

test('returning from a child reopens remaining rows and completes on an empty backlog', async () => {
	const { result } = renderHook(() => useOverdueReservationsFlow())

	act(() => result.current.openPayment())
	await act(async () => {
		const returned = await result.current.returnFromChild(async () => rows)
		assert.equal(returned.status, 'reopen')
	})
	assert.equal(result.current.listOpen, true)
	assert.equal(result.current.rows.length, 4)

	act(() => result.current.openPayment())
	await act(async () => {
		const returned = await result.current.returnFromChild(async () => [])
		assert.equal(returned.status, 'complete')
	})
	assert.equal(result.current.listOpen, false)
	assert.equal(result.current.rows.length, 0)
})

test('closing the list during a child return keeps it closed after rows refresh', async () => {
	const pending = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let returned

	act(() => result.current.openPayment())
	act(() => {
		returned = result.current.returnFromChild(() => pending.promise)
	})
	assert.equal(result.current.listOpen, true)

	act(() => result.current.closeList())
	assert.equal(result.current.listOpen, false)

	await act(async () => {
		pending.resolve(rows)
		assert.deepEqual(await returned, { status: 'reopen', rows })
	})
	assert.deepEqual(result.current.rows, rows)
	assert.equal(result.current.listOpen, false)
})

test('reset prevents an in-flight child return from restoring a previous tenant backlog', async () => {
	const pending = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let returned

	act(() => result.current.openPayment())
	act(() => {
		returned = result.current.returnFromChild(() => pending.promise)
	})
	act(() => result.current.reset())

	await act(async () => {
		pending.resolve(rows)
		assert.deepEqual(await returned, { status: 'ignored', stale: true })
	})
	assert.equal(result.current.loadState, 'idle')
	assert.deepEqual(result.current.rows, [])
})

test('a newer child return wins over an older backlog refresh', async () => {
	const oldRefresh = deferred()
	const childReturn = deferred()
	const { result } = renderHook(() => useOverdueReservationsFlow())
	let oldRefreshResult
	let childReturnResult

	act(() => {
		oldRefreshResult = result.current.refresh(() => oldRefresh.promise)
	})
	act(() => result.current.openPayment())
	act(() => {
		childReturnResult = result.current.returnFromChild(
			() => childReturn.promise,
		)
	})

	await act(async () => {
		childReturn.resolve([])
		assert.deepEqual(await childReturnResult, {
			status: 'complete',
			rows: [],
		})
	})
	assert.deepEqual(result.current.rows, [])

	await act(async () => {
		oldRefresh.resolve(rows)
		assert.deepEqual(await oldRefreshResult, { ok: false, stale: true })
	})
	assert.deepEqual(result.current.rows, [])
	assert.equal(result.current.listOpen, false)
})

test('list, toast, ignored return, and reset transitions stay explicit', async () => {
	const { result } = renderHook(() => useOverdueReservationsFlow())

	await act(async () => {
		const returned = await result.current.returnFromChild(async () => rows)
		assert.equal(returned.status, 'ignored')
	})
	act(() => {
		result.current.openList()
		result.current.markToastShown()
	})
	assert.equal(result.current.listOpen, true)
	assert.equal(result.current.toastShown, true)

	act(() => result.current.closeList())
	assert.equal(result.current.listOpen, false)

	act(() => result.current.reset())
	assert.equal(result.current.loadState, 'idle')
	assert.equal(result.current.rows.length, 0)
	assert.equal(result.current.toastShown, false)
})

test('agenda toast is emitted only for the first ready non-empty agenda visit', () => {
	assert.deepEqual(
		overdueAgendaToast({
			isAgendaActive: true,
			loadState: 'ready',
			count: 4,
			alreadyShown: false,
		}),
		{
			title: 'Tenes 4 reservas vencidas',
			description: 'Revisalas para completar entregas o cobros pendientes',
		},
	)
	for (const input of [
		{ isAgendaActive: false, loadState: 'ready', count: 4, alreadyShown: false },
		{ isAgendaActive: true, loadState: 'loading', count: 4, alreadyShown: false },
		{ isAgendaActive: true, loadState: 'error', count: 4, alreadyShown: false },
		{ isAgendaActive: true, loadState: 'ready', count: 0, alreadyShown: false },
		{ isAgendaActive: true, loadState: 'ready', count: 4, alreadyShown: true },
	]) {
		assert.equal(overdueAgendaToast(input), null)
	}
})

test('initial overdue load errors produce only a retryable toast decision', () => {
	assert.deepEqual(
		overdueLoadErrorToast({
			section: 'agenda',
			loadState: 'error',
			listOpen: false,
		}),
		{
			title: 'No se pudieron cargar las reservas vencidas',
			description: 'Reintenta para consultar el estado actual de la agenda.',
		},
	)
	assert.equal(
		overdueLoadErrorToast({
			section: 'dashboard',
			loadState: 'loading',
			listOpen: false,
		}),
		null,
	)
	assert.equal(
		overdueLoadErrorToast({
			section: 'cash',
			loadState: 'error',
			listOpen: false,
		}),
		null,
	)
	assert.equal(
		overdueLoadErrorToast({
			section: 'agenda',
			loadState: 'error',
			listOpen: true,
		}),
		null,
	)
})
