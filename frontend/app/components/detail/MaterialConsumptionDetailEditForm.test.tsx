import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialConsumptionDetailEditForm } from './MaterialConsumptionDetailEditForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const onPatch = vi.fn()
	const props = {
		data: {
			work_order: '1',
			material: '2',
			consumed_at: '2026-07-22',
			quantity: '3',
			observations: 'Detalle',
		},
		onSubmit,
		onPatch,
		workOrderOptions: [{ value: '1', label: 'Reserva 1' }],
		materialOptions: [{ value: '2', label: 'Shampoo' }],
		openUnitConsumption: false,
		actions: <button type="submit">Editar</button>,
		...overrides,
	} as Parameters<typeof MaterialConsumptionDetailEditForm>[0]

	return {
		...render(<MaterialConsumptionDetailEditForm {...props} />),
		onSubmit,
		onPatch,
	}
}

test('MaterialConsumptionDetailEditForm preserves ordinary consumption fields and actions', () => {
	const { container, onSubmit, onPatch } = renderForm()

	assert.ok(
		screen.getByText(
			'El costo estimado se recalcula si cambia el material o la cantidad.',
		),
	)
	fireEvent.change(screen.getByLabelText('Cantidad'), {
		target: { value: '4' },
	})
	fireEvent.click(screen.getByRole('combobox', { name: 'Material' }))
	fireEvent.click(screen.getByRole('option', { name: 'Shampoo' }))
	assert.deepEqual(onPatch.mock.calls, [
		[{ quantity: '4' }],
		[{ material: '2' }],
	])
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialConsumptionDetailEditForm preserves open-unit disclosure and hides direct stock fields', () => {
	renderForm({
		data: { work_order: '1', open_unit: '7', open_unit_label: 'Bidon 7' },
		openUnitConsumption: true,
	})

	assert.ok(screen.getByText('Bidon 7'))
	assert.ok(screen.getByText(/No descuenta stock directo\./))
	assert.ok(
		screen.getByText(
			'El costo y stock se imputan cuando se finaliza la unidad abierta.',
		),
	)
	assert.equal(screen.queryByRole('combobox', { name: 'Material' }), null)
	assert.equal(screen.queryByLabelText('Cantidad'), null)
})
