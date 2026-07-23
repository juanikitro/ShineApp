import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialDetailEditForm } from './MaterialDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			name: 'Shampoo',
			sector: '2',
			unit: 'L',
			stock_quantity: '8',
			notes: 'Uso diario',
		},
		onSubmit,
		onPatch,
		sectorOptions: [{ value: '2', label: 'Lavado' }],
		history: <div className="material-summary">Historial</div>,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof MaterialDetailEditForm>[0]

	return {
		...render(<MaterialDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('MaterialDetailEditForm preserves fields, sector selection, history and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()

	assert.ok(screen.getByText('Historial'))
	assert.equal(screen.getByLabelText('Stock').getAttribute('min'), '0')
	fireEvent.change(screen.getByLabelText('Unidad'), {
		target: { value: 'ml' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Sector' }))
	fireEvent.click(screen.getByRole('option', { name: 'Sin sector' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ unit: 'ml' }],
		[{ sector: null }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialDetailEditForm hides sector selection when no sectors exist', () => {
	renderForm({ sectorOptions: [] })

	assert.equal(screen.queryByRole('combobox', { name: 'Sector' }), null)
})
