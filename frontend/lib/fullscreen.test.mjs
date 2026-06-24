import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	isFullscreenActive,
	isFullscreenSupported,
	toggleDocumentFullscreen,
} from './fullscreen'

test('isFullscreenSupported returns true only when the browser exposes the fullscreen API', () => {
	assert.equal(
		isFullscreenSupported({
			fullscreenElement: null,
			exitFullscreen: async () => {},
			documentElement: {
				requestFullscreen: async () => {},
			},
		}),
		true,
	)

	assert.equal(
		isFullscreenSupported({
			fullscreenElement: null,
			exitFullscreen: undefined,
			documentElement: {
				requestFullscreen: async () => {},
			},
		}),
		false,
	)
})

test('isFullscreenActive reflects fullscreenElement presence', () => {
	assert.equal(isFullscreenActive({ fullscreenElement: null }), false)
	assert.equal(isFullscreenActive({ fullscreenElement: {} }), true)
})

test('toggleDocumentFullscreen enters fullscreen when inactive', async () => {
	let requested = false
	const doc = {
		fullscreenElement: null,
		exitFullscreen: async () => {
			throw new Error('should not exit')
		},
		documentElement: {
			requestFullscreen: async () => {
				requested = true
			},
		},
	}

	const result = await toggleDocumentFullscreen(doc)

	assert.equal(result, true)
	assert.equal(requested, true)
})

test('toggleDocumentFullscreen exits fullscreen when active', async () => {
	let exited = false
	const doc = {
		fullscreenElement: {},
		exitFullscreen: async () => {
			exited = true
		},
		documentElement: {
			requestFullscreen: async () => {
				throw new Error('should not request')
			},
		},
	}

	const result = await toggleDocumentFullscreen(doc)

	assert.equal(result, false)
	assert.equal(exited, true)
})

test('toggleDocumentFullscreen returns false when fullscreen is unsupported', async () => {
	const result = await toggleDocumentFullscreen({
		fullscreenElement: null,
		exitFullscreen: undefined,
		documentElement: {
			requestFullscreen: undefined,
		},
	})

	assert.equal(result, false)
})
