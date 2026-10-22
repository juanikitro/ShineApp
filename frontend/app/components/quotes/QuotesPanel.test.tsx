import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { createQuoteCardContentRenderer, QuotesPanel } from './QuotesPanel'

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
		screen.getByRole('button', { name: 'WhatsApp cotizacion para Ana' }),
	)
	fireEvent.click(
		screen.getByRole('button', {
			name: 'Bajar PDF y marcar cotizacion como enviada',
		}),
	)
	assert.deepEqual(calls, ['reservation', 'pdf', 'whatsapp', 'send'])
})

test('quote card keeps unavailable WhatsApp visible with an accessible reason', () => {
	let clicks = 0
	const reason = 'El cliente no tiene telefono cargado.'
	const renderCard = createQuoteCardContentRenderer({
		quoteCode: () => 'Q-8', quoteHasReservation: () => false,
		quoteLaneStatus: () => 'draft', quoteTentativeTimeLabel: () => '',
		onCreateReservationFromQuote: () => undefined,
		onDownloadQuotePdf: () => undefined,
		onDownloadQuotePdfAndMarkSent: () => undefined,
		onSendQuoteWhatsapp: () => { clicks += 1 },
		whatsappButtonVisible: () => true, whatsappButtonLabel: () => 'WhatsApp',
		whatsappUnavailableReason: () => reason,
		onOpenQuoteReservationInAgenda: () => undefined,
	})
	render(renderCard({ id: 8, customer_name: 'Ana', items: [] }))
	const button = screen.getByRole('button', { name: 'WhatsApp cotizacion para Ana' }) as HTMLButtonElement
	assert.equal(button.disabled, true)
	assert.equal(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent, reason)
	fireEvent.click(button)
	assert.equal(clicks, 0)
})

test('quote board does not pulse a card again after its data refreshes', () => {
	render(
		<QuotesPanel
			activeQuoteDrag={null}
			agendaSensors={[]}
			quoteBoard={{
				draft: [
					{
						id: 8,
						customer_name: 'Ana',
						vehicle_label: 'Fiesta',
						total: 100,
						items: [],
					},
				],
				sent: [],
			}}
			quoteDropStatus={null}
			quoteMovePendingId={null}
			detailRecordProps={() => ({})}
			quickActionTargetProps={() => ({})}
			quoteCode={() => 'Q-8'}
			quoteHasReservation={() => false}
			quoteLaneStatus={() => 'draft'}
			quoteQuickActions={() => []}
			quoteTentativeTimeLabel={() => ''}
			recordClass={() => 'record motion-flash'}
			renderQuickActionsTrigger={() => null}
			onCreateQuote={() => undefined}
			onCreateReservationFromQuote={() => undefined}
			onDownloadQuotePdf={() => undefined}
			onDownloadQuotePdfAndMarkSent={() => undefined}
			onSendQuoteWhatsapp={() => undefined}
			whatsappButtonVisible={() => true}
			whatsappButtonLabel={() => 'WhatsApp'}
			whatsappUnavailableReason={() => 'Falta configurar el mensaje.'}
			onOpenQuoteReservationInAgenda={() => undefined}
			onQuoteDragCancel={() => undefined}
			onQuoteDragEnd={() => undefined}
			onQuoteDragOver={() => undefined}
			onQuoteDragStart={() => undefined}
		/>,
	)

	assert.equal(document.querySelector('.motion-flash-overlay'), null)
	const whatsapp = screen.getByRole('button', { name: 'WhatsApp cotizacion para Ana' }) as HTMLButtonElement
	assert.equal(whatsapp.disabled, true)
	assert.equal(document.getElementById(whatsapp.getAttribute('aria-describedby')!)?.textContent, 'Falta configurar el mensaje.')
})
