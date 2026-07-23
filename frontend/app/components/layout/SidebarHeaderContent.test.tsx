import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { SidebarHeaderContent } from './SidebarHeaderContent'

afterEach(cleanup)

function renderHeader(overrides = {}) {
	const onOpenBusinessSettings = vi.fn()
	const onSubmitQuery = vi.fn()
	const onOpenResult = vi.fn()
	const props = {
		showBusinessProfile: true,
		businessName: 'Shine Auto',
		businessImageAlt: 'Shine Auto',
		businessLogoSrc: '/logo.png',
		businessSlug: 'shine-auto',
		collapsed: false,
		onOpenBusinessSettings,
		onSubmitQuery,
		onOpenResult,
		...overrides,
	} as Parameters<typeof SidebarHeaderContent>[0]

	return {
		...render(<SidebarHeaderContent {...props} />),
		onOpenBusinessSettings,
		onSubmitQuery,
		onOpenResult,
	}
}

test('SidebarHeaderContent preserves the public business link and expanded search', () => {
	renderHeader()
	const link = screen.getByRole('link', {
		name: 'Abrir turnera de Shine Auto',
	})
	const image = screen.getByRole('img', { name: 'Shine Auto' })

	assert.equal(link.getAttribute('href'), '/publica/shine-auto')
	assert.equal(link.getAttribute('target'), '_blank')
	assert.equal(link.getAttribute('rel'), 'noreferrer')
	assert.equal(image.getAttribute('src'), '/logo.png')
	assert.ok(screen.getByRole('combobox', { name: 'Búsqueda global' }))
})

test('SidebarHeaderContent preserves business settings and collapsed/no-logo branches', () => {
	const { onOpenBusinessSettings, rerender } = renderHeader({
		businessSlug: null,
		collapsed: true,
	})
	const settings = screen.getByRole('button', {
		name: 'Abrir configuracion de Shine Auto',
	})

	fireEvent.click(settings)
	assert.equal(onOpenBusinessSettings.mock.calls.length, 1)
	assert.ok(screen.getByRole('button', { name: 'Abrir búsqueda global' }))

	rerender(
		<SidebarHeaderContent
			showBusinessProfile={false}
			businessName="Shine Auto"
			businessImageAlt="Shine Auto"
			businessLogoSrc="/logo.png"
			businessSlug={null}
			collapsed={true}
			onOpenBusinessSettings={onOpenBusinessSettings}
			onSubmitQuery={vi.fn()}
			onOpenResult={vi.fn()}
		/>,
	)
	assert.equal(
		screen.queryByRole('button', {
			name: 'Abrir configuracion de Shine Auto',
		}),
		null,
	)
})
