import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./QuoteReservationForm', () => ({
	QuoteReservationForm: () => <span>Formulario desde cotizacion</span>,
}))
vi.mock('./ReservationForm', () => ({
	ReservationForm: () => <span>Formulario de reserva</span>,
}))

import {
	renderQuickReservationModal,
	renderQuoteReservationModal,
} from './reservation-modal-renderers'

afterEach(cleanup)

const formProps = {} as never

test('reservation modal renderers preserve dynamic titles and forms', () => {
	const fromQuote = render(
		renderQuoteReservationModal({
			quoteId: 12,
			onClose: () => {},
			formProps,
		}),
	)
	assert.ok(
		screen.getByRole('dialog', {
			name: 'Crear reserva desde cotizacion #12',
		}),
	)
	assert.ok(screen.getByText('Formulario desde cotizacion'))
	fromQuote.unmount()

	render(
		renderQuickReservationModal({
			day: '2026-07-22',
			title: 'Nueva reserva - Miercoles 22/07',
			onClose: () => {},
			formProps,
		}),
	)
	assert.ok(
		screen.getByRole('dialog', { name: 'Nueva reserva - Miercoles 22/07' }),
	)
	assert.ok(screen.getByText('Formulario de reserva'))
})
