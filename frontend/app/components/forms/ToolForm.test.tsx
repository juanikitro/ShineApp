import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ToolForm } from './ToolForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setToolForm = vi.fn()
	const focusField = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string, __?: boolean) => focusHandler)
	const props = {
		submitLabel: 'Guardar herramienta',
		toolForm: {
			name: 'Aspiradora',
			quantity: '2',
			status: 'in_use',
			unit_value: '1200',
			purchased_at: '2026-07-22',
			notes: 'Taller',
		},
		setToolForm,
		onSubmit,
		toolStatusOptions: [
			{ value: 'in_use', label: 'En uso' },
			{ value: 'available', label: 'Disponible' },
		],
		focusNextOnEnter,
		focusField,
		submitting: false,
		...overrides,
	} as Parameters<typeof ToolForm>[0]

	return {
		...render(<ToolForm {...props} />),
		onSubmit,
		setToolForm,
		focusField,
		focusNextOnEnter,
		focusHandler,
	}
}

test('ToolForm preserves fields, value summary, focus flow and submit behavior', () => {
	const {
		container,
		onSubmit,
		setToolForm,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()
	const name = screen.getByLabelText('Nombre')
	const quantity = screen.getByLabelText('Cantidad')

	assert.equal(name.getAttribute('list'), 'tool-name-options')
	assert.equal(quantity.getAttribute('step'), '1')
	assert.ok(container.querySelector('.info-note strong'))
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['tool.quantity'],
		['tool.status', true],
		['tool.purchased_at'],
		['tool.notes'],
	])

	fireEvent.change(name, { target: { value: 'Hidrolavadora' } })
	assert.deepEqual(setToolForm.mock.calls[0][0], {
		name: 'Hidrolavadora',
		quantity: '2',
		status: 'in_use',
		unit_value: '1200',
		purchased_at: '2026-07-22',
		notes: 'Taller',
	})
	fireEvent.keyDown(name, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('ToolForm preserves status selection and pending submit presentation', () => {
	const { setToolForm, focusField } = renderForm({ submitting: true })
	const trigger = screen.getByRole('combobox', { name: 'Estado' })

	assert.ok(trigger.closest('[data-focus-key="tool.status"]'))
	fireEvent.click(trigger)
	fireEvent.click(screen.getByRole('option', { name: 'Disponible' }))
	assert.equal(setToolForm.mock.calls[0][0].status, 'available')
	assert.deepEqual(focusField.mock.calls, [['tool.unit_value']])

	const button = screen.getByRole('button', {
		name: 'Guardar herramienta',
	}) as HTMLButtonElement
	assert.equal(button.disabled, true)
	assert.ok(button.querySelector('.button-spinner'))
})
