import assert from 'node:assert/strict'
import { test } from 'vitest'

import { availableQuickActions } from './quick-actions'

test('availableQuickActions preserves visible actions without mutating the input', () => {
	const actions = [
		{ id: 'open' },
		{ id: 'edit', hidden: false },
		{ id: 'delete', hidden: true },
	]

	const result = availableQuickActions(actions)

	assert.deepEqual(result, [actions[0], actions[1]])
	assert.deepEqual(actions, [
		{ id: 'open' },
		{ id: 'edit', hidden: false },
		{ id: 'delete', hidden: true },
	])
})
