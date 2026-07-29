import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ToolDetailEditForm } from './ToolDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			name: 'Aspiradora',
			quantity: '2',
			status: 'in_use',
			unit_value: '1200',
			purchased_at: '2026-07-22',
			notes: 'Taller',
		},
		onSubmit,
		onPatch,
		statusOptions: [
			{ value: 'in_use', label: 'En uso' },
			{ value: 'available', label: 'Disponible' },
		],
		statusLabel: 'En uso',
		quantityLabel: '2',
		unitValueLabel: '$ 1.200',
		totalValueLabel: '$ 2.400',
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof ToolDetailEditForm>[0]

	return {
		...render(<ToolDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('ToolDetailEditForm preserves fields, status selection, summary and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()

	assert.equal(screen.getByLabelText('Cantidad').getAttribute('step'), '1')
	assert.ok(screen.getByText('$ 2.400'))
	fireEvent.change(screen.getByLabelText('Nombre'), {
		target: { value: 'Hidrolavadora' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
	fireEvent.click(screen.getByRole('option', { name: 'Disponible' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ name: 'Hidrolavadora' }],
		[{ status: 'available' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('ToolDetailEditForm preserves default in-use status for missing data', () => {
	renderForm({ data: { name: 'Compresor' } })

	assert.ok(screen.getByRole('combobox', { name: 'Estado' }).textContent?.includes('En uso'))
})
