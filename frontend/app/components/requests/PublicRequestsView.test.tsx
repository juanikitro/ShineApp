import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { PublicRequestsView } from './PublicRequestsView'

afterEach(cleanup)

const pendingRequest = {
	id: 1,
	status: 'pending',
	request_type: 'booking',
	customer_name: 'Ana',
	items: [],
	suggestions: { customers: [], vehicles: [] },
}

const managedRequest = {
	id: 2,
	status: 'archived',
	request_type: 'quote',
	customer_name: 'Beto',
	items: [],
}

function renderView(overrides = {}) {
	const selectionFor = vi.fn(() => ({}))
	const onPatchSelection = vi.fn()
	const onConvert = vi.fn()
	const onArchive = vi.fn()
	const recordClass = vi.fn(() => 'record-flash')
	const props = {
		pendingRequests: [pendingRequest],
		managedRequests: [managedRequest],
		pendingCount: 1,
		selectionFor,
		onPatchSelection,
		onConvert,
		onArchive,
		recordClass,
		...overrides,
	} as Parameters<typeof PublicRequestsView>[0]

	return {
		...render(<PublicRequestsView {...props} />),
		selectionFor,
		onPatchSelection,
		onConvert,
		onArchive,
	}
}

test('PublicRequestsView preserves pending requests, callbacks and managed section', () => {
	const { onPatchSelection, onConvert, onArchive } = renderView()

	assert.ok(screen.getByText('1 pendientes'))
	assert.ok(screen.getByText('Gestionadas'))
	fireEvent.change(screen.getByLabelText('Cliente'), {
		target: { value: '' },
	})
	fireEvent.click(screen.getByRole('button', { name: 'Convertir solicitud' }))
	fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
	assert.deepEqual(onPatchSelection.mock.calls, [[pendingRequest, { customer: '' }]])
	assert.deepEqual(onConvert.mock.calls, [[pendingRequest]])
	assert.deepEqual(onArchive.mock.calls, [[pendingRequest]])
})

test('PublicRequestsView preserves empty and default-open managed branches', () => {
	renderView({
		pendingRequests: [],
		managedRequests: [managedRequest],
		pendingCount: 0,
	})

	assert.ok(screen.getByText('Sin solicitudes pendientes'))
	assert.ok(screen.getByText('Las solicitudes publicas nuevas van a aparecer aca.'))
	assert.ok(screen.getByText('Beto'))
})
