import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { QuoteDetailSummary } from './QuoteDetailSummary'

afterEach(cleanup)

function renderSummary(overrides = {}) {
	const props = {
		quote: {
			id: 'quote-1',
			customer_name: 'Ana',
			total: 5000,
			valid_until: '2026-07-30',
			sent_at: '2026-07-20',
			is_group: true,
		},
		code: 'Q-001',
		statusLabel: 'Enviada',
		hasReservation: true,
		groupLines: [
			{
				id: 'line-1',
				vehicle_label: 'Ford Fiesta',
				reservation_day: '2026-07-25',
				reservation_start_time: '10:00',
				subtotal: 5000,
				items: [
					{
						id: 'item-1',
						service_icon: 'sparkles',
						service_name: 'Lavado',
						quantity: 1,
						unit_price: 5000,
					},
				],
			},
		],
		formatMoney: (value: unknown) => `$ ${value}`,
		formatDateLabel: (value: string) => `fecha ${value}`,
		tentativeTimeLabel: (value: unknown) => (value ? ` ${value}` : ''),
		serviceDisplayName: (service: { service_name?: string }) =>
			service.service_name ?? '',
		...overrides,
	} as Parameters<typeof QuoteDetailSummary>[0]

	return render(<QuoteDetailSummary {...props} />)
}

test('QuoteDetailSummary preserves grouped quote metadata and vehicle line detail', () => {
	const { container } = renderSummary()
	const content = container.textContent ?? ''

	assert.match(content, /Cotizacion Q-001/)
	assert.match(content, /1 autos/)
	assert.match(content, /Reserva vinculada: Si/)
	assert.match(content, /Agenda por auto en la cotizacion grupal\./)
	assert.match(content, /Auto 1: Ford Fiesta/)
	assert.match(content, /Lavado: 1 x \$ 5000/)
})

test('QuoteDetailSummary preserves individual reservation items and notes', () => {
	renderSummary({
		quote: {
			id: 'quote-2',
			customer_name: 'Beto',
			vehicle_label: 'Honda',
			total: 3000,
			valid_until: '2026-07-31',
			reservation_day: '2026-07-26',
			reservation_start_time: '11:00',
			is_group: false,
			items: [
				{
					id: 'item-2',
					service_name: 'Pulido',
					quantity: 1,
					unit_price: 3000,
					line_total: 3000,
					service_notes: 'Incluye cera',
				},
			],
		},
		statusLabel: 'Borrador',
		hasReservation: false,
		groupLines: [],
	})

	assert.ok(screen.getByText(/Reserva tentativa: 2026-07-26 11:00/))
	assert.ok(screen.getByText(/Pulido/))
	assert.ok(screen.getByText('Incluye cera'))
	assert.equal(screen.queryByText(/Enviada:/), null)
})

test('QuoteDetailSummary preserves the free quote fallback without lines', () => {
	const { container } = renderSummary({
		quote: {
			id: 'quote-3',
			customer_name: 'Cami',
			total: 0,
			is_group: false,
		},
		groupLines: [],
		hasReservation: false,
	})

	assert.match(container.textContent ?? '', /Sin vehiculo/)
	assert.match(container.textContent ?? '', /Validez: Sin fecha/)
	assert.match(container.textContent ?? '', /Cotizacion libre sin fecha\./)
})
