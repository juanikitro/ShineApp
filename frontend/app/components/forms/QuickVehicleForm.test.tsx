import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuickVehicleForm } from './QuickVehicleForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setVehicleForm = vi.fn()
	const onAddCustomer = vi.fn()
	const updateVehicleBrand = vi.fn()
	const props = {
		vehicleForm: {
			customer: '',
			vehicle_type: 'auto',
			brand: 'Ford',
			model: 'Fiesta',
			color: 'Rojo',
			license_plate: 'AA123BB',
		},
		setVehicleForm,
		onSubmit,
		customerOptions: [{ value: '1', label: 'Ana' }],
		vehicleBrandSelectOptions: [{ value: 'Ford', label: 'Ford' }],
		vehicleModelSelectOptions: [{ value: 'Fiesta', label: 'Fiesta' }],
		customerClassName: 'flash-field',
		onAddCustomer,
		updateVehicleBrand,
		submitting: false,
		...overrides,
	} as Parameters<typeof QuickVehicleForm>[0]

	return {
		...render(<QuickVehicleForm {...props} />),
		onSubmit,
		setVehicleForm,
		onAddCustomer,
		updateVehicleBrand,
	}
}

test('QuickVehicleForm preserves selectors, state updates and submit behavior', () => {
	const {
		container,
		onSubmit,
		setVehicleForm,
		onAddCustomer,
		updateVehicleBrand,
	} = renderForm()
	const customer = screen.getByRole('combobox', { name: 'Cliente' })
	const color = screen.getByLabelText('Color')

	assert.equal(customer.closest('.flash-field') !== null, true)
	assert.equal(
		container.querySelector('[name="quick_vehicle_customer"]')?.getAttribute('type'),
		'hidden',
	)

	fireEvent.click(customer)
	fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
	assert.equal(onAddCustomer.mock.calls.length, 1)

	fireEvent.change(color, { target: { value: 'Azul' } })
	assert.deepEqual(setVehicleForm.mock.calls[0][0], {
		customer: '',
		vehicle_type: 'auto',
		brand: 'Ford',
		model: 'Fiesta',
		color: 'Azul',
		license_plate: 'AA123BB',
	})

	fireEvent.click(screen.getByRole('combobox', { name: 'Marca' }))
	fireEvent.click(screen.getByRole('option', { name: 'Ford' }))
	assert.deepEqual(updateVehicleBrand.mock.calls, [['Ford']])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuickVehicleForm preserves blank-brand model state and pending submit presentation', () => {
	renderForm({
		vehicleForm: {
			customer: '',
			vehicle_type: 'auto',
			brand: '',
			model: '',
			color: '',
			license_plate: '',
		},
		submitting: true,
	})
	const model = screen.getByRole('combobox', { name: 'Modelo' }) as HTMLButtonElement
	const button = screen.getByRole('button', {
		name: 'Crear vehiculo',
	}) as HTMLButtonElement

	assert.equal(model.disabled, true)
	assert.equal(model.textContent?.includes('Elegir marca'), true)
	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
})
