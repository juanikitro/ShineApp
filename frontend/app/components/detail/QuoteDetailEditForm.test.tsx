import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuoteDetailEditForm } from './QuoteDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			public_code: 'Q-001',
			status: 'draft',
			valid_until: '2026-07-30',
			discount_rate: '5',
			tax_rate: '21',
			observations: 'Entrega en taller',
			terms: 'Contado',
			payment_instructions: 'Transferencia',
		},
		onSubmit,
		onPatch,
		statusOptions: [
			{ value: 'draft', label: 'Sin enviar' },
			{ value: 'sent', label: 'Enviado' },
		],
		summary: <div>Resumen</div>,
		groupEditor: <div>Autos del grupo</div>,
		subtotalLabel: '$ 10.000',
		discountLabel: '$ 500',
		taxableLabel: '$ 9.500',
		taxLabel: '$ 1.995',
		totalLabel: '$ 11.495',
		downloadActions: <div>Descargas</div>,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof QuoteDetailEditForm>[0]

	return {
		...render(<QuoteDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('QuoteDetailEditForm preserves quote fields, status selection, totals, slots and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()

	assert.ok(screen.getByText('Resumen'))
	assert.ok(screen.getByText('Autos del grupo'))
	assert.ok(screen.getByText('Descargas'))
	assert.equal(screen.getByLabelText('Nombre de la cotizacion').getAttribute('maxlength'), '20')
	assert.equal(screen.getByLabelText('Descuento %').getAttribute('step'), '0.01')
	fireEvent.change(screen.getByLabelText('Nombre de la cotizacion'), {
		target: { value: 'Q-002' },
	})
	fireEvent.change(screen.getByLabelText('IVA %'), {
		target: { value: '10' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
	fireEvent.click(screen.getByRole('option', { name: 'Enviado' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ public_code: 'Q-002' }],
		[{ tax_rate: '10' }],
		[{ status: 'sent' }],
	])
	assert.ok(container.textContent?.includes('Total $ 11.495'))
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuoteDetailEditForm preserves absent optional slots', () => {
	renderForm({ summary: null, groupEditor: null, downloadActions: null })

	assert.equal(screen.queryByText('Resumen'), null)
	assert.equal(screen.queryByText('Autos del grupo'), null)
	assert.equal(screen.queryByText('Descargas'), null)
})
