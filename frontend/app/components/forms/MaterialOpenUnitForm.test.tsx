import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialOpenUnitForm } from './MaterialOpenUnitForm'

afterEach(cleanup)

function renderForm(overrides = {}) {
	const onSubmit = vi.fn((event) => event.preventDefault())
	const setOpenUnitForm = vi.fn()
	const onOpenMaterial = vi.fn()
	const focusField = vi.fn()
	const focusHandler = vi.fn()
	const focusNextOnEnter = vi.fn((_: string) => focusHandler)
	const props = {
		submitLabel: 'Abrir unidad',
		openUnitForm: {
			material: '7',
			opened_by_work_order: '12',
			opened_at: '2026-07-22',
			stock_quantity_to_decrement: '3',
			observations: 'Uso parcial',
		},
		setOpenUnitForm,
		onSubmit,
		materialOptions: [{ value: '7', label: 'Shampoo' }],
		workOrderOptions: [{ value: '12', label: 'Orden #12' }],
		materialClassName: 'open-unit-flash',
		onOpenMaterial,
		selectedMaterial: {
			id: 7,
			unit: 'ml',
			stock_quantity: '900',
			estimated_unit_cost: '15',
		},
		focusField,
		focusNextOnEnter,
		submitting: false,
		...overrides,
	} as Parameters<typeof MaterialOpenUnitForm>[0]

	return {
		...render(<MaterialOpenUnitForm {...props} />),
		onSubmit,
		setOpenUnitForm,
		onOpenMaterial,
		focusField,
		focusNextOnEnter,
		focusHandler,
	}
}

test('MaterialOpenUnitForm preserves stock details, fields, focus and submit behavior', () => {
	const {
		container,
		onSubmit,
		setOpenUnitForm,
		focusNextOnEnter,
		focusHandler,
	} = renderForm()
	const openedAt = screen.getByLabelText('Fecha de apertura')

	assert.ok(container.querySelector('.open-unit-material-info'))
	assert.ok(screen.getByText(/Stock actual/))
	assert.ok(screen.getByText(/Abrir una unidad no descuenta stock/))
	assert.ok(screen.getByText(/Se descuenta del stock en ml al finalizar/))
	assert.deepEqual(focusNextOnEnter.mock.calls, [
		['material-open-unit.quantity'],
		['material-open-unit.notes'],
	])

	fireEvent.change(openedAt, { target: { value: '2026-07-23' } })
	assert.equal(setOpenUnitForm.mock.calls[0][0].opened_at, '2026-07-23')
	fireEvent.keyDown(openedAt, { key: 'Enter' })
	assert.equal(focusHandler.mock.calls.length, 1)
	fireEvent.submit(container.querySelector('form')!)
	assert.equal(onSubmit.mock.calls.length, 1)
})

test('MaterialOpenUnitForm preserves selectors, fallback hint and loading state', () => {
	const { setOpenUnitForm, onOpenMaterial, focusField } = renderForm({
		selectedMaterial: null,
		submitting: true,
	})
	const materialTrigger = screen.getByRole('combobox', { name: 'Material' })

	assert.ok(screen.getByText('Se descuenta del stock al finalizar la unidad'))
	fireEvent.click(materialTrigger)
	fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
	assert.equal(onOpenMaterial.mock.calls.length, 1)
	fireEvent.click(materialTrigger)
	fireEvent.click(screen.getByRole('option', { name: 'Shampoo' }))
	assert.equal(setOpenUnitForm.mock.calls[0][0].material, '7')
	assert.deepEqual(focusField.mock.calls, [
		['material-open-unit.work_order', true],
	])

	const button = screen.getByRole('button', {
		name: 'Abrir unidad',
	}) as HTMLButtonElement
	assert.equal(button.disabled, true)
})
