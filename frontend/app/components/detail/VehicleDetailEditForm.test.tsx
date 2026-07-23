import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { VehicleDetailEditForm } from './VehicleDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onUpdateBrand = vi.fn()
	const focusField = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string) => focusHandler)
	const props = {
		data: {
			customer: '1',
			vehicle_type: 'auto',
			brand: 'Ford',
			model: 'Fiesta',
			color: 'Rojo',
			license_plate: 'AA123BB',
			notes: 'Sin rayas',
		},
		onSubmit,
		onPatch,
		customerOptions: [
			{ value: '1', label: 'Ana' },
			{ value: '2', label: 'Beto' },
		],
		brandOptions: [
			{ value: 'Ford', label: 'Ford' },
			{ value: 'Toyota', label: 'Toyota' },
		],
		modelOptions: [
			{ value: 'Fiesta', label: 'Fiesta' },
			{ value: 'Focus', label: 'Focus' },
		],
		onUpdateBrand,
		focusField,
		focusNextOnEnter,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof VehicleDetailEditForm>[0]

	return {
		...render(<VehicleDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onUpdateBrand,
		focusField,
		focusNextOnEnter,
		focusHandler,
	}
}

test('VehicleDetailEditForm preserves field patches, focus flow and actions', () => {
	const {
		container,
		onSubmit,
		onPatch,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()
	const color = screen.getByLabelText('Color')

	assert.equal(color.getAttribute('data-focus-key'), 'detail.vehicle.color')
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['detail.vehicle.license_plate'],
		['detail.vehicle.notes'],
	])
	fireEvent.change(color, { target: { value: 'Azul' } })
	fireEvent.change(screen.getByLabelText('Patente'), {
		target: { value: 'AB456CD' },
	})
	assert.deepEqual(onPatch.mock.calls, [
		[{ color: 'Azul' }],
		[{ license_plate: 'AB456CD' }],
	])
	fireEvent.keyDown(color, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('VehicleDetailEditForm preserves selection callbacks and empty-brand model guard', () => {
	const { onPatch, onUpdateBrand, focusField } = renderForm()

	fireEvent.click(screen.getByRole('combobox', { name: 'Cliente' }))
	fireEvent.click(screen.getByRole('option', { name: 'Beto' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Marca' }))
	fireEvent.click(screen.getByRole('option', { name: 'Toyota' }))
	fireEvent.click(screen.getByRole('combobox', { name: 'Modelo' }))
	fireEvent.click(screen.getByRole('option', { name: 'Focus' }))

	assert.deepEqual(onPatch.mock.calls, [
		[{ customer: '2' }],
		[{ model: 'Focus' }],
	])
	assert.deepEqual(onUpdateBrand.mock.calls, [['Toyota']])
	assert.deepEqual(focusField.mock.calls, [
		['detail.vehicle.brand'],
		['detail.vehicle.color'],
	])

	cleanup()
	renderForm({ data: { customer: '1', brand: '', model: '' } })
	assert.equal(
		(screen.getByRole('combobox', { name: 'Modelo' }) as HTMLButtonElement)
			.disabled,
		true,
	)
})
