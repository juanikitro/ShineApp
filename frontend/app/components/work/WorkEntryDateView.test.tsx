import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import type { AgendaOperationalRow } from '@/lib/agenda'
import type { AnyRecord } from '@/lib/page-support'

import { WorkEntryDateView } from './WorkEntryDateView'

afterEach(cleanup)

function reservationRow(reservation: AnyRecord): AgendaOperationalRow {
	return {
		key: `reservation:${reservation.id}`,
		day: String(reservation.day ?? ''),
		displayDay: String(reservation.day ?? ''),
		phase: 'entry',
		kind: 'reservation-only',
		reservation,
		workOrder: null,
	}
}

function renderEntryDateView(overrides = {}) {
	const props = {
		workEntryDateGroups: [
			{
				key: '2026-07-21',
				entryDate: '2026-07-21',
				reservations: [{ id: 7, day: '2026-07-21' }],
			},
		],
		workFreeQuotesWithoutEntryDate: [{ id: 8 }],
		selectedDay: '2026-07-21',
		onCreateReservation: () => {},
		getReservationRow: reservationRow,
		recordClass: (_kind: string, id: string | number, extraClass = '') =>
			['record', `id-${id}`, extraClass].filter(Boolean).join(' '),
		agendaCardClass: () => 'agenda-card',
		flashClass: () => '',
		renderReservationCard: (reservation: AnyRecord) => (
			<span>Reserva {reservation.id}</span>
		),
		quoteQuickActions: () => [],
		detailRecordProps: () => ({}),
		quickActionTargetProps: () => ({}),
		renderQuickActionsTrigger: () => null,
		renderQuoteCardContent: (item: AnyRecord) => (
			<span>Cotizacion {item.id}</span>
		),
		...overrides,
	} as Parameters<typeof WorkEntryDateView>[0]

	return render(<WorkEntryDateView {...props} />)
}

test('WorkEntryDateView preserves reservation and free-quote cards', () => {
	const { container } = renderEntryDateView()

	assert.equal(container.querySelectorAll('.work-group-panel').length, 2)
	assert.ok(screen.getByText('1 reservas'))
	assert.ok(screen.getByText('1 cotizaciones libres'))
	assert.ok(screen.getByText('Reserva 7'))
	assert.ok(screen.getByText('Cotizacion 8'))
	assert.ok(container.querySelector('.quote-board-card'))
})

test('WorkEntryDateView preserves the empty-state create action', () => {
	let createCalls = 0
	renderEntryDateView({
		workEntryDateGroups: [],
		workFreeQuotesWithoutEntryDate: [],
		onCreateReservation: () => {
			createCalls += 1
		},
	})

	fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }))

	assert.ok(screen.getByText('Sin reservas o cotizaciones para este filtro.'))
	assert.equal(createCalls, 1)
})
