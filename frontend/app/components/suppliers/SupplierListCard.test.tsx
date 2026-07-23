import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { SupplierListCard } from './SupplierListCard'

afterEach(cleanup)

function renderCard(overrides = {}) {
	const onOpenDashboard = vi.fn()
	const onNewPurchase = vi.fn()
	const onEdit = vi.fn()
	const onDeactivate = vi.fn()
	const onContextMenu = vi.fn()
	const money = vi.fn((value) => `$${value}`)
	const formatDateLabel = vi.fn(() => '01/07/2026')
	const props = {
		supplier: { id: 1, name: 'ACME', is_active: false },
		insights: {
			total_purchased: 1200,
			purchase_count: 2,
			last_purchase_on: '2026-07-01',
			materials_count: 3,
			pending_reception_count: 1,
		},
		recordClassName: 'supplier-record',
		quickActionProps: { onContextMenu },
		subtitle: 'Contacto - 3624',
		canOpenDashboard: true,
		onOpenDashboard,
		onNewPurchase,
		onEdit,
		onDeactivate,
		quickActionsTrigger: <button type="button">Acciones rapidas</button>,
		money,
		formatDateLabel,
		...overrides,
	} as Parameters<typeof SupplierListCard>[0]

	return {
		...render(<SupplierListCard {...props} />),
		onOpenDashboard,
		onNewPurchase,
		onEdit,
		onDeactivate,
		onContextMenu,
		money,
		formatDateLabel,
	}
}

test('SupplierListCard preserves insights, actions, dashboard target and quick-action target', () => {
	const {
		container,
		onOpenDashboard,
		onNewPurchase,
		onEdit,
		onDeactivate,
		onContextMenu,
		money,
		formatDateLabel,
	} = renderCard()
	const card = container.querySelector('.supplier-record')!

	assert.ok(screen.getByText('Contacto - 3624'))
	assert.ok(screen.getByText(/Comprado \$1200 - 2 compras - ultima 01\/07\/2026 - 3 materiales/))
	assert.ok(screen.getByText('Inactivo - 1 compras pendientes de recepcion'))
	assert.deepEqual(money.mock.calls, [[1200]])
	assert.deepEqual(formatDateLabel.mock.calls, [['2026-07-01']])

	fireEvent.click(screen.getByRole('button', { name: 'Abrir proveedor ACME' }))
	fireEvent.click(screen.getByRole('button', { name: 'Nueva compra' }))
	fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
	fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
	fireEvent.contextMenu(card)
	assert.equal(onOpenDashboard.mock.calls.length, 1)
	assert.equal(onNewPurchase.mock.calls.length, 1)
	assert.equal(onEdit.mock.calls.length, 1)
	assert.equal(onDeactivate.mock.calls.length, 1)
	assert.equal(onContextMenu.mock.calls.length, 1)
})

test('SupplierListCard preserves inactive dashboard and empty insight branches', () => {
	renderCard({
		supplier: { id: 1, name: 'ACME', is_active: true },
		insights: { total_purchased: 0 },
		canOpenDashboard: false,
	})

	assert.equal(screen.queryByRole('button', { name: 'Abrir proveedor ACME' }), null)
	assert.ok(screen.getByText('Activo - sin recepcion pendiente'))
})
