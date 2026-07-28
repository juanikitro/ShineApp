import assert from 'node:assert/strict'
import { test } from 'vitest'

import { selectDashboardNextActionKeys } from './dashboard-next-actions'

test('selectDashboardNextActionKeys orders collection, overdue debt, and agenda actions', () => {
	assert.deepEqual(
		selectDashboardNextActionKeys({
			hasReceivable: true,
			overdueDebtsTotal: 1200,
			workOrdersTotal: 4,
		}),
		['collectOldestBalance', 'reviewOverdueDebts', 'maintainAgenda'],
	)
})

test('overdue reservations replace the agenda action and lead the existing Now and After lane', () => {
	assert.deepEqual(
		selectDashboardNextActionKeys({
			hasReceivable: true,
			overdueDebtsTotal: 1200,
			overdueReservationsCount: 4,
			workOrdersTotal: 4,
		}),
		[
			'reviewOverdueReservations',
			'collectOldestBalance',
			'reviewOverdueDebts',
		],
	)
})

test('selectDashboardNextActionKeys keeps overdue debt before creating activity', () => {
	assert.deepEqual(
		selectDashboardNextActionKeys({
			hasReceivable: false,
			overdueDebtsTotal: 1200,
			workOrdersTotal: 0,
		}),
		['reviewOverdueDebts', 'createPeriodActivity'],
	)
})

test('selectDashboardNextActionKeys keeps creating activity after a receivable when no debt is overdue', () => {
	assert.deepEqual(
		selectDashboardNextActionKeys({
			hasReceivable: true,
			overdueDebtsTotal: 0,
			workOrdersTotal: 0,
		}),
		['collectOldestBalance', 'createPeriodActivity'],
	)
})

test('selectDashboardNextActionKeys treats non-positive totals as no current activity', () => {
	assert.deepEqual(
		selectDashboardNextActionKeys({
			hasReceivable: false,
			overdueDebtsTotal: -1,
			workOrdersTotal: -1,
		}),
		['createPeriodActivity'],
	)
})
