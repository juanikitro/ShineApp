import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./ExpenseClassificationForm', () => ({
	ExpenseClassificationForm: ({ onCancel }: { onCancel: () => void }) => (
		<button onClick={onCancel} type="button">
			Cancelar clasificacion
		</button>
	),
}))
vi.mock('./CashCategoryForm', () => ({
	CashCategoryForm: ({ onCancel }: { onCancel: () => void }) => (
		<button onClick={onCancel} type="button">
			Cancelar categoria
		</button>
	),
}))

import {
	renderCashCategoryModal,
	renderExpenseClassificationModal,
} from './cash-settings-modal-renderers'

afterEach(cleanup)

const formProps = {} as never

test('renderExpenseClassificationModal preserves title and reset-on-close', () => {
	const calls: string[] = []
	render(
		renderExpenseClassificationModal({
			title: 'Editar subcategoria de caja',
			onReset: () => {
				calls.push('reset')
			},
			onClose: () => {
				calls.push('close')
			},
			formProps,
		}),
	)

	assert.ok(screen.getByRole('dialog', { name: 'Editar subcategoria de caja' }))
	fireEvent.click(screen.getByRole('button', { name: 'Cancelar clasificacion' }))
	assert.deepEqual(calls, ['reset', 'close'])
})

test('renderCashCategoryModal preserves title and reset-on-close', () => {
	const calls: string[] = []
	render(
		renderCashCategoryModal({
			title: 'Nueva categoria de caja',
			onReset: () => {
				calls.push('reset')
			},
			onClose: () => {
				calls.push('close')
			},
			formProps,
		}),
	)

	assert.ok(screen.getByRole('dialog', { name: 'Nueva categoria de caja' }))
	fireEvent.click(screen.getByRole('button', { name: 'Cancelar categoria' }))
	assert.deepEqual(calls, ['reset', 'close'])
})
