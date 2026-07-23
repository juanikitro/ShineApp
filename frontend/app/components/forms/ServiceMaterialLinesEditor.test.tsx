import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ServiceMaterialLinesEditor } from './ServiceMaterialLinesEditor'

afterEach(cleanup)

function renderEditor(overrides = {}) {
	const onAdd = vi.fn()
	const onRemove = vi.fn()
	const onUpdate = vi.fn()
	const props = {
		lines: [{ material: '1', quantity: '2' }],
		materials: [{ id: '1', name: 'Shampoo', unit: 'L' }],
		materialOptions: [
			{ value: '1', label: 'Shampoo' },
			{ value: '2', label: 'Cera' },
		],
		onAdd,
		onRemove,
		onUpdate,
		...overrides,
	} as Parameters<typeof ServiceMaterialLinesEditor>[0]

	return {
		...render(<ServiceMaterialLinesEditor {...props} />),
		onAdd,
		onRemove,
		onUpdate,
	}
}

test('ServiceMaterialLinesEditor preserves stock notice, unit label and line callbacks', () => {
	const { container, onRemove, onUpdate } = renderEditor()

	assert.ok(screen.getByText('Materiales por servicio'))
	assert.ok(screen.getByText(/los materiales se descuentan/))
	const quantity = screen.getByLabelText('Cantidad (L)')
	assert.equal(quantity.getAttribute('step'), '0.001')
	fireEvent.change(quantity, { target: { value: '3' } })
	fireEvent.click(screen.getByRole('combobox', { name: 'Material' }))
	fireEvent.click(screen.getByRole('option', { name: 'Cera' }))
	fireEvent.click(container.querySelector('.stock-line button.ghost')!)
	assert.deepEqual(onUpdate.mock.calls, [
		[0, { quantity: '3' }],
		[0, { material: '2' }],
	])
	assert.deepEqual(onRemove.mock.calls, [[0]])
})

test('ServiceMaterialLinesEditor preserves the add action and empty material unit label', () => {
	const { onAdd } = renderEditor({
		lines: [{ material: 'unknown', quantity: '1' }],
		materials: [],
	})

	assert.ok(screen.getByLabelText('Cantidad'))
	fireEvent.click(screen.getByRole('button', { name: 'Agregar material' }))
	assert.equal(onAdd.mock.calls.length, 1)
})
