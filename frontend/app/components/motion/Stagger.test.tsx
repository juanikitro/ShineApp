import assert from 'node:assert/strict'

import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { Stagger, StaggerItem } from './Stagger'

afterEach(cleanup)

test('Stagger renders children inside a container element with given className', () => {
	const { container } = render(
		<Stagger className="my-grid" aria-label="lista">
			<StaggerItem className="row">a</StaggerItem>
			<StaggerItem className="row">b</StaggerItem>
		</Stagger>,
	)
	const root = container.querySelector('.my-grid')
	assert.ok(root)
	const rows = container.querySelectorAll('.row')
	assert.equal(rows.length, 2)
	assert.equal(rows[0]!.textContent, 'a')
	assert.equal(rows[1]!.textContent, 'b')
})

test('Stagger forwards accessibility attributes', () => {
	const { container } = render(
		<Stagger
			className="grid"
			role="status"
			aria-live="polite"
			aria-label="Cargando rankings"
		>
			<StaggerItem>1</StaggerItem>
		</Stagger>,
	)
	const root = container.querySelector('.grid') as HTMLElement
	assert.ok(root)
	assert.equal(root.getAttribute('role'), 'status')
	assert.equal(root.getAttribute('aria-live'), 'polite')
	assert.equal(root.getAttribute('aria-label'), 'Cargando rankings')
})
