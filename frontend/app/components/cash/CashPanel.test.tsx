import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
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
