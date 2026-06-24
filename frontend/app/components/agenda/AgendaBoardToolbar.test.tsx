import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { AgendaBoardToolbar } from './AgendaBoardToolbar'

afterEach(cleanup)

function renderToolbar(overrides = {}) {
	const props = {
		startLabel: '24/6',
		endLabel: '30/6',
		currentDay: '2026-06-24',
		visibleDays: 7,
		rangeMode: 'week',
		onMove: () => {},
		onToday: () => {},
		onGoToDate: () => {},
		onOpenCashForRange: () => {},
		...overrides,
	} as Parameters<typeof AgendaBoardToolbar>[0]

	return render(<AgendaBoardToolbar {...props} />)
}

test('AgendaBoardToolbar opens the current range in cash', async () => {
	const user = userEvent.setup()
	const onOpenCashForRange = vi.fn()
	renderToolbar({ onOpenCashForRange })

	await user.click(screen.getByRole('button', { name: 'Ver este rango en caja' }))

	assert.equal(onOpenCashForRange.mock.calls.length, 1)
})

test('AgendaBoardToolbar keeps the cash bridge in month mode', () => {
	renderToolbar({ rangeMode: 'month', title: 'Agenda de junio' })

	assert.ok(screen.getByRole('button', { name: 'Ver este rango en caja' }))
	assert.equal(screen.queryByRole('button', { name: 'Retroceder 7 dias' }), null)
})
