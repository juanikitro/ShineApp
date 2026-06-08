import assert from 'node:assert/strict'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CrossfadeSwap } from './CrossfadeSwap'

afterEach(cleanup)

test('shows skeleton when loading is true', () => {
	render(
		<CrossfadeSwap
			loading
			skeleton={<div data-testid="skeleton">cargando</div>}
		>
			<div data-testid="content">listo</div>
		</CrossfadeSwap>,
	)
	assert.ok(screen.getByTestId('skeleton'))
	assert.equal(screen.queryByTestId('content'), null)
})

test('shows content when loading is false', () => {
	render(
		<CrossfadeSwap
			loading={false}
			skeleton={<div data-testid="skeleton">cargando</div>}
		>
			<div data-testid="content">listo</div>
		</CrossfadeSwap>,
	)
	assert.ok(screen.getByTestId('content'))
	assert.equal(screen.queryByTestId('skeleton'), null)
})
