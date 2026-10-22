import assert from 'node:assert/strict'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { CashPanel } from './CashPanel'

afterEach(cleanup)

const totals = { income: 0, expense: 0, balance: 0 }

function renderCashPanel(overrides = {}) {
	const props = {
		cashClosure: null,
		cashEntries: [],
		cashEntryKey: (entry: Record<string, unknown>) => String(entry.id),
		cashEntryQuickActions: () => [],
		cashFilterCategoryOptions: [],
		cashFilters: {
			query: '',
			movementType: '',
			sourceKind: '',
			category: '',
			subcategory: '',
			effect: '',
			amountMin: '',
			amountMax: '',
		},
		cashFiltersActive: false,
		cashFilterSubcategoryOptions: [],
		cashflowTotals: totals,
		cashFlowSummary: {
			groups: [],
			commercialBalance: 0,
			financialBalance: 0,
			netFlow: 0,
		},
		cashIsClosed: false,
		cashClosuresEnabled: true,
		cashQuickFilter: 'all',
		cashSortKey: 'occurred_desc',
		cashSourceKindLabel: (_kind: unknown, fallback = '') => String(fallback),
		cashSourceKindOptions: [],
		cashSummaryMode: 'cashflow',
		economicTotals: totals,
		filteredCashEntries: [],
		loading: false,
		loadBlocked: false,
		loadErrorNotice: null,
		recordClass: () => 'record',
		renderQuickActionsTrigger: () => null,
		cashViewMode: 'day',
		selectedDay: '2026-06-24',
		onCashFilterChange: () => {},
		onCashQuickFilterChange: () => {},
		onCashSortChange: () => {},
		onCashSummaryModeChange: () => {},
		onCashViewModeChange: () => {},
		onClearCashFilters: () => {},
		onCloseDay: () => {},
		onReopenDay: () => {},
		onCreateMovement: () => {},
		onOpenAgendaForCashPeriod: () => {},
		onMoveSelectedDay: () => {},
		onOpenCashEntryDetail: () => {},
		onQuickActionsContext: () => {},
		onRefresh: () => {},
		onRegisterAdjustment: () => {},
		onSelectedDayChange: () => {},
		...overrides,
	} as Parameters<typeof CashPanel>[0]

	return render(<CashPanel {...props} />)
}

test('CashPanel exposes day week and month modes', () => {
	renderCashPanel()

	assert.ok(screen.getByRole('button', { name: 'Día' }))
	assert.ok(screen.getByRole('button', { name: 'Semana' }))
	assert.ok(screen.getByRole('button', { name: 'Mes' }))
})

test('CashPanel opens the selected cash period in agenda', async () => {
	const user = userEvent.setup()
	const onOpenAgendaForCashPeriod = vi.fn()
	renderCashPanel({ onOpenAgendaForCashPeriod })

	await user.click(screen.getByRole('button', { name: 'Ver en agenda' }))

	assert.equal(onOpenAgendaForCashPeriod.mock.calls.length, 1)
})

test('CashPanel renders monthly range copy without day-only close actions', () => {
	renderCashPanel({ cashViewMode: 'month' })

	assert.ok(screen.getByRole('button', { name: 'Este mes' }))
	assert.ok(screen.getByText('Movimientos del mes'))
	assert.equal(screen.queryByRole('button', { name: 'Cerrar dia' }), null)
})

test('CashPanel hides closure controls in continuous cash mode', () => {
	renderCashPanel({ cashClosuresEnabled: false })

	assert.equal(screen.queryByText('Abierta'), null)
	assert.equal(screen.queryByRole('button', { name: 'Cerrar dia' }), null)
	assert.equal(screen.queryByRole('button', { name: 'Reabrir caja' }), null)
	assert.equal(
		screen.queryByRole('button', { name: 'Registrar ajuste hoy' }),
		null,
	)
})

test('CashPanel shows movement day in period lists', () => {
	const entry = {
		id: 1,
		amount: 45000,
		category: 'Pago',
		counterparty_kind: 'customer',
		counterparty_label: 'Mariano Mansilla',
		movement_type: 'income',
		occurred_at: '2026-06-22T19:20:00',
		source_kind: 'payment',
		source_label: 'Cobro de orden',
	}
	renderCashPanel({
		cashEntries: [entry],
		cashViewMode: 'week',
		filteredCashEntries: [entry],
	})

	assert.ok(screen.getByText('Dia'))
	assert.ok(screen.getByText(/22\/06\/2026|22\/6\/2026/))
	assert.ok(screen.getByText('Cobro de orden'))
	assert.ok(screen.getByText('Mariano Mansilla'))
})

test('CashPanel highlights the last added monthly expense by created_at and keeps list order', async () => {
	const user = userEvent.setup()
	const onOpenCashEntryDetail = vi.fn()
	const onCashQuickFilterChange = vi.fn()
	const olderLoaded = {
		id: 1,
		amount: 1200,
		category: 'Insumos',
		movement_type: 'expense',
		occurred_at: '2026-06-28T10:00:00',
		created_at: '2026-06-01T09:00:00',
		source_kind: 'manual',
		source_label: 'Compra de shampoo',
	}
	const lastLoaded = {
		id: 2,
		amount: 3400,
		category: 'Servicios',
		movement_type: 'expense',
		occurred_at: '2026-06-05T10:00:00',
		created_at: '2026-06-29T18:30:00',
		source_kind: 'manual',
		source_label: 'Factura de luz',
	}
	const entries = [olderLoaded, lastLoaded]
	renderCashPanel({
		cashEntries: entries,
		cashLoadedMonthStart: '2026-06-01',
		cashViewMode: 'month',
		filteredCashEntries: entries,
		onCashQuickFilterChange,
		onOpenCashEntryDetail,
	})

	const highlight = screen.getByRole('group', { name: 'Ultimo egreso agregado' })
	assert.ok(within(highlight).getByText('Factura de luz'))
	assert.equal(within(highlight).queryByText('Compra de shampoo'), null)
	assert.ok(within(highlight).getByText(/Movimiento del/))
	assert.ok(within(highlight).getByText(/Cargado el/))

	const listTitles = screen
		.getAllByText(/Compra de shampoo|Factura de luz/)
		.filter((node) => !highlight.contains(node))
		.map((node) => node.textContent)
	assert.deepEqual(listTitles, ['Compra de shampoo', 'Factura de luz'])

	await user.click(within(highlight).getByText('Factura de luz'))
	assert.equal(onOpenCashEntryDetail.mock.calls[0][0], lastLoaded)

	await user.click(screen.getByRole('button', { name: 'Ver egresos del mes' }))
	assert.deepEqual(onCashQuickFilterChange.mock.calls[0], ['expense'])
})

test('CashPanel shows an empty monthly highlight and hides it outside month mode or on error', () => {
	const view = renderCashPanel({
		cashLoadedMonthStart: '2026-06-01',
		cashViewMode: 'month',
	})
	assert.ok(screen.getByText('Sin egresos cargados en el mes.'))
	assert.ok(screen.getByRole('button', { name: 'Ver egresos del mes' }))
	view.unmount()

	renderCashPanel({ cashViewMode: 'week' })
	assert.equal(screen.queryByRole('group', { name: 'Ultimo egreso agregado' }), null)
	cleanup()

	renderCashPanel({
		cashLoadedMonthStart: '2026-06-01',
		cashViewMode: 'month',
		loadBlocked: true,
	})
	assert.equal(screen.queryByRole('group', { name: 'Ultimo egreso agregado' }), null)
})

test('CashPanel does not highlight a previous month expense until the new month payload arrives', () => {
	const stale = {
		id: 9,
		amount: 500,
		movement_type: 'expense',
		occurred_at: '2026-05-20T10:00:00',
		created_at: '2026-05-20T10:05:00',
		source_kind: 'manual',
		source_label: 'Gasto de mayo',
	}
	renderCashPanel({
		cashEntries: [stale],
		cashLoadedMonthStart: '2026-05-01',
		cashViewMode: 'month',
		filteredCashEntries: [stale],
		loading: true,
		selectedDay: '2026-06-01',
	})

	const highlight = screen.getByRole('group', { name: 'Ultimo egreso agregado' })
	assert.ok(within(highlight).getByText('Cargando egresos del mes...'))
	assert.equal(within(highlight).queryByText('Gasto de mayo'), null)
	assert.equal(within(highlight).queryByText('Sin egresos cargados en el mes.'), null)
})
