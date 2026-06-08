import assert from 'node:assert/strict'

import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, test } from 'vitest'

import { AnimatedNumber } from './AnimatedNumber'

function setReducedMotion(reduce: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			matches: query.includes('reduce') ? reduce : false,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}),
	})
}

beforeEach(() => {
	setReducedMotion(false)
})

afterEach(cleanup)

test('renders the final value after animation completes', async () => {
	const { container } = render(
		<AnimatedNumber value={1500} durationMs={80} />,
	)
	const expected = (1500).toLocaleString('es-AR')
	await waitFor(() => {
		const span = container.querySelector('span')
		assert.ok(span)
		assert.equal(span!.textContent, expected)
	})
})

test('respects a custom format function and keeps locale formatting', async () => {
	const format = (value: number) =>
		`$${Math.round(value).toLocaleString('es-AR')}`
	const { container } = render(
		<AnimatedNumber value={2500} format={format} durationMs={80} />,
	)
	await waitFor(() => {
		const span = container.querySelector('span')
		assert.ok(span)
		assert.equal(span!.textContent, '$2.500')
	})
})

test('skips animation under prefers-reduced-motion and shows final value immediately', () => {
	setReducedMotion(true)
	const { container } = render(
		<AnimatedNumber value={9999} durationMs={1000} />,
	)
	const span = container.querySelector('span')
	assert.ok(span)
	assert.equal(span!.textContent, (9999).toLocaleString('es-AR'))
})

test('skips animation on mount when animateOnMount is false', () => {
	const { container } = render(
		<AnimatedNumber value={777} durationMs={1000} animateOnMount={false} />,
	)
	const span = container.querySelector('span')
	assert.ok(span)
	assert.equal(span!.textContent, (777).toLocaleString('es-AR'))
})

test('animates from previous value when value updates', async () => {
	const { container, rerender } = render(
		<AnimatedNumber value={100} durationMs={60} animateOnMount={false} />,
	)
	rerender(<AnimatedNumber value={500} durationMs={60} animateOnMount={false} />)

	await waitFor(() => {
		const span = container.querySelector('span')
		assert.ok(span)
		assert.equal(span!.textContent, (500).toLocaleString('es-AR'))
	})
})

test('renders 0 for non-finite input values without crashing', () => {
	const { container } = render(
		<AnimatedNumber value={Number.NaN} animateOnMount={false} />,
	)
	const span = container.querySelector('span')
	assert.ok(span)
	assert.equal(span!.textContent, (0).toLocaleString('es-AR'))
})
