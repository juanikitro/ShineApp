import assert from 'node:assert/strict'
import { test } from 'vitest'

import { joinDisplayParts } from './display-text'

test('joinDisplayParts trims and joins visible fragments with ASCII separators', () => {
	assert.equal(
		joinDisplayParts(['  Juan ', '', null, ' juan@example.com  ']),
		'Juan - juan@example.com',
	)
})

test('joinDisplayParts returns an empty string when every fragment is blank', () => {
	assert.equal(joinDisplayParts(['', '   ', null, undefined]), '')
})
