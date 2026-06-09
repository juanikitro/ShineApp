import assert from 'node:assert/strict'

import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { Sparkline } from './Sparkline'

afterEach(cleanup)

function polylinePoints(container: HTMLElement) {
	const polyline = container.querySelector('polyline')
	assert.ok(polyline)
	return polyline!.getAttribute('points')!.trim().split(/\s+/)
}

test('renders one point per finite value', () => {
	const { container } = render(<Sparkline values={[10, 30, 20, 40]} />)
	assert.equal(polylinePoints(container).length, 4)
})

test('renders nothing for fewer than two points', () => {
	const { container } = render(<Sparkline values={[42]} />)
	assert.equal(container.querySelector('svg'), null)
})

test('drops non-finite values before plotting', () => {
	const { container } = render(<Sparkline values={[1, Number.NaN, 3]} />)
	assert.equal(polylinePoints(container).length, 2)
})

test('centers a flat series at half the height instead of collapsing it', () => {
	const { container } = render(<Sparkline values={[5, 5, 5]} height={28} />)
	for (const pair of polylinePoints(container)) {
		assert.equal(Number(pair.split(',')[1]), 14)
	}
})
