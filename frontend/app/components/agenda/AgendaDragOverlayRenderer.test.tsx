import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { type AgendaOperationalRow } from '@/lib/agenda'

import {
	createAgendaDragOverlayRenderer,
	renderAgendaDragOverlayCard,
} from './AgendaDragOverlayRenderer'

afterEach(cleanup)

const workOrder = { id: 70, status: 'ready' }

const row: AgendaOperationalRow = {
	key: 'reservation:7',
	day: '2026-07-22',
	displayDay: '2026-07-22',
	phase: 'entry',
	kind: 'reservation-work-order',
	reservation: {
		id: 7,
		customer_name: 'Ana',
		status: 'confirmed',
		start_time: '10:30',
		items: [{ service_name: 'Lavado' }],
	},
	workOrder,
}

const workStatusRow: AgendaOperationalRow = {
	...row,
	reservation: { ...row.reservation, status: '' },
}

function renderOverlay(overrides = {}) {
	return render(
		renderAgendaDragOverlayCard({
			row: workStatusRow,
			statusMode: 'work-order',
			vehicles: [],
			useReservationTimes: true,
			workOrderByReservation: { 7: workOrder },
			agendaCardClass: () => 'agenda-card--ready',
			orderLabels: { ready: 'Listo' },
			reservationLabels: { confirmed: 'Confirmada' },
			renderWorkDebt: () => <span>Deuda</span>,
			...overrides,
		}),
	)
}

test('renderAgendaDragOverlayCard preserves work overlay presentation', () => {
	const { container } = renderOverlay()

	assert.ok(container.querySelector('.agenda-card--ready'))
	assert.ok(screen.getByText('Trabajo'))
	assert.ok(screen.getByText('Listo'))
	assert.ok(screen.getByText('Ana'))
	assert.ok(screen.getByText('Lavado'))
	assert.ok(screen.getByText('Deuda'))
})

test('renderAgendaDragOverlayCard preserves empty and reservation status branches', () => {
	const { container } = renderOverlay({ row: null })
	assert.equal(container.firstChild, null)
	cleanup()
	renderOverlay({ row, statusMode: 'reservation', workOrderByReservation: {} })
	assert.ok(screen.getByText('Reserva'))
	assert.ok(screen.getByText('Confirmada'))
})

test('createAgendaDragOverlayRenderer binds shared overlay dependencies', () => {
	const renderOverlay = createAgendaDragOverlayRenderer({
		vehicles: [],
		useReservationTimes: true,
		workOrderByReservation: { 7: workOrder },
		agendaCardClass: () => 'agenda-card--factory',
		orderLabels: { ready: 'Listo' },
		reservationLabels: { confirmed: 'Confirmada' },
		renderWorkDebt: () => <span>Deuda factory</span>,
	})
	const { container } = render(
		renderOverlay(workStatusRow, { statusMode: 'work-order' }),
	)

	assert.ok(container.querySelector('.agenda-card--factory'))
	assert.ok(screen.getByText('Listo'))
	assert.ok(screen.getByText('Deuda factory'))
})
