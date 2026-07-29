import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { AgendaDayHeader } from './AgendaDayHeader'

afterEach(cleanup)

function renderHeader(overrides = {}) {
	const props = {
		day: '2026-07-21',
		column: 3,
		count: 1,
		moneySummary: { collected: 1500, receivable: 500 },
		hiddenDuringEnter: false,
		interactive: true,
		currentDay: '2026-07-21',
		selectedDay: '2026-07-21',
		workingHours: [
			{
				day_of_week: 1,
				is_open: false,
				opening_time: null,
				closing_time: null,
			},
		],
		onOpenQuickReservation: () => {},
		...overrides,
	} as Parameters<typeof AgendaDayHeader>[0]

	return render(<AgendaDayHeader {...props} />)
}

test('AgendaDayHeader preserves the current selected closed-day presentation', () => {
	renderHeader()

	const button = screen.getByRole('button')
	assert.equal(button.getAttribute('aria-current'), 'date')
	assert.equal(button.getAttribute('aria-disabled'), 'false')
	assert.equal(button.style.gridColumn, '3')
	assert.ok(button.classList.contains('agenda-day-head--today'))
	assert.ok(button.classList.contains('agenda-day-head--active'))
	assert.ok(button.classList.contains('agenda-day-head--closed'))
	assert.ok(screen.getByText('Hoy'))
	assert.ok(screen.getByText('Cerrado'))
	assert.ok(screen.getByText('1 movimiento'))
	const collectedBalance = screen.getByText(/Cobrado\s+\$\s*1\.500/)
	const receivableBalance = screen.getByText(/Por cobrar\s+\$\s*500/)
	assert.ok(collectedBalance)
	assert.ok(receivableBalance)
	assert.equal(
		collectedBalance.parentElement?.className,
		'agenda-day-balances',
	)
	assert.equal(
		receivableBalance.parentElement?.className,
		'agenda-day-balances',
	)
})

test('AgendaDayHeader only opens an interactive day with the quick prefill flag', () => {
	const calls: Array<[string, boolean | undefined]> = []
	renderHeader({
		onOpenQuickReservation: (day, prefillDay) => {
			calls.push([day, prefillDay])
		},
	})

	fireEvent.click(screen.getByRole('button'))

	assert.deepEqual(calls, [['2026-07-21', true]])
})

test('AgendaDayHeader keeps non-interactive entering columns unavailable', () => {
	const calls: Array<[string, boolean | undefined]> = []
	renderHeader({
		count: 0,
		hiddenDuringEnter: true,
		interactive: false,
		workingHours: [],
		onOpenQuickReservation: (day, prefillDay) => {
			calls.push([day, prefillDay])
		},
	})

	const button = screen.getByRole('button')
	fireEvent.click(button)

	assert.equal(button.getAttribute('aria-disabled'), 'true')
	assert.equal(button.getAttribute('tabindex'), '-1')
	assert.ok(button.classList.contains('agenda-entering-overlap-hidden'))
	assert.ok(screen.getByText('0 movimientos'))
	assert.deepEqual(calls, [])
})
