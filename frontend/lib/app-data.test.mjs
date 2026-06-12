import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	applyAppDataEntry,
	dataSetCacheKey,
	loadAppDataSets,
} from './app-data'

const scope = {
	period: { from: '2026-05-01', to: '2026-05-31' },
	selectedDay: '2026-05-20',
}

test('dataSetCacheKey scopes dashboard and cash by active date filters', () => {
	assert.equal(
		dataSetCacheKey('dashboard', scope),
		'dashboard:2026-05-01:2026-05-31',
	)
	assert.equal(dataSetCacheKey('cash', scope), 'cash:2026-05-20')
	assert.equal(dataSetCacheKey('customers', scope), 'customers')
})

test('loadAppDataSets keeps the existing endpoint contract and entry order', async () => {
	const calls = []
	const loaders = {
		apiFetch: async (path) => {
			calls.push(['fetch', path])
			return { path }
		},
		apiList: async (path) => {
			calls.push(['list', path])
			return [{ path }]
		},
	}
	const keys = [
		'dashboard',
		'cash',
		'tasks',
		'customers',
		'vehicles',
		'services',
		'reservations',
		'workOrders',
		'payments',
		'debts',
		'debtPayments',
		'fixedExpenses',
		'fixedExpenseOccurrences',
		'materials',
		'suppliers',
		'stockMovements',
		'materialOpenUnits',
		'purchases',
		'consumptions',
		'tools',
		'quotes',
		'publicRequests',
		'businessProfile',
		'employees',
	]

	const entries = await loadAppDataSets(keys, scope, loaders)

	assert.deepEqual(
		calls,
		[
			['fetch', '/dashboard/summary/?from=2026-05-01&to=2026-05-31'],
			['fetch', '/cash/daily/?date=2026-05-20'],
			['list', '/tasks/'],
			['list', '/customers/'],
			['list', '/vehicles/'],
			['list', '/services/'],
			['list', '/reservations/'],
			['list', '/work-orders/'],
			['list', '/payments/'],
			['list', '/debts/'],
			['list', '/debt-payments/'],
			['list', '/fixed-expenses/'],
			['list', '/fixed-expense-occurrences/'],
			['list', '/materials/'],
			['list', '/suppliers/'],
			['list', '/stock-movements/'],
			['list', '/material-open-units/'],
			['list', '/material-purchases/'],
			['list', '/material-consumptions/'],
			['list', '/tools/'],
			['list', '/quotes/'],
			['list', '/public-requests/'],
			['fetch', '/settings/business-profile/'],
			['list', '/auth/employees/'],
		],
	)
	assert.deepEqual(
		entries.map(([key]) => key),
		keys,
	)
})

test('loadAppDataSets propagates loader failures to the caller', async () => {
	await assert.rejects(
		() =>
			loadAppDataSets(['customers'], scope, {
				apiFetch: async () => ({}),
				apiList: async () => {
					throw new Error('network down')
				},
			}),
		/network down/,
	)
})

test('applyAppDataEntry dispatches loaded data to the matching applier only', () => {
	const calls = []
	const appliers = Object.fromEntries(
		[
			'dashboard',
			'cash',
			'tasks',
			'customers',
			'vehicles',
			'services',
			'reservations',
			'workOrders',
			'payments',
			'debts',
			'debtPayments',
			'materials',
			'suppliers',
			'stockMovements',
			'materialOpenUnits',
			'purchases',
			'consumptions',
			'tools',
			'quotes',
			'publicRequests',
			'businessProfile',
			'employees',
		].map((key) => [
			key,
			(data) => {
				calls.push([key, data])
			},
		]),
	)
	const payload = [{ id: 1 }]

	applyAppDataEntry('customers', payload, appliers)

	assert.deepEqual(calls, [['customers', payload]])
})
