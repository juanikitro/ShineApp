import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { renderProfileModal } from './ProfileModalLayer'

afterEach(cleanup)

test('renderProfileModal preserves profile and empty-user branches', () => {
	const profile = render(
		renderProfileModal({
			hasCurrentUser: true,
			onClose: () => {},
			renderProfile: () => <span>Perfil cargado</span>,
		}),
	)
	assert.ok(screen.getByRole('dialog', { name: 'Mi perfil' }))
	assert.ok(screen.getByText('Perfil cargado'))
	profile.unmount()

	render(
		renderProfileModal({
			hasCurrentUser: false,
			onClose: () => {},
			renderProfile: () => <span>Perfil cargado</span>,
		}),
	)
	assert.ok(screen.getByRole('dialog', { name: 'Mi perfil' }))
	assert.equal(screen.queryByText('Perfil cargado'), null)
})
