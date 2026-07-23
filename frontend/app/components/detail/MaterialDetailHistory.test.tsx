import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { MaterialDetailHistory } from './MaterialDetailHistory'

afterEach(cleanup)

function renderHistory(overrides = {}) {
	const onOpenUsage = vi.fn()
	const onOpenOpenUnit = vi.fn()
	const props = {
		material: { unit: 'L', open_units_active_count: 1 },
		usage: {
			count: 1,
			totalCost: 500,
			totalQuantity: 2,
			rows: [
				{
					id: 'usage-1',
					work_order_label: 'OT 1',
					quantity: 2,
					estimated_total_cost: 500,
					consumed_at: '2026-07-22',
				},
			],
		},
		openUnits: [
			{
				id: 'unit-1',
				status: 'open',
				opened_at: '2026-07-21',
				consumptions_count: 2,
				work_orders_count: 1,
				duration_days: 3,
			},
		],
		unitValue: 250,
		stockValue: 1000,
		formatMoney: (value: unknown) => `$ ${value}`,
		formatQuantity: (value: unknown, unit = '') => `${value} ${unit}`,
		formatNumber: (value: unknown) => String(value),
		onOpenUsage,
		onOpenOpenUnit,
		...overrides,
	} as Parameters<typeof MaterialDetailHistory>[0]

	return {
		...render(<MaterialDetailHistory {...props} />),
		onOpenUsage,
		onOpenOpenUnit,
	}
}

test('MaterialDetailHistory preserves summaries, linked records and record actions', () => {
	const { onOpenUsage, onOpenOpenUnit } = renderHistory()

	assert.ok(screen.getByText('$ 1000'))
	assert.ok(screen.getByText('2 L usados'))
	assert.ok(screen.getByRole('button', { name: /Abierta - 2026-07-21/ }))
	fireEvent.click(screen.getByRole('button', { name: /Trabajo asociado - OT 1/ }))
	fireEvent.click(screen.getByRole('button', { name: /Abierta - 2026-07-21/ }))
	assert.deepEqual(onOpenUsage.mock.calls, [
		[
			{
				id: 'usage-1',
				work_order_label: 'OT 1',
				quantity: 2,
				estimated_total_cost: 500,
				consumed_at: '2026-07-22',
			},
		],
	])
	assert.deepEqual(onOpenOpenUnit.mock.calls, [
		[
			{
				id: 'unit-1',
				status: 'open',
				opened_at: '2026-07-21',
				consumptions_count: 2,
				work_orders_count: 1,
				duration_days: 3,
			},
		],
	])
})

test('MaterialDetailHistory preserves empty linked-record states and closed-unit labels', () => {
	renderHistory({
		material: { unit: 'u', open_units_active_count: 0 },
		usage: { count: 0, totalCost: 0, totalQuantity: 0, rows: [] },
		openUnits: [],
	})

	assert.ok(screen.getByText('Sin usos registrados para este material.'))
	assert.ok(screen.getByText('Sin unidades abiertas para este material.'))
})
