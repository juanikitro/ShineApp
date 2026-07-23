import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { ServiceDetailEditForm } from './ServiceDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const onSectorChange = vi.fn()
	const onBasePriceChange = vi.fn()
	const props = {
		data: {
			name: 'Lavado premium',
			icon: 'sparkles',
			sector: '1',
			base_price: '5000',
			duration_minutes: 60,
			price_auto: '5000',
			estimated_material_cost: '500',
			notes: 'Incluye cera',
		},
		onSubmit,
		onPatch,
		sectorOptions: [{ value: '1', label: 'Lavado' }],
		onSectorChange,
		onBasePriceChange,
		priceTypes: [{ value: 'auto', label: 'Auto', priceField: 'price_auto' }],
		materialsEditor: <div>Materiales</div>,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof ServiceDetailEditForm>[0]

	return {
		...render(<ServiceDetailEditForm {...props} />),
		onSubmit,
		onPatch,
		onSectorChange,
		onBasePriceChange,
	}
}

test('ServiceDetailEditForm preserves fields, delegated pricing callbacks and actions', () => {
	const {
		container,
		onSubmit,
		onPatch,
		onSectorChange,
		onBasePriceChange,
	} = renderForm()

	assert.ok(screen.getByText('Materiales'))
	assert.ok(screen.getByText(/se muestra con un “~”/))
	fireEvent.change(screen.getByLabelText('Nombre'), {
		target: { value: 'Lavado full' },
	})
	fireEvent.change(screen.getByLabelText('Precio base'), {
		target: { value: '6000' },
	})
	fireEvent.change(screen.getByLabelText('Precio Auto'), {
		target: { value: '6500' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Sector' }))
	fireEvent.click(screen.getByRole('option', { name: 'Lavado' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ name: 'Lavado full' }],
		[{ price_auto: '6500' }],
	])
	assert.deepEqual(onBasePriceChange.mock.calls, [['6000']])
	assert.deepEqual(onSectorChange.mock.calls, [['1']])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('ServiceDetailEditForm preserves dynamic vehicle price fields', () => {
	renderForm({
		priceTypes: [
			{ value: 'auto', label: 'Auto', priceField: 'price_auto' },
			{ value: 'moto', label: 'Moto', priceField: 'price_moto' },
		],
	})

	assert.ok(screen.getByLabelText('Precio Auto'))
	assert.ok(screen.getByLabelText('Precio Moto'))
})
