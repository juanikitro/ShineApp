import assert from 'node:assert/strict'

import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CajaSparkline } from './CajaSparkline'

afterEach(cleanup)

test('draws positive and negative polylines plus a zero baseline', () => {
	const { container } = render(<CajaSparkline values={[100, -50, 80]} />)
	assert.ok(container.querySelector('.caja-spark-pos'))
	assert.ok(container.querySelector('.caja-spark-neg'))
	assert.ok(container.querySelector('.caja-spark-base'))
	const positive = container.querySelector('.caja-spark-pos')
	assert.equal(
		positive!.getAttribute('points')!.trim().split(/\s+/).length,
		3,
	)
})

test('renders nothing for fewer than two points', () => {
	const { container } = render(<CajaSparkline values={[42]} />)
	assert.equal(container.querySelector('svg'), null)
})
