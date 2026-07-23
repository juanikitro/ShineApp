import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { type AgendaOperationalRow } from '@/lib/agenda'
import { DEFAULT_RESERVATION_STATUS_CONFIG } from '@/lib/reservation-status-config'

import {
	createAgendaReservationCardRenderer,
	renderAgendaReservationCardItem,
} from './AgendaReservationCardRenderer'

afterEach(cleanup)

const workOrder = { id: 70, status: 'ready', balance_due: '30' }
const reservation = {
	id: 7,
	day: '2026-07-22',
	status: 'confirmed',
	customer_name: 'Ana',
	vehicle: 3,
	start_time: '10:30',
	items: [{ service_name: 'Lavado' }],
}
const row: AgendaOperationalRow = {
	key: 'reservation:7',
	day: '2026-07-22',
	displayDay: '2026-07-22',
	phase: 'entry',
	kind: 'reservation-work-order',
	reservation,
	workOrder,
}

function renderCard(overrides = {}) {
	const actionCalls: unknown[] = []
	const result = render(
		renderAgendaReservationCardItem({
			reservation,
			workOrder,
			row,
			statusMode: 'work-order',
			vehicles: [{ id: 3, brand: 'Honda', model: 'Civic' }],
			useReservationTimes: true,
			workOrderByReservation: { 7: workOrder },
			canViewEconomy: true,
			reservationStatusConfig: DEFAULT_RESERVATION_STATUS_CONFIG,
			agendaMovePendingId: '7',
			isActionPending: () => false,
			getQuickActions: () => [],
			detailRecordProps: () => ({ role: 'button' }),
			quickActionTargetProps: () => ({}),
			renderQuickActionsTrigger: () => <span>Acciones rápidas</span>,
			renderWorkDebt: () => <span>Deuda</span>,
			orderLabels: { confirmed: 'Confirmada' },
			reservationLabels: { confirmed: 'Confirmada', pending: 'Pendiente' },
			onAction: (action) => {
				actionCalls.push(action)
			},
			...overrides,
		}),
	)
	return { ...result, actionCalls }
}

test('renderAgendaReservationCardItem preserves work card content and actions', () => {
	const { container, actionCalls } = renderCard()

	assert.ok(container.querySelector('.agenda-entry-card--saving'))
	assert.ok(screen.getByText('Ana'))
	assert.ok(screen.getByText('Lavado'))
	assert.ok(screen.getByText('Honda Civic'))
	assert.ok(screen.getByText('10:30'))
	assert.ok(screen.getByText('Confirmada'))
	assert.ok(screen.getByText('Deuda'))
	assert.ok(screen.getByText('Acciones rápidas'))

	fireEvent.click(screen.getByText('Entregar'))
	assert.deepEqual(actionCalls, [
		{
			kind: 'work-order-status',
			label: 'Entregar',
			priority: 'medium',
			status: 'delivered',
			variant: 'outline',
		},
	])
})

test('renderAgendaReservationCardItem preserves reservation-only branches', () => {
	const pendingReservation = { ...reservation, status: 'pending' }
	const pendingRow: AgendaOperationalRow = {
		...row,
		reservation: pendingReservation,
		workOrder: null,
	}
	let renderedDebt = false
	renderCard({
		reservation: pendingReservation,
		workOrder: null,
		row: pendingRow,
		statusMode: 'reservation',
		canViewEconomy: false,
		agendaMovePendingId: null,
		renderWorkDebt: () => {
			renderedDebt = true
			return <span>Deuda</span>
		},
	})

	assert.ok(screen.getByText('Ingreso'))
	assert.ok(screen.getByText('Pendiente'))
	assert.ok(screen.getByText('Confirmar'))
	assert.equal(renderedDebt, false)
	assert.equal(screen.queryByText('Deuda'), null)
})

test('createAgendaReservationCardRenderer binds shared card dependencies', () => {
	const renderCard = createAgendaReservationCardRenderer({
		vehicles: [{ id: 3, brand: 'Honda', model: 'Civic' }],
		useReservationTimes: true,
		workOrderByReservation: { 7: workOrder },
		canViewEconomy: true,
		reservationStatusConfig: DEFAULT_RESERVATION_STATUS_CONFIG,
		agendaMovePendingId: null,
		isActionPending: () => false,
		getQuickActions: () => [],
		detailRecordProps: () => ({}),
		quickActionTargetProps: () => ({}),
		renderQuickActionsTrigger: () => <span>Acciones factory</span>,
		renderWorkDebt: () => <span>Deuda factory</span>,
		orderLabels: { ready: 'Listo' },
		reservationLabels: { confirmed: 'Confirmada' },
		onAction: () => {},
	})

	render(renderCard(reservation, workOrder, row, { statusMode: 'work-order' }))

	assert.ok(screen.getByText('Ana'))
	assert.ok(screen.getByText('Honda Civic'))
	assert.ok(screen.getByText('Deuda factory'))
	assert.ok(screen.getByText('Acciones factory'))
})
