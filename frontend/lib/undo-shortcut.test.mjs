import assert from 'node:assert/strict'
import { test } from 'vitest'

import { shouldHandleUndoShortcut } from './undo-shortcut'

test('detects ctrl or meta z as the app-level undo shortcut', () => {
	assert.equal(shouldHandleUndoShortcut({ ctrlKey: true, key: 'z' }), true)
	assert.equal(shouldHandleUndoShortcut({ metaKey: true, key: 'Z' }), true)
	assert.equal(shouldHandleUndoShortcut({ ctrlKey: true, key: 'y' }), false)
	assert.equal(
		shouldHandleUndoShortcut({ ctrlKey: true, shiftKey: true, key: 'z' }),
		false,
	)
})

test('keeps native undo available inside editable fields', () => {
	const input = document.createElement('input')
	const textarea = document.createElement('textarea')
	const editable = document.createElement('div')
	editable.setAttribute('contenteditable', 'true')
	document.body.append(input, textarea, editable)

	assert.equal(
		shouldHandleUndoShortcut({ ctrlKey: true, key: 'z', target: input }),
		false,
	)
	assert.equal(
		shouldHandleUndoShortcut({ ctrlKey: true, key: 'z', target: textarea }),
		false,
	)
	assert.equal(
		shouldHandleUndoShortcut({ ctrlKey: true, key: 'z', target: editable }),
		false,
	)
})
