import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./DebtForm', () => ({ DebtForm: () => <span>Formulario de deuda</span> }))
vi.mock('./FixedExpenseForm', () => ({
	FixedExpenseForm: () => <span>Formulario de gasto fijo</span>,
}))
vi.mock('./DebtPaymentForm', () => ({
	DebtPaymentForm: () => <span>Formulario de pago de deuda</span>,
}))

import {
	renderDebtModal,
	renderDebtPaymentModal,
	renderFixedExpenseModal,
} from './finance-form-modal-renderers'

afterEach(cleanup)

const formProps = {} as never

test('finance modal renderers preserve titles and form branches', () => {
	for (const [renderModal, title, formText] of [
		[
			() => renderDebtModal({ onClose: () => {}, formProps }),
			'Nueva deuda',
			'Formulario de deuda',
		],
		[
			() =>
				renderFixedExpenseModal({
					title: 'Editar gasto fijo',
					onClose: () => {},
					formProps,
				}),
			'Editar gasto fijo',
			'Formulario de gasto fijo',
		],
		[
			() => renderDebtPaymentModal({ onClose: () => {}, formProps }),
			'Registrar pago de deuda',
			'Formulario de pago de deuda',
		],
	] as const) {
		const { unmount } = render(renderModal())
		assert.ok(screen.getByRole('dialog', { name: title }))
		assert.ok(screen.getByText(formText))
		unmount()
	}
})
