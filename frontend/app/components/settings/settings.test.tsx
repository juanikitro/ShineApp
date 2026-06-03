import assert from 'node:assert/strict'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test } from 'vitest'

import { NewsSettingsPanel } from './SettingsWorkspace'

test('NewsSettingsPanel renders the panel heading and kicker', () => {
	render(<NewsSettingsPanel />)
	assert.ok(screen.getByRole('heading', { name: 'Novedades' }))
	assert.ok(screen.getByText('Sistema'))
	assert.ok(screen.getByText('Cambios funcionales recientes de ShineApp.'))
})

test('NewsSettingsPanel shows "Ultima version" for the first date group', () => {
	render(<NewsSettingsPanel />)
	assert.ok(screen.getByText('Ultima version'))
})

test('NewsSettingsPanel first group is expanded by default showing its items', () => {
	const { container } = render(<NewsSettingsPanel />)
	// The expanded group renders .changelog-items
	assert.ok(container.querySelector('.changelog-items'))
})

test('NewsSettingsPanel collapses the active group when its header is clicked', async () => {
	const user = userEvent.setup()
	const { container } = render(<NewsSettingsPanel />)

	// Items visible initially
	assert.ok(container.querySelector('.changelog-items'))

	// Click the expanded header (first button)
	const [firstBtn] = screen.getAllByRole('button')
	await user.click(firstBtn)

	// Items gone after collapse
	assert.equal(container.querySelector('.changelog-items'), null)
})

test('NewsSettingsPanel expands a different group when its header is clicked', async () => {
	const user = userEvent.setup()
	const { container } = render(<NewsSettingsPanel />)

	const buttons = screen.getAllByRole('button')
	if (buttons.length < 2) {
		// Only one date group in changelog — skip multi-group check
		return
	}

	// Collapse first, then expand second
	await user.click(buttons[0])
	assert.equal(container.querySelector('.changelog-items'), null)

	await user.click(buttons[1])
	assert.ok(container.querySelector('.changelog-items'))
})

test('NewsSettingsPanel renders at least one date group button', () => {
	render(<NewsSettingsPanel />)
	const buttons = screen.getAllByRole('button')
	assert.ok(buttons.length >= 1)
})
