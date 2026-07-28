import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	beginDataSetLoading,
	beginDataLoad,
	cancelDataLoads,
	dataSetKeysForSection,
	finishDataSetLoading,
	loadDataSections,
} from './data-loading'

test('isolated hydration does not abort or replace the active section load', () => {
	const activeController = new AbortController()
	const controllers = new Set([activeController])
	const isolatedController = beginDataLoad(controllers, true)

	assert.equal(activeController.signal.aborted, false)
	assert.notEqual(isolatedController, activeController)
	assert.deepEqual(controllers, new Set([activeController, isolatedController]))
})

test('regular section loads abort and replace every previous load', () => {
	const previousController = new AbortController()
	const isolatedController = new AbortController()
	const controllers = new Set([previousController, isolatedController])
	const nextController = beginDataLoad(controllers)

	assert.equal(previousController.signal.aborted, true)
	assert.equal(isolatedController.signal.aborted, true)
	assert.deepEqual(controllers, new Set([nextController]))
})

test('session invalidation aborts and forgets every in-flight load', () => {
	const firstController = new AbortController()
	const secondController = new AbortController()
	const controllers = new Set([firstController, secondController])

	cancelDataLoads(controllers)

	assert.equal(firstController.signal.aborted, true)
	assert.equal(secondController.signal.aborted, true)
	assert.equal(controllers.size, 0)
})

test('finishing an older load keeps shared datasets loading for the newer load', () => {
	const loadCounts = new Map()
	const olderKeys = ['services', 'reservations']
	const newerKeys = ['services', 'customers']

	beginDataSetLoading(loadCounts, olderKeys)
	beginDataSetLoading(loadCounts, newerKeys)
	const afterOlderFinishes = finishDataSetLoading(loadCounts, olderKeys)

	assert.deepEqual(
		afterOlderFinishes,
		new Set(['services', 'customers']),
	)
	assert.deepEqual(
		finishDataSetLoading(loadCounts, newerKeys),
		new Set(),
	)
})

test('dashboard loads summary, cash and shell datasets for employers', () => {
	assert.deepEqual(
		dataSetKeysForSection({
			section: 'dashboard',
			canViewEconomy: true,
		}),
		[
			'dashboard',
			'cash',
			'businessProfile',
			'services',
			'sectors',
			'whatsappConfig',
			'whatsappTemplates',
			'whatsappAutomationRules',
			'publicRequests',
			'tasks',
		],
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
			'whatsappConfig',
			'whatsappTemplates',
			'whatsappAutomationRules',
			'whatsappMessages',
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
		[
			'customers',
			'vehicles',
			'services',
			'whatsappConfig',
			'whatsappTemplates',
			'whatsappMessages',
			'businessProfile',
			'publicRequests',
			'tasks',
		],
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
