import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { QuickActionsTrigger } from './QuickActionsTrigger'

afterEach(cleanup)

test('QuickActionsTrigger preserves the visible trigger markup and callback', () => {
	const actions = [{ id: 'edit', label: 'Editar', onSelect: () => {} }]
	const calls: Array<{ title: string; actions: typeof actions }> = []

	render(
		<QuickActionsTrigger
			title="Acciones del registro"
			actions={actions}
			ariaLabel="Abrir acciones del registro"
			onOpen={(_event, title, nextActions) => {
				calls.push({ title, actions: nextActions })
			}}
		/>,
	)

	const trigger = screen.getByRole('button', {
		name: 'Abrir acciones del registro',
	})

	assert.equal(trigger.className, 'ghost icon-button quick-actions-trigger')
	assert.equal(trigger.getAttribute('title'), 'Abrir acciones del registro')
	fireEvent.click(trigger)
	assert.deepEqual(calls, [{ title: 'Acciones del registro', actions }])
})

test('QuickActionsTrigger remains absent when every action is hidden', () => {
	render(
		<QuickActionsTrigger
			title="Acciones"
			actions={[{ id: 'hidden', label: 'Oculta', hidden: true, onSelect: () => {} }]}
			onOpen={() => {}}
		/>,
	)

	assert.equal(screen.queryByRole('button'), null)
})
