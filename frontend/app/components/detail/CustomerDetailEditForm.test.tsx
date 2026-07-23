import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { CustomerDetailEditForm } from './CustomerDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string) => focusHandler)
	const onOpenOrder = vi.fn()
	const props = {
		data: {
			name: 'Ana',
			phone: '3624',
			email: 'ana@example.com',
			birthday_day: '2',
			birthday_month: '3',
			birthday_label: '2 de marzo',
			notes: 'Cliente frecuente',
		},
		onSubmit,
		onPatch,
		focusNextOnEnter,
		canViewEconomy: false,
		customerHistoryLoading: false,
		customerHistory: null,
		orderLabels: {},
		onOpenOrder,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof CustomerDetailEditForm>[0]

	return {
		...render(<CustomerDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		focusNextOnEnter,
		focusHandler,
		onOpenOrder,
	}
}

test('CustomerDetailEditForm preserves customer fields, birthday patching and actions', () => {
	const { container, onSubmit, onPatch, focusNextOnEnter, focusHandler } =
		renderForm()
	const name = screen.getByLabelText('Nombre')

	assert.equal(name.getAttribute('data-focus-key'), 'detail.customer.name')
	assert.ok(container.querySelector('.birthday-badge'))
	assert.deepEqual(focusNextOnEnter.mock.calls.map(([key]) => key), [
		'detail.customer.phone',
		'detail.customer.email',
		'detail.customer.birthday_day',
		'detail.customer.birthday_month',
		'detail.customer.notes',
	])
	fireEvent.change(name, { target: { value: 'Beto' } })
	fireEvent.change(screen.getByLabelText('Dia'), { target: { value: '5' } })
	assert.deepEqual(onPatch.mock.calls, [
		[{ name: 'Beto' }],
		[{ birthday_day: '5' }],
	])
	fireEvent.keyDown(name, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('CustomerDetailEditForm preserves the economic history visibility guard', () => {
	const { container } = renderForm({
		canViewEconomy: true,
		data: { name: 'Ana', birthday_label: '' },
	})

	assert.equal(container.querySelector('.birthday-badge'), null)
	assert.ok(screen.getByText('Historial economico no disponible.'))
})
