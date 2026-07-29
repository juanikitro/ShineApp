import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuickCustomerForm } from './QuickCustomerForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setCustomerForm = vi.fn()
	const props = {
		customerForm: {
			name: 'Ana',
			phone: '3624000000',
			email: 'ana@example.com',
			tax_id: '20123456789',
			billing_address: 'Av. Siempre Viva 123',
			birthday_day: '12',
			birthday_month: '7',
		},
		setCustomerForm,
		onSubmit,
		submitting: false,
		...overrides,
	} as Parameters<typeof QuickCustomerForm>[0]

	return {
		...render(<QuickCustomerForm {...props} />),
		onSubmit,
		setCustomerForm,
	}
}

test('QuickCustomerForm preserves customer fields, birthday patches and submit behavior', () => {
	const { container, onSubmit, setCustomerForm } = renderForm()
	const name = screen.getByLabelText('Nombre')
	const phone = screen.getByLabelText('Telefono')
	const day = screen.getByLabelText('Dia')

	assert.equal(name.getAttribute('name'), 'quick_customer_name')
	assert.equal(name.getAttribute('autocomplete'), 'name')
	assert.equal(phone.getAttribute('inputmode'), 'tel')
	assert.equal(day.getAttribute('name'), 'quick_customer_birthday_day')

	fireEvent.change(name, { target: { value: 'Beto' } })
	fireEvent.change(day, { target: { value: '13' } })
	assert.deepEqual(setCustomerForm.mock.calls, [
		[
			{
				name: 'Beto',
				phone: '3624000000',
				email: 'ana@example.com',
				tax_id: '20123456789',
				billing_address: 'Av. Siempre Viva 123',
				birthday_day: '12',
				birthday_month: '7',
			},
		],
		[
			{
				name: 'Ana',
				phone: '3624000000',
				email: 'ana@example.com',
				tax_id: '20123456789',
				billing_address: 'Av. Siempre Viva 123',
				birthday_day: '13',
				birthday_month: '7',
			},
		],
	])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuickCustomerForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Crear cliente',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
