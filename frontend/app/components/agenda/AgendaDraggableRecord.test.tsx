import assert from 'node:assert/strict'
import { DndContext } from '@dnd-kit/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import type { AgendaOperationalRow } from '@/lib/agenda'

import { AgendaDraggableRecord } from './AgendaDraggableRecord'

afterEach(cleanup)

const entryRow: AgendaOperationalRow = {
	key: 'reservation:7',
	day: '2026-07-21',
	displayDay: '2026-07-21',
	phase: 'entry',
	kind: 'reservation-only',
	reservation: { id: 7, day: '2026-07-21' },
	workOrder: null,
}

function renderRecord(overrides = {}) {
	const props = {
		row: entryRow,
		children: <span>Reserva de prueba</span>,
		className: 'external-card-class',
		style: { gridColumn: '2' },
		interactive: true,
		snapshotKey: 'active',
		agendaMovePendingId: null,
		recordClass: (kind: string, id: string | number, extraClass?: string) =>
			['record', `kind-${kind}`, `id-${id}`, extraClass]
				.filter(Boolean)
				.join(' '),
		agendaCardClass: (row: AgendaOperationalRow) =>
			row.workOrder ? 'with-work-order' : 'without-work-order',
		flashClass: (target: string | null) =>
			target === 'agenda:reservation:7' ? 'motion-flash' : '',
		...overrides,
	} as Parameters<typeof AgendaDraggableRecord>[0]

	return render(
		<DndContext>
			<AgendaDraggableRecord {...props} />
		</DndContext>,
	)
}

test('AgendaDraggableRecord preserves the interactive entry card presentation', () => {
	const { container } = renderRecord()
	const card = container.querySelector<HTMLElement>(
		'.agenda-operational-card--draggable',
	)

	assert.ok(card)
	assert.ok(card.classList.contains('record'))
	assert.ok(card.classList.contains('kind-reservation'))
	assert.ok(card.classList.contains('id-7'))
	assert.ok(card.classList.contains('compact'))
	assert.ok(card.classList.contains('without-work-order'))
	assert.ok(card.classList.contains('external-card-class'))
	assert.equal(card.style.gridColumn, '2')
	assert.equal(card.classList.contains('agenda-operational-card--locked'), false)
	assert.ok(screen.getByText('Reserva de prueba'))
	assert.ok(container.querySelector('.motion-flash-overlay'))
})

test('AgendaDraggableRecord preserves locked pending work-order cards', () => {
	const row: AgendaOperationalRow = {
		...entryRow,
		key: 'reservation:12',
		phase: 'stay',
		kind: 'reservation-work-order',
		reservation: { id: 12, day: '2026-07-21' },
		workOrder: { id: 99 },
	}
	const { container } = renderRecord({
		row,
		interactive: false,
		snapshotKey: 'agenda:2026-07-21',
		agendaMovePendingId: '12',
		flashClass: () => '',
	})
	const card = container.querySelector<HTMLElement>(
		'.agenda-operational-card--draggable',
	)

	assert.ok(card)
	assert.ok(card.classList.contains('kind-workorder'))
	assert.ok(card.classList.contains('id-99'))
	assert.ok(card.classList.contains('agenda-operational-card--locked'))
	assert.ok(card.classList.contains('agenda-operational-card--moving'))
})

test('AgendaDraggableRecord keeps manual entry cards visually unlocked', () => {
	const row: AgendaOperationalRow = {
		...entryRow,
		key: 'manual:2026-07-21',
		reservation: null,
		workOrder: null,
	}
	const { container } = renderRecord({ row, flashClass: () => '' })
	const card = container.querySelector<HTMLElement>(
		'.agenda-operational-card--draggable',
	)

	assert.ok(card)
	assert.equal(card.classList.contains('agenda-operational-card--locked'), false)
})
