import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { SupplierDetailEditForm } from './SupplierDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			name: 'Proveedora Norte',
			legal_name: 'Proveedora Norte SA',
			category: 'Insumos',
			tax_condition: 'RI',
			contact_name: 'Ana',
			phone: '3624',
			email: 'ana@example.com',
			tax_id: '20-123',
			website: 'https://example.com',
			address: 'Mitre 100',
			is_active: true,
			notes: 'Entrega semanal',
		},
		onSubmit,
		onPatch,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof SupplierDetailEditForm>[0]

	return {
		...render(<SupplierDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('SupplierDetailEditForm preserves supplier inputs, patches and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()
	const name = screen.getByLabelText('Nombre visible')
	const phone = screen.getByLabelText('Telefono')

	assert.equal(name.getAttribute('list'), 'supplier-name-options')
	assert.equal(phone.getAttribute('type'), 'tel')
	assert.equal(phone.getAttribute('autocomplete'), 'tel')
	fireEvent.change(name, { target: { value: 'Proveedora Sur' } })
	fireEvent.change(screen.getByLabelText('Notas internas'), {
		target: { value: 'Retira viernes' },
	})
	assert.deepEqual(onPatch.mock.calls, [
		[{ name: 'Proveedora Sur' }],
		[{ notes: 'Retira viernes' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('SupplierDetailEditForm preserves the active supplier toggle', () => {
	const { onPatch } = renderForm({ data: { name: 'Inactiva', is_active: false } })
	const toggle = screen.getByLabelText('Proveedor activo') as HTMLInputElement

	assert.equal(toggle.checked, false)
	fireEvent.click(toggle)
	assert.deepEqual(onPatch.mock.calls, [[{ is_active: true }]])
})
