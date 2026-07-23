import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { AgendaViewControls } from './AgendaViewControls'

afterEach(cleanup)

const agendaRangeModes = [
	{ value: 'week' as const, label: 'Semana' },
	{ value: 'month' as const, label: 'Mes' },
]
const workViewModes = [
	{ value: 'agenda' as const, label: 'Agenda' },
	{ value: 'status' as const, label: 'Estado' },
]

function renderControls(overrides = {}) {
	const calls = { range: [], view: [] } as { range: string[]; view: string[] }
	const props = {
		agendaSectorLabel: 'Lavado',
		visibleReservationCount: 1,
		workViewMode: 'agenda' as const,
		agendaRangeMode: 'week' as const,
		agendaRangeModes,
		workViewModes,
		onAgendaRangeChange: (value: string) => calls.range.push(value),
		onWorkViewChange: (value: string) => calls.view.push(value),
		...overrides,
	} as Parameters<typeof AgendaViewControls>[0]

	return { ...render(<AgendaViewControls {...props} />), calls }
}

test('AgendaViewControls preserves singular copy and both agenda controls', () => {
	const { calls } = renderControls()

	assert.equal(screen.getByText('Lavado').tagName, 'STRONG')
	assert.ok(screen.getByText('1 reserva visible'))
	fireEvent.click(screen.getByRole('button', { name: 'Mes' }))
	fireEvent.click(screen.getByRole('tab', { name: 'Estado' }))
	assert.deepEqual(calls.range, ['month'])
	assert.deepEqual(calls.view, ['status'])
})

test('AgendaViewControls hides range selection outside the agenda view', () => {
	renderControls({
		visibleReservationCount: 2,
		workViewMode: 'status',
	})

	assert.ok(screen.getByText('2 reservas visibles'))
	assert.equal(screen.queryByRole('group', { name: 'Rango de la agenda' }), null)
	assert.ok(screen.getByRole('tablist', { name: 'Visualizacion de trabajos' }))
})
