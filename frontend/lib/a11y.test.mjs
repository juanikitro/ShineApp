import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadA11yModule() {
	const sourcePath = resolve('lib/a11y.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const { FOCUSABLE_SELECTOR, isFocusableElement, wrappedFocusIndex } =
	loadA11yModule()

test('focusable selector covers interactive controls and explicit tabindex', () => {
	assert.match(FOCUSABLE_SELECTOR, /button:not\(\[disabled\]\)/)
	assert.match(FOCUSABLE_SELECTOR, /input:not\(\[disabled\]\)/)
	assert.match(FOCUSABLE_SELECTOR, /\[tabindex\]:not\(\[tabindex="-1"\]\)/)
})

test('filters disabled, hidden, aria-hidden and visually detached elements', () => {
	const visible = {
		hasAttribute: () => false,
		getAttribute: () => null,
		offsetParent: {},
	}
	const hidden = {
		hasAttribute: (name) => name === 'hidden',
		getAttribute: () => null,
		offsetParent: {},
	}
	const ariaHidden = {
		hasAttribute: () => false,
		getAttribute: (name) => (name === 'aria-hidden' ? 'true' : null),
		offsetParent: {},
	}
	const detached = {
		hasAttribute: () => false,
		getAttribute: () => null,
		offsetParent: null,
	}
	const fixedVisible = {
		hasAttribute: () => false,
		getAttribute: () => null,
		offsetParent: null,
		getClientRects: () => [{ width: 40, height: 40 }],
	}

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
