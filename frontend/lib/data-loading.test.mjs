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
		['dashboard', 'cash', 'businessProfile', 'publicRequests', 'tasks'],
	)
})

test('agenda keeps operational dependencies and gates economy-only datasets', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'agenda',
			canViewEconomy: false,
		}),
		['customers', 'vehicles', 'services', 'sectors', 'reservations', 'workOrders', 'tasks'],
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
			'sectors',
			'reservations',
			'workOrders',
			'materials',
			'materialOpenUnits',
			'quotes',
			'businessProfile',
			'publicRequests',
			'tasks',
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
		assert.equal(keys.includes('tasks'), true)
	}
})

test('customer and service dashboards keep editable linked records hydrated', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'customers',
			canViewEconomy: true,
		}),
		['customers', 'vehicles', 'services', 'businessProfile', 'publicRequests', 'tasks'],
	)
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'services',
			canViewEconomy: true,
		}),
		['services', 'serviceMaterials', 'sectors', 'customers', 'vehicles', 'businessProfile', 'publicRequests', 'tasks'],
	)
})

test('search section only loads shell datasets', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'search',
			canViewEconomy: true,
		}),
		['businessProfile', 'publicRequests', 'tasks'],
	)
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'search',
			canViewEconomy: false,
		}),
		['tasks'],
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
		'services',
		'sectors',
		'publicRequests',
		'tasks',
	])
	assert.equal(keys.includes('auditLogs'), false)
})

test('settings whatsapp loads channel datasets only for employers', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'settings',
			settingsSection: 'whatsapp',
			canViewEconomy: true,
		}),
		[
			'businessProfile',
			'employees',
			'services',
			'sectors',
			'publicRequests',
			'tasks',
			'whatsappConfig',
			'whatsappTemplates',
			'whatsappAutomationRules',
			'whatsappMessages',
		],
	)
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'settings',
			settingsSection: 'whatsapp',
			canViewEconomy: false,
		}),
		['services', 'sectors', 'tasks'],
	)
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
