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
	const onDashboardViewChange = vi.fn()
	const props = {
		period: { from: '2026-07-01', to: '2026-07-31' },
		dashboardView: 'summary' as const,
		onSubmit,
		onPreviousMonth,
		onNextMonth,
		onFromChange,
		onToChange,
		onDashboardViewChange,
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
		onDashboardViewChange,
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
		onDashboardViewChange,
	} = renderToolbar()

	assert.equal(container.querySelector('form')?.className, 'toolbar dashboard-period-toolbar')
	assert.ok(screen.getByRole('button', { name: 'Ver periodo' }).classList.contains('dashboard-period-submit'))
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
	assert.equal(screen.getByRole('group', { name: 'Vista del dashboard' }).textContent, 'ResumenAnálisis')
	fireEvent.click(screen.getByRole('button', { name: 'Análisis' }))
	assert.deepEqual(onDashboardViewChange.mock.calls, [['analysis']])

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
