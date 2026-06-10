import assert from 'node:assert/strict'

import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { RiskMeter } from './RiskMeter'

afterEach(cleanup)

test('renders one segment per non-zero bucket, colored by risk', () => {
	const { container } = render(
		<RiskMeter
			buckets={[
				{ id: '0_7', amount: 100 },
				{ id: '31_plus', amount: 300 },
			]}
		/>,
	)
	const segments = container.querySelectorAll('.risk-meter > span')
	assert.equal(segments.length, 2)
	assert.ok(segments[0].className.includes('risk-seg--fresh'))
	assert.ok(segments[1].className.includes('risk-seg--high'))
	// Ancho proporcional al total (400).
	assert.equal((segments[0] as HTMLElement).style.width, '25%')
	assert.equal((segments[1] as HTMLElement).style.width, '75%')
})

test('skips zero buckets', () => {
	const { container } = render(
		<RiskMeter
			buckets={[
				{ id: '0_7', amount: 0 },
				{ id: '8_15', amount: 50 },
			]}
		/>,
	)
	assert.equal(container.querySelectorAll('.risk-meter > span').length, 1)
})

test('renders nothing when there is nothing to collect', () => {
	const { container } = render(<RiskMeter buckets={[{ id: '0_7', amount: 0 }]} />)
	assert.equal(container.querySelector('.risk-meter'), null)
})
