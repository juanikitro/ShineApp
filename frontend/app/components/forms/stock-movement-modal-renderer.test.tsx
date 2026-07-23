import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./StockMovementForm', () => ({
	StockMovementForm: () => <span>Formulario de movimiento de stock</span>,
}))

import { renderStockMovementModal } from './stock-movement-modal-renderer'

afterEach(cleanup)

test('renderStockMovementModal preserves the stock movement modal', () => {
	render(renderStockMovementModal({ onClose: () => {}, formProps: {} as never }))

	assert.ok(screen.getByRole('dialog', { name: 'Crear movimiento de stock' }))
	assert.ok(screen.getByText('Formulario de movimiento de stock'))
})
