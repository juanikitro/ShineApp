import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { EmployeeForm } from './EmployeeForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setEmployeeForm = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string) => focusHandler)
	const props = {
		submitLabel: 'Crear empleado',
		employeeForm: {
			username: 'ana',
			email: 'ana@example.com',
			password: 'secreto',
		},
		setEmployeeForm,
		onSubmit,
		focusNextOnEnter,
		submitting: false,
		...overrides,
	} as Parameters<typeof EmployeeForm>[0]

	return {
		...render(<EmployeeForm {...props} />),
		onSubmit,
		setEmployeeForm,
		focusNextOnEnter,
		focusHandler,
	}
}

test('EmployeeForm preserves employee fields, focus flow and submit behavior', () => {
	const {
		container,
		onSubmit,
		setEmployeeForm,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()
	const username = screen.getByLabelText('Usuario')
	const password = screen.getByLabelText('Contrasena inicial')

	assert.equal(username.getAttribute('data-focus-key'), 'employee.username')
	assert.equal(username.getAttribute('autocomplete'), 'username')
	assert.equal(password.getAttribute('type'), 'password')
	assert.equal(password.getAttribute('minlength'), '4')
	assert.deepEqual(focusNextOnEnter.mock.calls.map(([key]) => key), [
		'employee.email',
		'employee.password',
	])

	fireEvent.change(username, { target: { value: 'beto' } })
	assert.deepEqual(setEmployeeForm.mock.calls[0][0], {
		username: 'beto',
		email: 'ana@example.com',
		password: 'secreto',
	})
	fireEvent.keyDown(username, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('EmployeeForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Crear empleado',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
