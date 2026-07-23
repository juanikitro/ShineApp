import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('next/image', () => ({
	default: ({ unoptimized: _, ...props }: any) => <img {...props} />,
}))

import { SidebarFooterContent } from './SidebarFooterContent'

afterEach(cleanup)

function renderFooter(overrides = {}) {
	const onToggleTheme = vi.fn()
	const onToggleFullscreen = vi.fn()
	const onToggleSidebar = vi.fn()
	const onOpenProfile = vi.fn()
	const props = {
		themeMode: 'dark' as const,
		collapsed: false,
		mobileOpen: false,
		sidebarNavId: 'sidebar-nav',
		onToggleTheme,
		fullscreenActive: false,
		fullscreenSupported: true,
		onToggleFullscreen,
		onToggleSidebar,
		onOpenProfile,
		currentUser: {
			username: 'ana',
			role: 'empleado',
			avatar_url: '',
			trial_ends_at: '2026-07-31',
		},
		safeAvatarUrl: null,
		avatarIsPdf: false,
		safeAvatarPdfThumbnail: null,
		...overrides,
	} as Parameters<typeof SidebarFooterContent>[0]

	return {
		...render(<SidebarFooterContent {...props} />),
		onToggleTheme,
		onToggleFullscreen,
		onToggleSidebar,
		onOpenProfile,
	}
}

test('SidebarFooterContent preserves expanded theme, fullscreen, profile and callbacks', () => {
	const {
		onToggleTheme,
		onToggleFullscreen,
		onToggleSidebar,
		onOpenProfile,
	} = renderFooter()
	const theme = screen.getByRole('button', { name: 'Cambiar a modo claro' })
	const fullscreen = screen.getByRole('button', {
		name: 'Activar pantalla completa',
	})
	const sidebar = screen.getByRole('button', { name: 'Colapsar sidebar' })
	const profile = screen.getByRole('button', { name: 'Abrir perfil de ana' })

	assert.equal(theme.getAttribute('aria-pressed'), 'true')
	assert.equal(sidebar.getAttribute('aria-controls'), 'sidebar-nav')
	assert.equal(sidebar.getAttribute('aria-expanded'), 'true')
	assert.equal(screen.getByText('ana').tagName, 'STRONG')
	assert.equal(screen.getByText('Empleado').tagName, 'SPAN')
	assert.ok(screen.getByText(/Prueba activa hasta/))
	assert.equal(screen.getByText('A').closest('.sidebar-profile-avatar') !== null, true)

	fireEvent.click(theme)
	fireEvent.click(fullscreen)
	fireEvent.click(sidebar)
	fireEvent.click(profile)
	assert.equal(onToggleTheme.mock.calls.length, 1)
	assert.equal(onToggleFullscreen.mock.calls.length, 1)
	assert.equal(onToggleSidebar.mock.calls.length, 1)
	assert.equal(onOpenProfile.mock.calls.length, 1)
})

test('SidebarFooterContent preserves compact/mobile, avatar source and disabled fullscreen branches', () => {
	const { container, rerender } = renderFooter({
		themeMode: 'light',
		collapsed: true,
		mobileOpen: true,
		fullscreenActive: true,
		fullscreenSupported: false,
		currentUser: {
			username: 'beto',
			role: 'empleador',
			avatar_url: '/avatar.png',
		},
		safeAvatarUrl: '/avatar.png',
		avatarIsPdf: false,
	})
	const theme = screen.getByRole('button', { name: 'Cambiar a modo oscuro' })
	const fullscreen = screen.getByRole('button', {
		name: 'Salir de pantalla completa',
	}) as HTMLButtonElement
	const sidebar = screen.getByRole('button', { name: 'Cerrar menu lateral' })

	assert.equal(theme.classList.contains('theme-switch--compact'), true)
	assert.equal(fullscreen.disabled, true)
	assert.equal(sidebar.getAttribute('aria-expanded'), 'true')
	assert.equal(screen.queryByText('beto'), null)
	assert.equal(
		container
			.querySelector<HTMLImageElement>('.sidebar-profile-avatar img')
			?.getAttribute('src'),
		'/avatar.png',
	)

	rerender(
		<SidebarFooterContent
			themeMode="light"
			collapsed={false}
			mobileOpen={false}
			sidebarNavId="sidebar-nav"
			onToggleTheme={vi.fn()}
			fullscreenActive={false}
			fullscreenSupported={true}
			onToggleFullscreen={vi.fn()}
			onToggleSidebar={vi.fn()}
			onOpenProfile={vi.fn()}
			currentUser={{ username: 'beto', avatar_url: '/avatar.pdf' }}
			safeAvatarUrl="/avatar.pdf"
			avatarIsPdf={true}
			safeAvatarPdfThumbnail="/avatar-thumbnail.png"
		/>,
	)
	assert.equal(
		container
			.querySelector<HTMLImageElement>('.sidebar-profile-avatar img')
			?.getAttribute('src'),
		'/avatar-thumbnail.png',
	)
})
