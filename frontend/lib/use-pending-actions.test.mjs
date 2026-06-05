import assert from 'node:assert/strict'
import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { usePendingActions } from './page-support'

afterEach(cleanup)

function harness() {
	let api
	function Probe() {
		api = usePendingActions()
		return null
	}
	render(React.createElement(Probe))
	return () => api
}

test('usePendingActions begin/end toggle individual keys', () => {
	const get = harness()

	assert.equal(get().pending, false)
	assert.equal(get().isPending('save:customer'), false)

	act(() => {
		get().begin('save:customer')
	})
	assert.equal(get().isPending('save:customer'), true)
	assert.equal(get().pending, true)

	act(() => {
		get().end('save:customer')
	})
	assert.equal(get().isPending('save:customer'), false)
	assert.equal(get().pending, false)
})

test('usePendingActions tracks multiple keys independently', () => {
	const get = harness()

	act(() => {
		get().begin('save:customer:1')
		get().begin('delete:vehicle:5')
	})

	assert.equal(get().pendingKeys.size, 2)
	assert.equal(get().isPending('save:customer:1'), true)
	assert.equal(get().isPending('delete:vehicle:5'), true)
	assert.equal(get().isPending('save:customer:2'), false)

	act(() => {
		get().end('save:customer:1')
	})

	assert.equal(get().pendingKeys.size, 1)
	assert.equal(get().isPending('save:customer:1'), false)
	assert.equal(get().isPending('delete:vehicle:5'), true)
	assert.equal(get().pending, true)
})

test('usePendingActions begin is idempotent for the same key', () => {
	const get = harness()

	act(() => {
		get().begin('save:customer')
		get().begin('save:customer')
	})

	assert.equal(get().pendingKeys.size, 1)
})

test('usePendingActions end on unknown key is a no-op', () => {
	const get = harness()

	act(() => {
		get().end('save:nonexistent')
	})

	assert.equal(get().pending, false)
})
