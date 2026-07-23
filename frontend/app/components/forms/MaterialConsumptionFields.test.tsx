import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialConsumptionFields } from './MaterialConsumptionFields'

afterEach(cleanup)

function renderFields(overrides = {}) {
	const setConsumptionForm = vi.fn()
	const onOpenMaterial = vi.fn()
	const onChangeMode = vi.fn()
	const props = {
		consumptionForm: {
			mode: 'direct',
			work_order: '12',
			material: '7',
			open_unit: '',
			consumed_at: '2026-07-22',
			quantity: '2',
			observations: 'Detalle',
		},
		setConsumptionForm,
		showWorkOrder: true,
		workOrderOptions: [{ value: '12', label: 'Orden #12' }],
		materialOptions: [{ value: '7', label: 'Shampoo' }],
		openMaterialUnitOptions: [{ value: '4', label: 'Shampoo abierta' }],
		materialClassName: 'consumption-material-flash',
		openUnitClassName: 'consumption-unit-flash',
		onOpenMaterial,
		selectedConsumptionMaterial: {
			id: 7,
			stock_quantity: '10',
			unit: 'ml',
			estimated_unit_cost: '4',
		},
		selectedOpenUnit: null,
		materials: [{ id: 7, unit: 'ml' }],
		onChangeMode,
		...overrides,
	} as Parameters<typeof MaterialConsumptionFields>[0]

	return {
		...render(<MaterialConsumptionFields {...props} />),
		setConsumptionForm,
		onOpenMaterial,
		onChangeMode,
	}
}

test('MaterialConsumptionFields preserves direct consumption fields and callbacks', () => {
	const { container, setConsumptionForm, onChangeMode } = renderFields()

	assert.ok(screen.getByRole('combobox', { name: 'Reserva/trabajo' }))
	assert.ok(container.querySelector('.consumption-material-flash'))
	assert.ok(screen.getByText(/Stock disponible/))
	assert.ok(screen.getByText('Consumo directo').classList.contains('selected'))
	fireEvent.click(screen.getByRole('button', { name: 'Unidad abierta' }))
	assert.deepEqual(onChangeMode.mock.calls, [['open_unit']])

	fireEvent.change(screen.getByLabelText('Cantidad'), {
		target: { value: '3' },
	})
	assert.equal(setConsumptionForm.mock.calls[0][0].quantity, '3')
})

test('MaterialConsumptionFields preserves open-unit presentation and no-work-order variant', () => {
	const { container, setConsumptionForm, onChangeMode } = renderFields({
		consumptionForm: {
			mode: 'open_unit',
			work_order: '',
			material: '',
			open_unit: '4',
			consumed_at: '2026-07-22',
			quantity: '',
			observations: '',
		},
		showWorkOrder: false,
		selectedConsumptionMaterial: null,
		selectedOpenUnit: {
			material: 7,
			material_name: 'Shampoo',
			opened_at: '2026-07-20',
			consumptions_count: 2,
			stock_quantity_to_decrement: '3',
		},
	})

	assert.equal(screen.queryByRole('combobox', { name: 'Reserva/trabajo' }), null)
	assert.ok(container.querySelector('.consumption-unit-flash'))
	assert.ok(screen.getByText(/Shampoo abierta el/))
	assert.equal(screen.queryByLabelText('Cantidad'), null)
	assert.ok(
		screen
			.getByRole('button', { name: 'Unidad abierta' })
			.classList.contains('selected'),
	)
	fireEvent.click(screen.getByRole('button', { name: 'Consumo directo' }))
	assert.deepEqual(onChangeMode.mock.calls, [['direct']])

	fireEvent.change(screen.getByLabelText('Fecha'), {
		target: { value: '2026-07-23' },
	})
	assert.equal(setConsumptionForm.mock.calls[0][0].consumed_at, '2026-07-23')
})
