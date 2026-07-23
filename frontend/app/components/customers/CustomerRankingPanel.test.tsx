import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	CustomerRankingPanel,
	renderCustomerRankingPanel,
} from './CustomerRankingPanel'

afterEach(cleanup)

test('CustomerRankingPanel keeps ranking rows, pluralization and the six-row limit', () => {
	render(
		<CustomerRankingPanel
			title="Servicios frecuentes"
			labelKey="name"
			emptyText="Sin servicios."
			rows={Array.from({ length: 7 }, (_, index) => ({
				id: index + 1,
				name: `Servicio ${index + 1}`,
				work_orders_count: index === 0 ? 1 : 2,
				billed_total: 100,
				paid_total: 80,
				margin_total: 40,
			}))}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Servicios frecuentes' }))
	assert.ok(screen.getByText('#1'))
	assert.ok(screen.getByText('#6'))
	assert.equal(screen.queryByText('#7'), null)
	assert.ok(screen.getByText('1 trabajo'))
	assert.ok(screen.getAllByText('2 trabajos').length > 0)
})

test('CustomerRankingPanel preserves its empty state', () => {
	render(
		<CustomerRankingPanel
			title="Marcas frecuentes"
			labelKey="name"
			emptyText="Sin marcas con trabajos."
			rows={[]}
		/>,
	)

	assert.ok(screen.getByText('Sin marcas con trabajos.'))
})

test('renderCustomerRankingPanel preserves the renderer contract used by dashboard props', () => {
	render(
		renderCustomerRankingPanel(
			'Servicios renderizados',
			[{ id: 1, name: 'Lavado', work_orders_count: 1 }],
			'name',
			'Sin servicios.',
		),
	)

	assert.ok(screen.getByRole('heading', { name: 'Servicios renderizados' }))
	assert.ok(screen.getByText('Lavado'))
})
