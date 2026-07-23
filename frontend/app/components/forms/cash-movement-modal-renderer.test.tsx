import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./CashMovementForm', () => ({
	CashMovementForm: () => <span>Formulario de movimiento manual</span>,
}))

import { renderCashMovementModal } from './cash-movement-modal-renderer'

afterEach(cleanup)

test('renderCashMovementModal preserves the manual cash modal', () => {
	render(renderCashMovementModal({ onClose: () => {}, formProps: {} as never }))

	assert.ok(screen.getByRole('dialog', { name: 'Movimiento manual' }))
	assert.ok(screen.getByText('Formulario de movimiento manual'))
})
