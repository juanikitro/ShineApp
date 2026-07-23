import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import type { AnyRecord } from '@/lib/page-support'

import { AgendaWorkOrderSummary } from './AgendaWorkOrderSummary'

afterEach(cleanup)

const workOrder: AnyRecord = {
	id: 7,
	status: 'ready',
	total_amount: 10000,
	paid_amount: 4000,
	balance_due: 6000,
	material_cost: 2500,
}

function renderSummary(overrides = {}) {
	const props = {
		workOrder,
		canViewEconomy: true,
		orderLabels: { ready: 'Listo' },
		showDetailAction: false,
		onOpenDetail: () => {},
		...overrides,
	} as Parameters<typeof AgendaWorkOrderSummary>[0]

	return render(<AgendaWorkOrderSummary {...props} />)
}

test('AgendaWorkOrderSummary preserves the economic work-order metrics', () => {
	const { container } = renderSummary()
	const summary = container.querySelector<HTMLElement>(
		'.agenda-workorder-summary',
	)

	assert.ok(summary)
	assert.ok(
		summary.querySelector('.agenda-workorder-summary-head .record-actions'),
	)
	assert.ok(screen.getByText('Trabajo de la reserva'))
	assert.ok(screen.getByText('Listo').classList.contains('status'))
	assert.equal(
		container.querySelectorAll('.agenda-workorder-metrics > div').length,
		4,
	)
	assert.ok(screen.getByText('Total'))
	assert.ok(screen.getByText('Pagado'))
	assert.ok(screen.getByText('Deuda'))
	assert.ok(screen.getByText('Materiales'))
	assert.ok(container.querySelector('.agenda-workorder-metrics .debt'))
	assert.equal(screen.queryByRole('button', { name: 'Editar trabajo' }), null)
})

test('AgendaWorkOrderSummary keeps detail access available without economy metrics', () => {
	const calls: AnyRecord[] = []
	const { container } = renderSummary({
		canViewEconomy: false,
		showDetailAction: true,
		onOpenDetail: (item) => calls.push(item),
	})

	fireEvent.click(screen.getByRole('button', { name: 'Editar trabajo' }))

	assert.equal(container.querySelector('.agenda-workorder-metrics'), null)
	assert.deepEqual(calls, [workOrder])
})
