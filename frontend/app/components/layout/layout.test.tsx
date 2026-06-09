import assert from 'node:assert/strict'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Car, Users } from 'lucide-react'
import { test } from 'vitest'

import { AppBrand } from './AppBrand'
import { AppShell } from './AppShell'
import { PageHeader } from './PageHeader'
import { SidebarNav } from './SidebarNav'

test('AppBrand switches logo and text for expanded and collapsed states', () => {
	const { container, rerender } = render(
		<AppBrand subtitle="Operacion diaria" themeMode="dark" titleAs="h1" />,
	)

	assert.equal(screen.getByRole('heading', { name: 'ShineApp' }).tagName, 'H1')
	assert.equal(screen.getByText('Operacion diaria').className, 'app-brand-subtitle')
	assert.match(container.querySelector('.app-brand-logo')?.getAttribute('src') ?? '', /shineapp-logo-dark/)

	rerender(<AppBrand collapsed />)

	assert.equal(screen.queryByText('ShineApp'), null)
	assert.equal(screen.getByRole('img', { name: 'ShineApp' }).getAttribute('alt'), 'ShineApp')
})

test('SidebarNav exposes active state, collapsed labels and capped badges', async () => {
	const user = userEvent.setup()
	const selected: string[] = []

	const { rerender } = render(
		<SidebarNav
			header={<strong>Header</strong>}
			footer={<span>Footer</span>}
			items={[{ key: 'cars', label: 'Vehiculos', icon: Car, badge: 120 }]}
			active="cars"
			onChange={(key) => selected.push(key)}
		/>,
	)

	const item = screen.getByRole('button', { name: 'Vehiculos' })
	assert.equal(item.getAttribute('aria-current'), 'page')
	assert.equal(screen.getByLabelText('120 pendientes').textContent, '99+')
	assert.ok(screen.getByText('Header'))
	assert.ok(screen.getByText('Footer'))

	await user.click(item)
	assert.deepEqual(selected, ['cars'])

	rerender(
		<SidebarNav
			collapsed
			mobileOpen
			items={[{ key: 'cars', label: 'Vehiculos', icon: Car }]}
			active="dashboard"
			onChange={(key) => selected.push(key)}
		/>,
	)

	assert.equal(screen.queryByText('Vehiculos'), null)
	assert.equal(screen.getByLabelText('Navegacion principal').getAttribute('data-collapsed'), 'true')
	assert.equal(screen.getByLabelText('Navegacion principal').getAttribute('data-mobile-open'), 'true')
})

test('SidebarNav chevron toggles a group without navigating, while the item navigates and opens', async () => {
	const user = userEvent.setup()
	const selected: string[] = []

	render(
		<SidebarNav
			items={[
				{
					key: 'customers',
					label: 'Clientes',
					icon: Users,
					children: [{ key: 'vehicles', label: 'Vehiculos', icon: Car }],
				},
			]}
			active="dashboard"
			onChange={(key) => selected.push(key)}
		/>,
	)

	// Group starts collapsed because neither it nor its children are active.
	assert.equal(screen.queryByRole('button', { name: 'Vehiculos' }), null)

	// Clicking the chevron opens the group without navigating.
	await user.click(screen.getByRole('button', { name: 'Expandir Clientes' }))
	assert.ok(screen.getByRole('button', { name: 'Vehiculos' }))
	assert.deepEqual(selected, [])

	// Clicking it again collapses the group, still without navigating.
	await user.click(screen.getByRole('button', { name: 'Contraer Clientes' }))
	assert.equal(screen.queryByRole('button', { name: 'Vehiculos' }), null)
	assert.deepEqual(selected, [])

	// Clicking the item itself navigates to its page and opens the group.
	await user.click(screen.getByRole('button', { name: 'Clientes' }))
	assert.deepEqual(selected, ['customers'])
	assert.ok(screen.getByRole('button', { name: 'Vehiculos' }))
})

test('AppShell and PageHeader render structured workspace regions', () => {
	render(
		<AppShell sidebar={<aside>Menu</aside>} sidebarOverlay={<button>Overlay</button>} theme="dark">
			<PageHeader
				title="Agenda"
				subtitle="Reservas del dia"
				titleAddon={<span>Lavado</span>}
				actions={<button>Nuevo</button>}
			/>
		</AppShell>,
	)

	assert.equal(screen.getByRole('main').getAttribute('data-theme'), 'dark')
	assert.ok(screen.getByText('Menu'))
	assert.ok(screen.getByRole('button', { name: 'Overlay' }))
	assert.ok(screen.getByRole('heading', { name: 'Agenda' }))
	assert.ok(screen.getByText('Reservas del dia'))
	assert.ok(screen.getByText('Lavado'))
	assert.ok(screen.getByRole('button', { name: 'Nuevo' }))
})

test('PageHeader keeps optional areas absent when no secondary content is provided', () => {
	const { container } = render(<PageHeader title="Clientes" />)

	assert.ok(screen.getByRole('heading', { name: 'Clientes' }))
	assert.equal(container.querySelector('.page-title-row span'), null)
	assert.equal(container.querySelector('.page-intro p'), null)
	assert.equal(container.querySelector('.page-actions'), null)
})
