import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { DashboardCashByCategory } from './DashboardCashByCategory'

afterEach(cleanup)

test('DashboardCashByCategory prioritizes expense subcategories', () => {
	render(
		<DashboardCashByCategory
			dashboard={{
				cash_by_category: {
					income_by_service: [{ service: 'Lavado premium', total: 30000 }],
					expense_by_category: [{ category: 'Insumos', total: 15000 }],
					expense_by_subcategory: [{ subcategory: 'Productos', total: 15000 }],
				},
			}}
		/>,
	)

	assert.ok(screen.getByText('Egresos por subcategoria'))
	assert.ok(screen.getByText('Productos'))
	assert.equal(screen.queryByText('Egresos por categoria'), null)
})
