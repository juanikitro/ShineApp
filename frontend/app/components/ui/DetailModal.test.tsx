import assert from 'node:assert/strict'
import { fireEvent, render, screen } from '@testing-library/react'
import { test, vi } from 'vitest'

import { DetailModal } from './DetailModal'

function renderDetailModal(overrides = {}) {
	const onClose = vi.fn()
	const onEdit = vi.fn()
	const props = {
		title: 'Cliente',
		data: {
			name: 'Ana Perez',
			phone: '11 5555-1212',
			status: 'active',
			notes: 'Prefiere coordinar sus turnos con anticipacion por WhatsApp.',
		},
		onClose,
		editable: true,
		onEdit,
		...overrides,
	} as Parameters<typeof DetailModal>[0]

	return { ...render(<DetailModal {...props} />), onClose, onEdit }
}

test('presents generic fields in a scannable detail section', () => {
	renderDetailModal()

	assert.ok(screen.getByText('Informacion del registro'))
	assert.ok(screen.getByText('4 datos'))
	assert.ok(screen.getByText('Ana Perez'))
	assert.ok(screen.getByText('Activo'))
	assert.ok(screen.getByLabelText('Informacion del registro'))
	assert.ok(screen.getByText(/Prefiere coordinar/).closest('.detail-field--wide'))
})

test('keeps the empty state and close action explicit', () => {
	const { onClose } = renderDetailModal({ data: { id: 1 } })

	assert.ok(screen.getByText('Sin datos para mostrar.'))
	fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
	assert.equal(onClose.mock.calls.length, 1)
})

test('keeps the edit action and edit form outside the generic detail view', () => {
	const { onEdit, rerender } = renderDetailModal()

	fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
	assert.equal(onEdit.mock.calls.length, 1)

	rerender(
		<DetailModal
			title="Cliente"
			data={{ name: 'Ana Perez' }}
			onClose={() => {}}
			editing={true}
			editForm={<form aria-label="Editar cliente" />}
		/>,
	)
	assert.ok(screen.getByRole('form', { name: 'Editar cliente' }))
	assert.equal(screen.queryByText('Informacion del registro'), null)
})
