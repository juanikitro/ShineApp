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

test('quote board keeps lanes and cards mounted when the panel re-renders', () => {
	const quote = {
		id: 8,
		customer_name: 'Ana',
		vehicle_label: 'Fiesta',
		total: 100,
		items: [],
	}
	const panelProps = {
		activeQuoteDrag: null,
		agendaSensors: [],
		quoteDropStatus: null,
		detailRecordProps: () => ({}),
		quickActionTargetProps: () => ({}),
		quoteCode: () => 'Q-8',
		quoteHasReservation: () => false,
		quoteLaneStatus: () => 'draft' as const,
		quoteQuickActions: () => [],
		quoteTentativeTimeLabel: () => '',
		recordClass: (_kind: string, _id: string | number, extra = '') =>
			`record ${extra}`,
		renderQuickActionsTrigger: () => null,
		onCreateQuote: () => undefined,
		onCreateReservationFromQuote: () => undefined,
		onDownloadQuotePdf: () => undefined,
		onDownloadQuotePdfAndMarkSent: () => undefined,
		onSendQuoteWhatsapp: () => undefined,
		whatsappButtonVisible: () => false,
		whatsappButtonLabel: () => 'WhatsApp',
		onOpenQuoteReservationInAgenda: () => undefined,
		onQuoteDragCancel: () => undefined,
		onQuoteDragEnd: () => undefined,
		onQuoteDragOver: () => undefined,
		onQuoteDragStart: () => undefined,
	}
	const { rerender } = render(
		<QuotesPanel
			{...panelProps}
			quoteBoard={{ draft: [quote], sent: [] }}
			quoteMovePendingId={null}
		/>,
	)
	const lane = document.querySelector('.quote-lane--draft')
	const card = document.querySelector('.quote-board-card')
	assert.ok(lane)
	assert.ok(card)

	// A mutation reloads the data (new objects, same id) and toggles pending state.
	rerender(
		<QuotesPanel
			{...panelProps}
			quoteBoard={{ draft: [{ ...quote, total: 150 }], sent: [] }}
			quoteMovePendingId="8"
		/>,
	)

	// Remounting would replay the `.records > *` entry animation on every card.
	assert.ok(document.querySelector('.quote-lane--draft') === lane, 'lane remounted')
	assert.ok(document.querySelector('.quote-board-card') === card, 'card remounted')
})
