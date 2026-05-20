import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	dataSetKeysForSection,
	loadDataSections,
} from './data-loading'

test('dashboard loads only summary, cash and profile datasets for employers', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'dashboard',
			canViewEconomy: true,
		}),
		['dashboard', 'cash', 'businessProfile'],
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
		],
	)
})

test('settings history does not eager-load audit logs', () => {
	const keys = dataSetKeysForSection({
		section: 'settings',
		settingsSection: 'history',
		canViewEconomy: true,
	})

	assert.deepEqual(keys, ['businessProfile', 'employees'])
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
