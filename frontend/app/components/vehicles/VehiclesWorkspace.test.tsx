import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { VehiclesWorkspace } from './VehiclesWorkspace'

afterEach(cleanup)

const vehicle = {
	id: 1,
	license_plate: 'AA123BB',
	brand: 'Ford',
	model: 'Fiesta',
	color: 'Rojo',
	customer_name: 'Ana',
}

function renderWorkspace(overrides = {}) {
	const onSearchChange = vi.fn()
	const onCreate = vi.fn()
	const onEdit = vi.fn()
	const onDeactivate = vi.fn()
	const props = {
		vehicles: [vehicle],
		search: '',
		onSearchChange,
		onCreate,
		getRecordClassName: vi.fn(() => 'vehicle-record'),
		detailProps: vi.fn(() => ({ role: 'button', tabIndex: 0 })),
		quickActionTargetProps: vi.fn(() => ({})),
		vehicleQuickActions: vi.fn(() => []),
		renderQuickActionsTrigger: vi.fn(() => null),
		onEdit,
		onDeactivate,
		...overrides,
	} as Parameters<typeof VehiclesWorkspace>[0]

	return {
		...render(<VehiclesWorkspace {...props} />),
		onSearchChange,
		onCreate,
		onEdit,
		onDeactivate,
	}
}

test('VehiclesWorkspace preserves vehicle list controls and parent callbacks', () => {
	const { onSearchChange, onCreate, onEdit, onDeactivate } = renderWorkspace()

	assert.ok(screen.getByText('Vehiculos'))
	assert.ok(screen.getByText('AA123BB'))
	fireEvent.change(
		screen.getByPlaceholderText('Buscar por patente, marca, modelo, color o cliente'),
		{ target: { value: 'Ford' } },
	)
	fireEvent.click(screen.getByRole('button', { name: 'Nuevo vehiculo' }))
	fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
	fireEvent.click(screen.getByRole('button', { name: 'Baja' }))
	assert.deepEqual(onSearchChange.mock.calls, [['Ford']])
	assert.equal(onCreate.mock.calls.length, 1)
	assert.deepEqual(onEdit.mock.calls, [[vehicle]])
	assert.deepEqual(onDeactivate.mock.calls, [[vehicle]])
})

test('VehiclesWorkspace preserves no-results branches', () => {
	renderWorkspace({ vehicles: [], search: 'zzz' })

	assert.ok(screen.getByText('No hay vehiculos para esta busqueda.'))
	assert.ok(screen.getByText('Proba con otra patente, marca o cliente.'))
})
