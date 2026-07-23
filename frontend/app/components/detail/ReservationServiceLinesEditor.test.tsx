import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ReservationServiceLinesEditor } from './ReservationServiceLinesEditor'

afterEach(cleanup)

function renderEditor(overrides = {}) {
	const onAdd = vi.fn()
	const onSelectService = vi.fn()
	const onUpdate = vi.fn()
	const onRemove = vi.fn()
	const props = {
		items: [{ service: '1', quantity: '2', unit_price: '3' }],
		serviceOptions: [
			{ value: '1', label: 'Lavado' },
			{ value: '2', label: 'Pulido' },
		],
		formatMoney: (value: unknown) => `$ ${value}`,
		onAdd,
		onSelectService,
		onUpdate,
		onRemove,
		...overrides,
	} as Parameters<typeof ReservationServiceLinesEditor>[0]

	return {
		...render(<ReservationServiceLinesEditor {...props} />),
		onAdd,
		onSelectService,
		onUpdate,
		onRemove,
	}
}

test('ReservationServiceLinesEditor preserves line fields, total and update callbacks', () => {
	const { onSelectService, onUpdate } = renderEditor()

	assert.ok(screen.getByText('$ 6'))
	assert.equal(screen.getByLabelText('Cantidad').getAttribute('min'), '1')
	fireEvent.change(screen.getByLabelText('Cantidad'), {
		target: { value: '4' },
	})
	fireEvent.change(screen.getByLabelText('Precio'), {
		target: { value: '5' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Servicio' }))
	fireEvent.click(screen.getByRole('option', { name: 'Pulido' }))
	assert.deepEqual(onUpdate.mock.calls, [
		[0, { quantity: '4' }],
		[0, { unit_price: '5' }],
	])
	assert.deepEqual(onSelectService.mock.calls, [[0, '2']])
	assert.equal(screen.queryByRole('button', { name: 'Quitar' }), null)
})

test('ReservationServiceLinesEditor preserves add and remove actions for multiple lines', () => {
	const { onAdd, onRemove } = renderEditor({
		items: [
			{ service: '1', quantity: '1', unit_price: '1' },
			{ service: '2', quantity: '1', unit_price: '2' },
		],
	})

	fireEvent.click(screen.getByRole('button', { name: 'Agregar servicio' }))
	fireEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[1])
	assert.equal(onAdd.mock.calls.length, 1)
	assert.deepEqual(onRemove.mock.calls, [[1]])
})
