import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

import {
	FOCUSABLE_SELECTOR,
	focusElementIfAvailable,
	focusFirstElement,
	getFocusableElements,
	isFocusableElement,
	trapFocusWithin,
	wrappedFocusIndex,
} from './a11y'

test('focusable selector covers interactive controls and explicit tabindex', () => {
	assert.match(FOCUSABLE_SELECTOR, /button:not\(\[disabled\]\)/)
	assert.match(FOCUSABLE_SELECTOR, /input:not\(\[disabled\]\)/)
	assert.match(FOCUSABLE_SELECTOR, /\[tabindex\]:not\(\[tabindex="-1"\]\)/)
})

test('filters disabled, hidden, aria-hidden and visually detached elements', () => {
	const visible = document.createElement('button')
	const hidden = document.createElement('button')
	hidden.hidden = true
	const ariaHidden = document.createElement('button')
	ariaHidden.setAttribute('aria-hidden', 'true')
	const detached = document.createElement('button')
	const fixedVisible = document.createElement('button')

	document.body.append(visible, hidden, ariaHidden, fixedVisible)
	Object.defineProperty(visible, 'offsetParent', { value: document.body })
	Object.defineProperty(hidden, 'offsetParent', { value: document.body })
	Object.defineProperty(ariaHidden, 'offsetParent', { value: document.body })
	Object.defineProperty(detached, 'offsetParent', { value: null })
	Object.defineProperty(fixedVisible, 'offsetParent', { value: null })
	visible.getClientRects = () => [{ width: 40, height: 40 }]
	fixedVisible.getClientRects = () => [{ width: 40, height: 40 }]

	assert.equal(isFocusableElement(visible), true)
	assert.equal(isFocusableElement(hidden), false)
	assert.equal(isFocusableElement(ariaHidden), false)
	assert.equal(isFocusableElement(detached), false)
	assert.equal(isFocusableElement(fixedVisible), true)
})

test('wraps focus at trap boundaries and when focus starts outside', () => {
	assert.equal(
		wrappedFocusIndex({
			currentIndex: 2,
			focusableCount: 3,
			shiftKey: false,
		}),
		0,
	)
	assert.equal(
		wrappedFocusIndex({
			currentIndex: 0,
			focusableCount: 3,
			shiftKey: true,
		}),
		2,
	)
	assert.equal(
		wrappedFocusIndex({
			currentIndex: -1,
			focusableCount: 3,
			shiftKey: false,
		}),
		0,
	)
	assert.equal(
		wrappedFocusIndex({
			currentIndex: 1,
			focusableCount: 3,
			shiftKey: false,
		}),
		null,
	)
})

test('focus helpers target the first available element or the root fallback', () => {
	const root = document.createElement('div')
	const button = document.createElement('button')
	const hidden = document.createElement('button')
	hidden.style.visibility = 'hidden'
	root.tabIndex = -1
	document.body.append(root)
	root.append(hidden, button)
	button.getClientRects = () => [{ width: 10, height: 10 }]
	hidden.getClientRects = () => [{ width: 10, height: 10 }]

	assert.deepEqual(getFocusableElements(root), [button])
	assert.equal(focusFirstElement(root), true)
	assert.equal(document.activeElement, button)
	assert.equal(focusFirstElement(null), false)

	const detached = document.createElement('button')
	assert.equal(focusElementIfAvailable(detached), false)
	assert.equal(focusElementIfAvailable(button), true)
	assert.equal(document.activeElement, button)
})

test('trapFocusWithin loops tab focus and protects empty focus traps', () => {
	const root = document.createElement('div')
	const first = document.createElement('button')
	const last = document.createElement('button')
	root.tabIndex = -1
	document.body.append(root)
	root.append(first, last)
	first.getClientRects = () => [{ width: 10, height: 10 }]
	last.getClientRects = () => [{ width: 10, height: 10 }]

	first.focus()
	const middleEvent = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() }
	assert.equal(trapFocusWithin(middleEvent, root), false)
	assert.equal(middleEvent.preventDefault.mock.calls.length, 0)

	last.focus()
	const forwardEvent = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() }
	assert.equal(trapFocusWithin(forwardEvent, root), true)
	assert.equal(document.activeElement, first)
	assert.equal(forwardEvent.preventDefault.mock.calls.length, 1)

	const reverseEvent = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() }
	assert.equal(trapFocusWithin(reverseEvent, root), true)
	assert.equal(document.activeElement, last)

	const emptyRoot = document.createElement('div')
	emptyRoot.tabIndex = -1
	document.body.append(emptyRoot)
	const emptyEvent = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() }
	assert.equal(trapFocusWithin(emptyEvent, emptyRoot), true)
	assert.equal(document.activeElement, emptyRoot)

	const escapeEvent = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() }
	assert.equal(trapFocusWithin(escapeEvent, emptyRoot), false)
})
