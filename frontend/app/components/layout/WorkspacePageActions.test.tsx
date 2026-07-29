import assert from 'node:assert/strict'
import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { WorkspacePageActions } from './WorkspacePageActions'

afterEach(cleanup)

function renderActions(overrides = {}) {
	const onToggleMobileMenu = vi.fn()
	const onCreateReservation = vi.fn()
	const onRefresh = vi.fn()
	const props = {
		mobileToggleRef: createRef<HTMLButtonElement>(),
		sidebarNavId: 'sidebar-nav',
		mobileOpen: false,
		onToggleMobileMenu,
		showCreateReservation: false,
		onCreateReservation,
		refreshLabel: 'Actualizar clientes',
		onRefresh,
		loading: false,
		...overrides,
	} as Parameters<typeof WorkspacePageActions>[0]

	return {
		...render(<WorkspacePageActions {...props} />),
		onToggleMobileMenu,
		onCreateReservation,
		onRefresh,
	}
}

test('WorkspacePageActions preserves menu and refresh controls', () => {
	const { onToggleMobileMenu, onRefresh } = renderActions()
	const menu = screen.getByRole('button', { name: 'Abrir menu lateral' })

	assert.equal(menu.getAttribute('aria-controls'), 'sidebar-nav')
	assert.equal(menu.getAttribute('aria-expanded'), 'false')
	assert.equal(screen.queryByRole('button', { name: 'Crear reserva para el dia seleccionado' }), null)
	fireEvent.click(menu)
	fireEvent.click(screen.getByRole('button', { name: 'Actualizar clientes' }))
	assert.equal(onToggleMobileMenu.mock.calls.length, 1)
	assert.equal(onRefresh.mock.calls.length, 1)
})

test('WorkspacePageActions preserves open menu, create and loading branches', () => {
	const { onCreateReservation } = renderActions({
		mobileOpen: true,
		showCreateReservation: true,
		refreshLabel: 'Actualizar agenda',
		loading: true,
	})
	const refresh = screen.getByRole('button', {
		name: 'Actualizar agenda',
	}) as HTMLButtonElement

	assert.equal(screen.getByRole('button', { name: 'Cerrar menu lateral' }).getAttribute('aria-expanded'), 'true')
	assert.equal(refresh.disabled, true)
	fireEvent.click(screen.getByRole('button', { name: 'Crear reserva para el dia seleccionado' }))
	assert.equal(onCreateReservation.mock.calls.length, 1)
})
