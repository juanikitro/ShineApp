import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { AgendaDragOverlayCard } from './AgendaDragOverlayCard'

afterEach(cleanup)

function renderCard(overrides = {}) {
	const props = {
		cardClass: 'agenda-card--confirmed',
		showWorkStatus: false,
		timeLabel: '10:30',
		customerName: 'Ana Perez',
		serviceLines: [{ key: 'wash', name: 'Lavado' }],
		vehicleModel: 'Ford Fiesta',
		statusValue: 'confirmed',
		statusLabels: { confirmed: 'Confirmada', in_progress: 'En proceso' },
		workDebt: <div className="agenda-work-debt">Deuda</div>,
		...overrides,
	} as Parameters<typeof AgendaDragOverlayCard>[0]

	return render(<AgendaDragOverlayCard {...props} />)
}

test('AgendaDragOverlayCard preserves reservation overlay markup', () => {
	const { container } = renderCard()
	const card = container.querySelector<HTMLElement>(
		'.agenda-operational-card--drag-overlay',
	)

	assert.ok(card)
	assert.ok(card.classList.contains('record'))
	assert.ok(card.classList.contains('compact'))
	assert.ok(card.classList.contains('agenda-card--confirmed'))
	assert.equal(screen.getByText('Reserva').className, 'agenda-entry-eyebrow')
	assert.ok(screen.getByText('10:30').classList.contains('agenda-entry-time'))
	assert.ok(screen.getByText('Lavado').classList.contains('agenda-service-name'))
	assert.ok(screen.getByText('Ford Fiesta').classList.contains('agenda-vehicle-model'))
	assert.ok(container.querySelector('.status.confirmed'))
	assert.ok(container.querySelector('.agenda-work-debt'))
})

test('AgendaDragOverlayCard preserves work status and absent optional details', () => {
	const { container } = renderCard({
		showWorkStatus: true,
		timeLabel: '',
		serviceLines: [],
		vehicleModel: '',
		statusValue: 'in_progress',
		workDebt: null,
	})

	assert.equal(screen.getByText('Trabajo').className, 'agenda-entry-eyebrow')
	assert.ok(container.querySelector('.status.in_progress'))
	assert.equal(container.querySelector('.agenda-entry-time'), null)
	assert.equal(container.querySelector('.agenda-service-stack'), null)
	assert.equal(container.querySelector('.agenda-vehicle-model'), null)
	assert.equal(container.querySelector('.agenda-work-debt'), null)
})
