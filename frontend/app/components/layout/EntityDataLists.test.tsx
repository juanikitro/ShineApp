import assert from 'node:assert/strict'
import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { EntityDataLists } from './EntityDataLists'

afterEach(cleanup)

function renderDataLists(overrides = {}) {
	const props = {
		customerNameValues: ['Ana'],
		customerPhoneValues: ['111'],
		customerEmailValues: ['ana@example.com'],
		vehiclePlateValues: ['AB123CD'],
		vehicleColorValues: ['Rojo'],
		serviceNameValues: ['Lavado'],
		materialNameValues: ['Cera'],
		materialCategoryValues: ['Limpieza'],
		materialUnitValues: ['Unidad'],
		supplierNameValues: ['Proveedor'],
		supplierLegalNameValues: ['Proveedor SA'],
		supplierCategoryValues: ['Insumos'],
		supplierTaxConditionValues: ['RI'],
		toolNameValues: ['Aspiradora'],
		debtConceptValues: ['Factura'],
		debtCreditorValues: ['Acreedor'],
		cashCategoryValues: ['General'],
		cashIncomeCategoryValues: ['Ventas'],
		cashExpenseCategoryValues: ['Servicios'],
		selectedMovementSubcategoryValues: ['Lavado'],
		debtExpenseSubcategoryValues: ['Proveedor'],
		cashSubcategoryValues: ['Fallback'],
		settingsClassificationSubcategoryOptions: [{ value: 'Configurada' }],
		...overrides,
	} as Parameters<typeof EntityDataLists>[0]

	return render(<EntityDataLists {...props} />)
}

function optionValues(container: HTMLElement, id: string) {
	return Array.from(
		container.querySelectorAll<HTMLOptionElement>(`datalist#${id} option`),
	).map((option) => option.value)
}

test('EntityDataLists preserves every form datalist and selected subcategory values', () => {
	const { container } = renderDataLists()

	assert.equal(container.querySelectorAll('datalist').length, 22)
	assert.deepEqual(optionValues(container, 'customer-name-options'), ['Ana'])
	assert.deepEqual(optionValues(container, 'cash-subcategory-options'), ['Lavado'])
	assert.deepEqual(
		optionValues(container, 'debt-expense-subcategory-options'),
		['Proveedor'],
	)
	assert.deepEqual(
		optionValues(container, 'settings-classification-subcategory-options'),
		['Configurada'],
	)
})

test('EntityDataLists preserves cash subcategory fallbacks when no scoped values exist', () => {
	const { container } = renderDataLists({
		selectedMovementSubcategoryValues: [],
		debtExpenseSubcategoryValues: [],
	})

	assert.deepEqual(optionValues(container, 'cash-subcategory-options'), ['Fallback'])
	assert.deepEqual(
		optionValues(container, 'debt-expense-subcategory-options'),
		['Fallback'],
	)
})
