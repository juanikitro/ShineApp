import assert from 'node:assert/strict'
import { test } from 'vitest'

import { buildSidebarNavigation } from './sidebar-navigation'

test('buildSidebarNavigation keeps the non-economic hierarchy without hidden sections', () => {
	const items = buildSidebarNavigation({
		canViewEconomy: false,
		pendingPublicRequestsCount: 4,
		pendingTasksCount: 0,
		overdueTasksCount: 0,
	})

	assert.deepEqual(items.map((item) => item.key), [
		'dashboard',
		'agenda',
		'customers',
		'tasks',
	])
	assert.deepEqual(items[1].children, [])
	assert.deepEqual(
		items[2].children?.map((item) => item.key),
		['vehicles', 'services'],
	)
	assert.equal(items[3].badge, undefined)
	assert.equal('children' in items[3], false)
})

test('buildSidebarNavigation keeps economic children and task/request badges', () => {
	const items = buildSidebarNavigation({
		canViewEconomy: true,
		pendingPublicRequestsCount: 4,
		pendingTasksCount: 2,
		overdueTasksCount: 1,
	})

	assert.deepEqual(items.map((item) => item.key), [
		'dashboard',
		'agenda',
		'customers',
		'cash',
		'tasks',
		'settings',
	])
	assert.deepEqual(
		items[1].children?.map((item) => ({ key: item.key, badge: item.badge })),
		[
			{ key: 'quotes', badge: undefined },
			{ key: 'notifications', badge: 4 },
		],
	)
	assert.deepEqual(
		items[3].children?.map((item) => item.key),
		['debts', 'fixed-expenses', 'suppliers', 'inventory', 'tools'],
	)
	assert.equal(items[4].badge, 2)
	assert.equal(items[4].badgeVariant, 'danger')
})
