import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerRecentQuotesPanel } from './CustomerRecentQuotesPanel'

afterEach(cleanup)

test('CustomerRecentQuotesPanel preserves quote details and opens the complete record', () => {
	const row = {
		id: 7,
		public_code: 'Q-7',
		vehicle: 'Fiesta',
		quote_date: '2026-07-22',
		services: 'Lavado',
		status: 'sent',
		total: 100,
	}
	const fullRecord = { ...row, observations: 'Registro completo' }
	const opened = [] as unknown[]
	render(
		<CustomerRecentQuotesPanel
			quotesRows={[row]}
			quotes={[fullRecord]}
			quoteStatusLabels={{ sent: 'Enviada' }}
			onOpenQuote={(quote) => opened.push(quote)}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /Cotizacion Q-7 - Fiesta/ }))

	assert.ok(screen.getByText('1 cotizaciones registradas'))
	assert.ok(screen.getByText('Enviada'))
	assert.deepEqual(opened, [fullRecord])
})

test('CustomerRecentQuotesPanel preserves its empty state', () => {
	render(
		<CustomerRecentQuotesPanel
			quotesRows={[]}
			quotes={[]}
			quoteStatusLabels={{}}
			onOpenQuote={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Este cliente todavia no tiene cotizaciones.'))
})
