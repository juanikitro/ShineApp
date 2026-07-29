import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { SuppliersWorkspace } from './SuppliersWorkspace'

afterEach(cleanup)

const supplier = {
	id: 1,
	name: 'ACME',
	contact_name: 'Ana',
	phone: '3624',
	is_active: true,
}

function renderWorkspace(overrides = {}) {
	const onSearchChange = vi.fn()
	const onCreateSupplier = vi.fn()
	const onCreatePurchase = vi.fn()
	const onOpenDashboard = vi.fn()
	const onNewPurchaseForSupplier = vi.fn()
	const onEdit = vi.fn()
	const onDeactivate = vi.fn()
	const props = {
		suppliers: [supplier],
		search: '',
		onSearchChange,
		onCreateSupplier,
		onCreatePurchase,
		canViewEconomy: true,
		getRecordClassName: vi.fn(() => 'supplier-record'),
		quickActionTargetProps: vi.fn(() => ({})),
		supplierQuickActions: vi.fn(() => []),
		renderQuickActionsTrigger: vi.fn(() => null),
		onOpenDashboard,
		onNewPurchaseForSupplier,
		onEdit,
		onDeactivate,
		money: vi.fn(() => '$0'),
		formatDateLabel: vi.fn(),
		...overrides,
	} as Parameters<typeof SuppliersWorkspace>[0]

	return {
		...render(<SuppliersWorkspace {...props} />),
		onSearchChange,
		onCreateSupplier,
		onCreatePurchase,
		onOpenDashboard,
		onNewPurchaseForSupplier,
		onEdit,
		onDeactivate,
	}
}

test('SuppliersWorkspace preserves supplier list controls and parent callbacks', () => {
	const {
		onSearchChange,
		onCreateSupplier,
		onCreatePurchase,
		onOpenDashboard,
		onNewPurchaseForSupplier,
		onEdit,
		onDeactivate,
	} = renderWorkspace()

	fireEvent.change(
		screen.getByPlaceholderText('Buscar por proveedor, razon social, rubro, contacto o CUIT'),
		{ target: { value: 'ACME' } },
	)
	fireEvent.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
	fireEvent.click(screen.getAllByRole('button', { name: 'Nueva compra' })[0])
	fireEvent.click(screen.getByRole('button', { name: 'Abrir proveedor ACME' }))
	fireEvent.click(screen.getAllByRole('button', { name: 'Nueva compra' })[1])
	fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
	fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
	assert.deepEqual(onSearchChange.mock.calls, [['ACME']])
	assert.equal(onCreateSupplier.mock.calls.length, 1)
	assert.equal(onCreatePurchase.mock.calls.length, 1)
	assert.deepEqual(onOpenDashboard.mock.calls, [[supplier]])
	assert.deepEqual(onNewPurchaseForSupplier.mock.calls, [[supplier]])
	assert.deepEqual(onEdit.mock.calls, [[supplier]])
	assert.deepEqual(onDeactivate.mock.calls, [[supplier]])
})

test('SuppliersWorkspace preserves empty-search branch', () => {
	renderWorkspace({ suppliers: [], search: '' })

	assert.ok(screen.getByText('Sin proveedores.'))
	assert.ok(screen.getByText('Crea el primer proveedor para registrar compras.'))
})
