import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialConsumptionForm } from './MaterialConsumptionForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const props = {
		onSubmit,
		fields: <div data-testid="consumption-fields">Campos</div>,
		submitLabel: 'Registrar consumo',
		submitting: false,
		...overrides,
	} as Parameters<typeof MaterialConsumptionForm>[0]

	return {
		...render(<MaterialConsumptionForm {...props} />),
		onSubmit,
	}
}

test('MaterialConsumptionForm preserves supplied fields, label and submit behavior', () => {
	const { container, onSubmit } = renderForm()

	assert.ok(screen.getByTestId('consumption-fields'))
	assert.ok(screen.getByRole('button', { name: 'Registrar consumo' }))
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialConsumptionForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Registrar consumo',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
