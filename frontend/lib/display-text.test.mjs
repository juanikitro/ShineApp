import assert from 'node:assert/strict'
import { test } from 'vitest'

import { joinDisplayParts, selectOptionsFromValues } from './display-text'

test('joinDisplayParts trims and joins visible fragments with ASCII separators', () => {
	assert.equal(
		joinDisplayParts(['  Juan ', '', null, ' juan@example.com  ']),
		'Juan - juan@example.com',
	)
})

test('joinDisplayParts returns an empty string when every fragment is blank', () => {
	assert.equal(joinDisplayParts(['', '   ', null, undefined]), '')
})

test('selectOptionsFromValues maps values to label/value pairs', () => {
	assert.deepEqual(selectOptionsFromValues(['a', 'b']), [
		{ value: 'a', label: 'a' },
		{ value: 'b', label: 'b' },
	])
})

test('selectOptionsFromValues prepends currentValue when not in list', () => {
	const options = selectOptionsFromValues(['b', 'c'], 'a')
	assert.equal(options[0].value, 'a')
	assert.equal(options.length, 3)
})

test('selectOptionsFromValues does not duplicate currentValue when already in list', () => {
	const options = selectOptionsFromValues(['a', 'b'], 'a')
	assert.equal(options.length, 2)
	assert.equal(options[0].value, 'a')
})
