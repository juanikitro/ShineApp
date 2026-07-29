import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { HistoricalMaterialUsageForm } from './HistoricalMaterialUsageForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setHistoricalUsageForm = vi.fn()
	const props = {
		submitLabel: 'Registrar consumo',
		historicalUsageForm: {
			material: '7',
			service: '3',
			reservations: ['1'],
			opened_at: '2026-07-20',
			finished_at: '2026-07-20',
			stock_quantity_to_decrement: '3',
			update_recipe: false,
			observations: 'Prueba',
		},
		setHistoricalUsageForm,
		onSubmit,
		materialOptions: [{ value: '7', label: 'Shampoo' }],
		serviceOptions: [{ value: '3', label: 'Lavado' }],
		materials: [{ id: 7, unit: 'ml', estimated_unit_cost: '2' }],
		reservations: [
			{
				id: 1,
				service: 3,
				day: '2026-07-20',
				status: 'confirmed',
				customer_name: 'Ana',
			},
			{
				id: 2,
				service: 3,
				day: '2026-07-22',
				status: 'confirmed',
				customer_name: 'Beto',
				vehicle_label: 'Fiesta',
			},
		],
		today: '2026-07-22',
		submitting: false,
		...overrides,
	} as Parameters<typeof HistoricalMaterialUsageForm>[0]

	return {
		...render(<HistoricalMaterialUsageForm {...props} />),
		onSubmit,
		setHistoricalUsageForm,
	}
}

test('HistoricalMaterialUsageForm preserves historical reservation selection and summary', () => {
	const { container, onSubmit, setHistoricalUsageForm } = renderForm()

	assert.ok(screen.getByText(/no descuenta stock actual/))
	assert.ok(screen.getByText(/Rendimiento estimado/))
	assert.ok(screen.getByText(/3 ml en 1 servicio/))
	assert.ok(container.querySelector('.usage-reservation-list'))
	fireEvent.click(screen.getByRole('checkbox', { name: /2026-07-22 - Beto/ }))
	assert.deepEqual(setHistoricalUsageForm.mock.calls[0][0], {
		material: '7',
		service: '3',
		reservations: ['1', '2'],
		opened_at: '2026-07-20',
		finished_at: '2026-07-22',
		stock_quantity_to_decrement: '3',
		update_recipe: false,
		observations: 'Prueba',
	})
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('HistoricalMaterialUsageForm preserves empty historical state and disabled submit', () => {
	renderForm({
		historicalUsageForm: {
			material: '',
			service: '3',
			reservations: [],
			opened_at: '',
			finished_at: '',
			stock_quantity_to_decrement: '',
			update_recipe: false,
			observations: '',
		},
		reservations: [],
	})

	assert.ok(screen.getByText('No hay reservas pasadas de este servicio.'))
	assert.equal(screen.queryByText(/Rendimiento estimado/), null)
	const button = screen.getByRole('button', {
		name: 'Registrar consumo',
	}) as HTMLButtonElement
	assert.equal(button.disabled, true)
})
