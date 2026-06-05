import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	dataSetKeysForSection,
	loadDataSections,
} from './data-loading'

test('dashboard loads summary, cash and shell datasets for employers', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'dashboard',
			canViewEconomy: true,
		}),
		['dashboard', 'cash', 'businessProfile', 'publicRequests'],
	)
})

test('agenda keeps operational dependencies and gates economy-only datasets', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'agenda',
			canViewEconomy: false,
		}),
		['customers', 'vehicles', 'services', 'reservations', 'workOrders'],
	)
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'agenda',
			canViewEconomy: true,
		}),
		[
			'customers',
			'vehicles',
			'services',
			'reservations',
			'workOrders',
			'materials',
			'materialOpenUnits',
			'quotes',
			'businessProfile',
			'publicRequests',
		],
	)
})

test('shell datasets load with every employer section', () => {
	for (const section of loadDataSections) {
		const keys = dataSetKeysForSection({
			section,
			canViewEconomy: true,
		})
		assert.equal(keys.includes('businessProfile'), true)
		assert.equal(keys.includes('publicRequests'), true)
	}
})

test('customer and service dashboards keep editable linked records hydrated', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'customers',
			canViewEconomy: true,
		}),
		['customers', 'vehicles', 'services', 'businessProfile', 'publicRequests'],
	)
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'services',
			canViewEconomy: true,
		}),
		['services', 'customers', 'vehicles', 'businessProfile', 'publicRequests'],
	)
})

test('stock movement sections include customer and reservation selectors', () => {
	for (const section of ['inventory', 'suppliers']) {
		const keys = dataSetKeysForSection({
			section,
			canViewEconomy: true,
		})
		assert.equal(keys.includes('customers'), true)
		assert.equal(keys.includes('reservations'), true)
	}
})

test('settings history does not eager-load audit logs', () => {
	const keys = dataSetKeysForSection({
		section: 'settings',
		settingsSection: 'history',
		canViewEconomy: true,
	})

	assert.deepEqual(keys, [
		'businessProfile',
		'employees',
		'dailyCapacities',
		'services',
		'publicRequests',
	])
	assert.equal(keys.includes('auditLogs'), false)
})

test('section dataset definitions do not emit duplicate keys', () => {
	for (const section of loadDataSections) {
		const keys = dataSetKeysForSection({
			section,
			settingsSection: section === 'settings' ? 'business' : undefined,
			canViewEconomy: true,
		})
		assert.equal(
			keys.length,
			new Set(keys).size,
			`${section} has duplicated dataset keys`,
		)
	}
})
