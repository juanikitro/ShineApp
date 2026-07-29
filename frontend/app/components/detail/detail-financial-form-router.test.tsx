import assert from 'node:assert/strict'
import { cleanup, render, within } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	cashMovement: null as Record<string, any> | null,
	debt: null as Record<string, any> | null,
	debtPayment: null as Record<string, any> | null,
}))

vi.mock('./financial-detail-edit-form-renderers', () => ({
	renderCashMovementDetailEditor: (props: Record<string, any>) => {
		capturedProps.cashMovement = props
		return <span>Editor de caja</span>
	},
	renderDebtDetailEditor: (props: Record<string, any>) => {
		capturedProps.debt = props
		return <span>Editor de deuda</span>
	},
	renderDebtPaymentDetailEditor: (props: Record<string, any>) => {
		capturedProps.debtPayment = props
		return <span>Editor de pago de deuda</span>
	},
}))

import { renderFinancialDetailFormRouter } from './detail-financial-form-router'

afterEach(cleanup)

function renderRouter(kind: string) {
	const editData = { id: 'edited', category: 'Insumos' }
	const cashMovements = [{ id: 'cash-1' }]
	const suppliers = [{ id: 'supplier-1', name: 'Proveedor Uno' }]
	const debts = [{ id: 'debt-1' }]
	const supplierOptions = [{ value: 'supplier-1', label: 'Proveedor Uno' }]
	const debtOptions = [{ value: 'debt-1', label: 'Deuda Uno' }]
	const validExpenseSubcategory = vi.fn(() => '')
	const onCreateExpenseSubcategory = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const result = renderFinancialDetailFormRouter({
		detail: { kind, data: { id: 'original' }, editData },
		onSubmit: () => {},
		onPatch: () => {},
		cashIncomeCategoryValues: ['Lavado'],
		cashExpenseCategoryValues: ['Insumos'],
		expenseCategoryTree: { Insumos: ['Repuestos'] },
		cashMovements,
		validExpenseSubcategory,
		onCreateExpenseSubcategory,
		supplierOptions,
		suppliers,
		debts,
		debtStatusLabels: { pending: 'Pendiente' },
		debtOptions,
		debtPaymentMethodLabels: { cash: 'Efectivo' },
		defaultPaymentMethod: 'cash',
		renderActions,
	} as Parameters<typeof renderFinancialDetailFormRouter>[0])

	return {
		cashMovements,
		debtOptions,
		debts,
		editData,
		onCreateExpenseSubcategory,
		renderActions,
		result,
		supplierOptions,
		suppliers,
		validExpenseSubcategory,
	}
}

test('financial detail router dispatches each financial editor without a mounted wrapper', () => {
	for (const [kind, text] of [
		['cash-movement', 'Editor de caja'],
		['debt', 'Editor de deuda'],
		['debt-payment', 'Editor de pago de deuda'],
	] as const) {
		const { result } = renderRouter(kind)
		const rendered = render(result)
		assert.ok(within(rendered.container).getByText(text))
		rendered.unmount()
	}
})

test('financial detail router preserves branch data, supporting collections and actions', () => {
	const cashMovement = renderRouter('cash-movement')
	const cashMovementProps = capturedProps.cashMovement as Record<string, any> | null
	assert.ok(cashMovementProps)
	assert.equal(cashMovementProps.data, cashMovement.editData)
	assert.equal(cashMovementProps.cashMovements, cashMovement.cashMovements)
	assert.equal(
		cashMovementProps.onCreateExpenseSubcategory,
		cashMovement.onCreateExpenseSubcategory,
	)
	assert.equal(cashMovementProps.renderActions, cashMovement.renderActions)

	const debt = renderRouter('debt')
	const debtProps = capturedProps.debt as Record<string, any> | null
	assert.ok(debtProps)
	assert.equal(debtProps.data, debt.editData)
	assert.equal(debtProps.supplierOptions, debt.supplierOptions)
	assert.equal(debtProps.suppliers, debt.suppliers)
	assert.equal(debtProps.debts, debt.debts)
	assert.equal(debtProps.renderActions, debt.renderActions)

	const debtPayment = renderRouter('debt-payment')
	const debtPaymentProps = capturedProps.debtPayment as Record<string, any> | null
	assert.ok(debtPaymentProps)
	assert.equal(debtPaymentProps.data, debtPayment.editData)
	assert.equal(debtPaymentProps.debtOptions, debtPayment.debtOptions)
	assert.equal(debtPaymentProps.renderActions, debtPayment.renderActions)
	assert.equal(renderRouter('tool').result, undefined)
})
