import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { WorkStatusView } from './WorkStatusView'

afterEach(cleanup)

const statusColumns = [
	{
		key: 'confirmed',
		label: 'Confirmadas',
		statuses: ['confirmed'],
		dropStatus: 'confirmed',
	},
]

function renderWorkStatusView(overrides = {}) {
	const props = {
		sensors: [],
		onDragStart: () => {},
		onDragOver: () => {},
		onDragEnd: () => {},
		onDragCancel: () => {},
		statusColumns,
		workStatusGroups: [
			{
				key: 'confirmed',
				label: 'Confirmadas',
				dropStatus: 'confirmed',
				reservations: [
					{
						id: 7,
						day: '2026-07-21',
						status: 'confirmed',
						work_order: { id: 70, status: 'confirmed' },
					},
				],
			},
		],
		workStatusDropStatus: 'confirmed',
		workStatusMovePendingId: null,
		activeWorkStatusRow: null,
		workOrderByReservation: {},
		recordClass: (_kind: string, id: string | number, extraClass = '') =>
			['record', `id-${id}`, extraClass].filter(Boolean).join(' '),
		agendaCardClass: () => 'agenda-card',
		flashClass: () => '',
		renderReservationCard: (reservation: { id: number }) => (
			<span>Reserva {reservation.id}</span>
		),
		renderDragOverlay: () => null,
		...overrides,
	} as Parameters<typeof WorkStatusView>[0]

	return render(<WorkStatusView {...props} />)
}

test('WorkStatusView preserves a populated drop-target lane', () => {
	const { container } = renderWorkStatusView()
	const lane = container.querySelector<HTMLElement>('.work-status-lane')
	const card = container.querySelector<HTMLElement>('.work-status-card')

	assert.ok(lane)
	assert.ok(lane.classList.contains('work-status-lane--drop-target'))
	assert.ok(screen.getByRole('heading', { name: 'Confirmadas' }))
	assert.ok(screen.getByText('1 reservas'))
	assert.ok(card?.classList.contains('record'))
	assert.ok(card?.classList.contains('id-7'))
	assert.ok(screen.getByText('Reserva 7'))
})

test('WorkStatusView preserves the empty work-status lane message', () => {
	renderWorkStatusView({
		workStatusGroups: [
			{
				key: 'ready',
				label: 'Listos',
				reservations: [],
			},
		],
		workStatusDropStatus: null,
	})

	assert.ok(screen.getByText('Sin trabajos en listos.'))
	assert.ok(
		screen.getByText(
				'La columna queda lista para recibir trabajos cuando cambie el avance operativo.',
			),
	)
})
