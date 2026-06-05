import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	SkeletonCard,
	SkeletonLine,
	SkeletonList,
	SkeletonMetric,
	SkeletonRow,
} from './Skeleton'

afterEach(cleanup)

test('SkeletonLine applies width and height inline styles', () => {
	const { container } = render(<SkeletonLine width="80%" height={20} />)
	const span = container.querySelector('span.skeleton-line') as HTMLElement
	assert.ok(span)
	assert.equal(span.style.width, '80%')
	assert.equal(span.style.height, '20px')
	assert.equal(span.getAttribute('aria-hidden'), 'true')
})

test('SkeletonCard renders title line plus the requested number of body lines', () => {
	const { container } = render(<SkeletonCard lines={5} />)
	const lines = container.querySelectorAll('.skeleton-line')
	assert.equal(lines.length, 6)
})

test('SkeletonRow renders one line per column', () => {
	const { container } = render(<SkeletonRow columns={3} />)
	const lines = container.querySelectorAll('.skeleton-line')
	assert.equal(lines.length, 3)
})

test('SkeletonMetric renders label + value lines', () => {
	const { container } = render(<SkeletonMetric />)
	const lines = container.querySelectorAll('.skeleton-line')
	assert.equal(lines.length, 2)
})

test('SkeletonList exposes status role with polite live region', () => {
	render(<SkeletonList rows={4} columns={2} label="Cargando clientes" />)
	const status = screen.getByRole('status')
	assert.equal(status.getAttribute('aria-live'), 'polite')
	assert.equal(status.getAttribute('aria-label'), 'Cargando clientes')
})

test('SkeletonList renders rows * columns lines', () => {
	const { container } = render(<SkeletonList rows={3} columns={4} />)
	const lines = container.querySelectorAll('.skeleton-line')
	assert.equal(lines.length, 12)
})
