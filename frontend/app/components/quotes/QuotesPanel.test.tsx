import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { createQuoteCardContentRenderer } from './QuotesPanel'

afterEach(cleanup)

test('createQuoteCardContentRenderer preserves the standalone quote card and its handlers', () => {
	const calls: string[] = []
	const renderQuoteCardContent = createQuoteCardContentRenderer({
		quoteCode: () => 'Q-8',
		quoteHasReservation: () => false,
		quoteLaneStatus: () => 'draft',
		quoteTentativeTimeLabel: () => '',
		onCreateReservationFromQuote: () => calls.push('reservation'),
		onDownloadQuotePdf: () => calls.push('pdf'),
		onDownloadQuotePdfAndMarkSent: () => calls.push('send'),
		onSendQuoteWhatsapp: () => calls.push('whatsapp'),
		whatsappButtonVisible: () => true,
		whatsappButtonLabel: () => 'WhatsApp',
		onOpenQuoteReservationInAgenda: () => calls.push('agenda'),
	})

	render(
		renderQuoteCardContent({
			id: 8,
			customer_name: 'Ana',
			vehicle_label: 'Fiesta',
			total: 100,
			items: [{ id: 1, service_name: 'Lavado' }],
		}),
	)

	assert.ok(screen.getByText('Cotizacion Q-8 - Ana'))
	assert.ok(screen.getByText('Lavado'))
	fireEvent.click(
		screen.getByRole('button', { name: 'Crear reserva desde cotizacion' }),
	)
	fireEvent.click(screen.getByRole('button', { name: 'Bajar PDF' }))
	fireEvent.click(
		screen.getByRole('button', { name: 'WhatsApp cotizacion' }),
	)
	fireEvent.click(
		screen.getByRole('button', {
			name: 'Bajar PDF y marcar cotizacion como enviada',
		}),
	)
	assert.deepEqual(calls, ['reservation', 'pdf', 'whatsapp', 'send'])
})
