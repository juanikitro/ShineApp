import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { DashboardPeriodToolbar } from './DashboardPeriodToolbar'

afterEach(cleanup)

function renderToolbar(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPreviousMonth = vi.fn()
	const onNextMonth = vi.fn()
	const onFromChange = vi.fn()
	const onToChange = vi.fn()
	const props = {
		period: { from: '2026-07-01', to: '2026-07-31' },
		onSubmit,
		onPreviousMonth,
		onNextMonth,
		onFromChange,
		onToChange,
		loading: false,
		...overrides,
	} as Parameters<typeof DashboardPeriodToolbar>[0]

	return {
		...render(<DashboardPeriodToolbar {...props} />),
		onSubmit,
		onPreviousMonth,
		onNextMonth,
		onFromChange,
		onToChange,
	}
}

test('DashboardPeriodToolbar preserves period controls, callbacks and submit behavior', () => {
	const {
		container,
		onSubmit,
		onPreviousMonth,
		onNextMonth,
		onFromChange,
		onToChange,
	} = renderToolbar()

	assert.equal(container.querySelector('form')?.className, 'toolbar dashboard-period-toolbar')
	fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
	fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
	fireEvent.change(screen.getByLabelText('Desde'), {
		target: { value: '2026-06-01' },
	})
	fireEvent.change(screen.getByLabelText('Hasta'), {
		target: { value: '2026-06-30' },
	})
	assert.equal(onPreviousMonth.mock.calls.length, 1)
	assert.equal(onNextMonth.mock.calls.length, 1)
	assert.deepEqual(onFromChange.mock.calls, [['2026-06-01']])
	assert.deepEqual(onToChange.mock.calls, [['2026-06-30']])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('DashboardPeriodToolbar preserves loading UI', () => {
	renderToolbar({ loading: true })
	const button = screen.getByRole('button', { name: 'Ver periodo' }) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.equal(screen.getByRole('status').textContent, 'Actualizando')
})
