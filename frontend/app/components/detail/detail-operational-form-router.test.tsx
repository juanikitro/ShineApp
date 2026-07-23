import assert from 'node:assert/strict'
import { cleanup, render, within } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	quote: null as Record<string, any> | null,
	reservation: null as Record<string, any> | null,
	workOrder: null as Record<string, any> | null,
}))

vi.mock('./quote-detail-edit-renderer', () => ({
	renderQuoteDetailEditor: (props: Record<string, any>) => {
		capturedProps.quote = props
		return <span>Editor de cotizacion</span>
	},
}))

vi.mock('./reservation-detail-edit-renderer', () => ({
	renderReservationDetailEditor: (props: Record<string, any>) => {
		capturedProps.reservation = props
		return <span>Editor de reserva</span>
	},
}))

vi.mock('./work-order-detail-edit-renderer', () => ({
	renderWorkOrderDetailEditor: (props: Record<string, any>) => {
		capturedProps.workOrder = props
		return <span>Editor de orden</span>
	},
}))

import { renderOperationalDetailFormRouter } from './detail-operational-form-router'

afterEach(cleanup)

function renderRouter(kind: string) {
	const originalData = { id: 'original', _agenda_day: '2026-07-23' }
	const editData = { id: 'edited', customer: '1' }
	const vehicleOptions = [{ value: 'vehicle-1', label: 'Ford' }]
	const quoteVehicleOptions = [
		{ value: 'quote-vehicle-1', label: 'Toyota' },
	]
	const vehicles = [{ id: 'quote-vehicle-1', customer: '1' }]
	const onDownloadQuotePdf = vi.fn()
	const onDownloadQuotePdfAndMarkSent = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const result = renderOperationalDetailFormRouter({
		detail: { kind, data: originalData, editData },
		onSubmit: () => {},
		onPatch: () => {},
		customerOptions: [{ value: 'customer-1', label: 'Ana' }],
		vehicleOptions,
		reservationLabels: { confirmed: 'Confirmada' },
		onUpdateCustomer: () => {},
		onFocusField: () => {},
		focusNextOnEnter: () => () => {},
		useReservationTimes: true,
		reservationItems: () => [],
		serviceOptions: [{ value: 'service-1', label: 'Lavado' }],
		onAddService: () => {},
		onSelectService: () => {},
		onUpdateService: () => {},
		onRemoveService: () => {},
		canViewEconomy: true,
		orderLabels: { in_progress: 'En proceso' },
		onOpenDetail: () => {},
		onCreateQuote: () => {},
		services: [],
		selectedDay: '2026-07-24',
		onOpenConsumption: () => {},
		quoteStatusLabels: { draft: 'Sin enviar' },
		vehicles,
		quoteVehicleOptions,
		openQuickCreate: () => {},
		serviceNotesForLine: () => '',
		flashClass: () => '',
		fieldFlashKey: (target) => target,
		quoteTentativeTimeLabel: () => '',
		onDownloadQuotePdf,
		onDownloadQuotePdfAndMarkSent,
		renderActions,
	} as Parameters<typeof renderOperationalDetailFormRouter>[0])

	return {
		editData,
		originalData,
		onDownloadQuotePdf,
		onDownloadQuotePdfAndMarkSent,
		quoteVehicleOptions,
		renderActions,
		result,
		vehicleOptions,
		vehicles,
	}
}

test('operational detail router dispatches reservation, work order and quote without a mounted wrapper', () => {
	for (const [kind, text] of [
		['reservation', 'Editor de reserva'],
		['workorder', 'Editor de orden'],
		['quote', 'Editor de cotizacion'],
	] as const) {
		const { result } = renderRouter(kind)
		const rendered = render(result)
		assert.ok(within(rendered.container).getByText(text))
		rendered.unmount()
	}
})

test('operational detail router preserves original records, derived vehicle options and actions', () => {
	const reservation = renderRouter('reservation')
	const reservationProps = capturedProps.reservation as Record<string, any> | null
	assert.ok(reservationProps)
	assert.equal(reservationProps.data, reservation.editData)
	assert.equal(reservationProps.originalData, reservation.originalData)
	assert.equal(reservationProps.vehicleOptions, reservation.vehicleOptions)
	assert.equal(reservationProps.renderActions, reservation.renderActions)

	const workOrder = renderRouter('workorder')
	const workOrderProps = capturedProps.workOrder as Record<string, any> | null
	assert.ok(workOrderProps)
	assert.equal(workOrderProps.data, workOrder.editData)
	assert.equal(workOrderProps.originalData, workOrder.originalData)
	assert.equal(workOrderProps.vehicleOptions, workOrder.vehicleOptions)
	assert.equal(workOrderProps.renderActions, workOrder.renderActions)

	const quote = renderRouter('quote')
	const quoteProps = capturedProps.quote as Record<string, any> | null
	assert.ok(quoteProps)
	assert.equal(quoteProps.data, quote.editData)
	assert.equal(quoteProps.vehicles, quote.vehicles)
	assert.equal(quoteProps.vehicleOptions, quote.quoteVehicleOptions)
	assert.equal(quoteProps.onDownloadQuotePdf, quote.onDownloadQuotePdf)
	assert.equal(
		quoteProps.onDownloadQuotePdfAndMarkSent,
		quote.onDownloadQuotePdfAndMarkSent,
	)
	assert.equal(quoteProps.renderActions, quote.renderActions)
	assert.equal(renderRouter('cash-movement').result, undefined)
})
