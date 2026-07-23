import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { QuickServiceForm } from './QuickServiceForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setServiceForm = vi.fn()
	const onSectorChange = vi.fn()
	const onBasePriceChange = vi.fn()
	const props = {
		serviceForm: {
			name: 'Lavado completo',
			icon: '',
			sector: '1',
			base_price: '10000',
			duration_minutes: '60',
			duration_unit: 'minutes',
			price_auto: '10000',
		},
		setServiceForm,
		onSubmit,
		sectorOptions: [{ value: '1', label: 'Lavado' }],
		onSectorChange,
		onBasePriceChange,
		submitting: false,
		...overrides,
	} as Parameters<typeof QuickServiceForm>[0]

	return {
		...render(<QuickServiceForm {...props} />),
		onSubmit,
		setServiceForm,
		onSectorChange,
		onBasePriceChange,
	}
}

test('QuickServiceForm preserves service fields, page callbacks and submit behavior', () => {
	const {
		container,
		onSubmit,
		setServiceForm,
		onSectorChange,
		onBasePriceChange,
	} = renderForm()
	const name = screen.getByLabelText('Nombre')

	assert.equal(name.getAttribute('list'), 'service-name-options')
	assert.equal(screen.getByLabelText('Duracion estimada').getAttribute('min'), '1')

	fireEvent.change(name, { target: { value: 'Lavado premium' } })
	assert.deepEqual(setServiceForm.mock.calls[0][0], {
		name: 'Lavado premium',
		icon: '',
		sector: '1',
		base_price: '10000',
		duration_minutes: '60',
		duration_unit: 'minutes',
		price_auto: '10000',
	})

	fireEvent.click(screen.getByRole('combobox', { name: 'Sector' }))
	fireEvent.click(screen.getByRole('option', { name: 'Lavado' }))
	assert.deepEqual(onSectorChange.mock.calls, [['1']])

	fireEvent.change(screen.getByLabelText('Precio base'), {
		target: { value: '12000' },
	})
	assert.deepEqual(onBasePriceChange.mock.calls, [['12000']])

	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('QuickServiceForm keeps the pending submit presentation', () => {
	renderForm({ submitting: true })
	const button = screen.getByRole('button', {
		name: 'Crear servicio',
	}) as HTMLButtonElement

	assert.equal(button.disabled, true)
	assert.equal(button.getAttribute('aria-busy'), 'true')
	assert.ok(button.querySelector('.button-spinner'))
})
