import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	hasActiveAuditFilters,
	sortedAuditActorValues,
	sortedAuditValues,
} from './audit-filter-values'

test('sortedAuditValues removes empty duplicates and sorts by label', () => {
	const values = sortedAuditValues(
		[
			{ module: 'workorders' },
			{ module: '' },
			{ module: 'customers' },
			{ module: 'workorders' },
		],
		'module',
		(value) => ({ workorders: 'Trabajos', customers: 'Clientes' })[value] ?? value,
	)

	assert.deepEqual(values, ['customers', 'workorders'])
})

test('sortedAuditActorValues and hasActiveAuditFilters preserve audit filter rules', () => {
	assert.deepEqual(
		sortedAuditActorValues([
			{ actor_username: 'zoe' },
			{ actor_username: '' },
			{ actor_username: 'ana' },
			{ actor_username: 'zoe' },
		]),
		['ana', 'zoe'],
	)
	assert.equal(hasActiveAuditFilters({ module: '', actor: null, action: '  ' }), false)
	assert.equal(hasActiveAuditFilters({ module: '', actor: 'ana' }), true)
})
