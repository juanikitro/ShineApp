import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	cashLoadTabOptions,
	renderCashLoadModal,
	type CashLoadTab,
} from './cash-load-modal-renderer'

afterEach(cleanup)

function renderLayer(cashLoadTab: CashLoadTab) {
	const tabChanges: CashLoadTab[] = []
	const renderedForms: string[] = []
	const result = render(
		renderCashLoadModal({
			cashLoadTab,
			cashLoadTabOptions,
			onTabChange: (tab) => {
				tabChanges.push(tab)
			},
			onClose: () => {},
			renderCashMovementForm: () => {
				renderedForms.push('cash-movement')
				return <span>Movimiento de caja</span>
			},
			renderPaymentForm: () => {
				renderedForms.push('payment')
				return <span>Pago de trabajo</span>
			},
			renderDebtPaymentForm: () => {
				renderedForms.push('debt-payment')
				return <span>Pago de deuda</span>
			},
		}),
	)
	return { ...result, tabChanges, renderedForms }
}

test('renderCashLoadModal preserves the selected cash form', () => {
	for (const [tab, formText] of [
		['cash-movement', 'Movimiento de caja'],
		['payment', 'Pago de trabajo'],
		['debt-payment', 'Pago de deuda'],
	] as const) {
		const { unmount, renderedForms } = renderLayer(tab)
		assert.ok(screen.getByRole('dialog', { name: 'Cargar movimiento' }))
		assert.ok(screen.getByText(formText))
		assert.deepEqual(renderedForms, [tab])
		unmount()
	}
})

test('renderCashLoadModal forwards tab changes', () => {
	const { tabChanges } = renderLayer('cash-movement')

	fireEvent.click(screen.getByRole('tab', { name: 'Cobrar trabajo' }))
	assert.deepEqual(tabChanges, ['payment'])
})

test('cash load tab options preserve labels and their selected form order', () => {
	assert.deepEqual(cashLoadTabOptions, [
		{ value: 'cash-movement', label: 'Movimiento normal' },
		{ value: 'debt-payment', label: 'Pagar deuda' },
		{ value: 'payment', label: 'Cobrar trabajo' },
	])
})
