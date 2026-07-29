import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { WorkOrderMaterialConsumptionForm } from './WorkOrderMaterialConsumptionForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const props = {
		onSubmit,
		info: <>Ana - Ford Fiesta - Lavado completo</>,
		fields: <div data-testid="consumption-fields">Campos</div>,
		submitting: false,
		...overrides,
	} as Parameters<typeof WorkOrderMaterialConsumptionForm>[0]

	return {
		...render(<WorkOrderMaterialConsumptionForm {...props} />),
		onSubmit,
	}
}

test('WorkOrderMaterialConsumptionForm preserves information, fields and submit behavior', () => {
	const { container, onSubmit } = renderForm()

	assert.equal(screen.getByText('Ana - Ford Fiesta - Lavado completo').closest('.info-note') !== null, true)
	assert.ok(screen.getByTestId('consumption-fields'))
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('WorkOrderMaterialConsumptionForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Registrar consumo',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
