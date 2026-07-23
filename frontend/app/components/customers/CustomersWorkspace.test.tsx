import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { CustomersWorkspace } from './CustomersWorkspace'

afterEach(cleanup)

function renderWorkspace(overrides = {}) {
	const onCreate = vi.fn()
	const props = {
		showLoadingSkeleton: false,
		customers: [],
		loading: false,
		totalCustomers: 0,
		search: '',
		filter: 'all',
		filterOptions: [{ value: 'all', label: 'Todos' }],
		canViewEconomy: true,
		showReservationTimes: true,
		vehicleCountByCustomerId: new Map(),
		getRecordClassName: vi.fn(() => ''),
		onSearchChange: vi.fn(),
		onFilterChange: vi.fn(),
		onCreate,
		onOpenDashboard: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		onOpenQuickActions: vi.fn(),
		...overrides,
	} as Parameters<typeof CustomersWorkspace>[0]

	return {
		...render(<CustomersWorkspace {...props} />),
		onCreate,
	}
}

test('CustomersWorkspace preserves the initial loading skeleton', () => {
	renderWorkspace({ showLoadingSkeleton: true })

	assert.ok(screen.getByLabelText('Cargando clientes'))
	assert.equal(screen.queryByRole('button', { name: 'Nuevo cliente' }), null)
})

test('CustomersWorkspace preserves the customer list fallback and callbacks', () => {
	const { onCreate } = renderWorkspace()

	assert.ok(screen.getByText('Todavia no hay clientes cargados.'))
	fireEvent.click(screen.getAllByRole('button', { name: 'Nuevo cliente' })[0])
	assert.equal(onCreate.mock.calls.length, 1)
})
