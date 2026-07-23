import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { VehicleListCard } from './VehicleListCard'

afterEach(cleanup)

function renderCard(overrides = {}) {
	const onEdit = vi.fn()
	const onDeactivate = vi.fn()
	const onContextMenu = vi.fn()
	const props = {
		item: { id: 1 },
		recordClassName: 'vehicle-record',
		detailProps: { role: 'button', tabIndex: 0 },
		quickActionProps: { onContextMenu },
		quickActionsTrigger: <button type="button">Acciones rapidas</button>,
		title: 'AA123BB',
		description: 'Ford Fiesta - Rojo - Ana',
		onEdit,
		onDeactivate,
		...overrides,
	} as Parameters<typeof VehicleListCard>[0]

	return {
		...render(<VehicleListCard {...props} />),
		onEdit,
		onDeactivate,
		onContextMenu,
	}
}

test('VehicleListCard preserves record presentation, quick action target and edit callbacks', () => {
	const { container, onEdit, onDeactivate, onContextMenu } = renderCard()
	const record = container.querySelector('.vehicle-record')!

	assert.equal(record.getAttribute('role'), 'button')
	assert.equal(record.getAttribute('tabindex'), '0')
	assert.ok(screen.getByText('AA123BB'))
	assert.ok(screen.getByText('Ford Fiesta - Rojo - Ana'))
	assert.ok(screen.getByRole('button', { name: 'Acciones rapidas' }))

	fireEvent.contextMenu(record)
	fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
	fireEvent.click(screen.getByRole('button', { name: 'Baja' }))
	assert.equal(onContextMenu.mock.calls.length, 1)
	assert.equal(onEdit.mock.calls.length, 1)
	assert.equal(onDeactivate.mock.calls.length, 1)
})

test('VehicleListCard keeps explicitly supplied interactive attributes', () => {
	const onKeyDown = vi.fn()
	const { container } = renderCard({
		detailProps: { role: 'link', tabIndex: 2, onKeyDown },
	})
	const record = container.querySelector('.vehicle-record')!

	assert.equal(record.getAttribute('role'), 'link')
	assert.equal(record.getAttribute('tabindex'), '2')
	fireEvent.keyDown(record, { key: 'Enter' })
	assert.equal(onKeyDown.mock.calls.length, 1)
})
