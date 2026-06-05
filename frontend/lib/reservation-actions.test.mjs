import assert from 'node:assert/strict'
import { test } from 'vitest'

import { buildAgendaReservationActions, reservationStatusActions } from './reservation-actions'

test('canceled reservations expose an activation action and a delete action', () => {
	assert.deepEqual(reservationStatusActions('canceled'), [
		{
			action: 'confirm',
			kind: 'reservation',
			label: 'Activar',
			priority: 'high',
			variant: 'filled',
		},
		{
			action: 'delete',
			ariaLabel: 'Eliminar reserva',
			icon: 'trash',
			kind: 'reservation',
			label: 'Eliminar',
			priority: 'high',
			variant: 'icon-danger',
		},
	])
})

test('pending reservations keep confirm and cancel actions', () => {
	assert.deepEqual(reservationStatusActions('pending'), [
		{
			action: 'confirm',
			kind: 'reservation',
			label: 'Confirmar',
			priority: 'high',
			variant: 'filled',
		},
		{
			action: 'cancel',
			ariaLabel: 'Cancelar reserva',
			icon: 'trash',
			kind: 'reservation',
			label: 'Cancelar',
			priority: 'low',
			variant: 'icon-danger',
		},
	])
})

test('confirmed reservations keep only the icon-only cancel action', () => {
	assert.deepEqual(reservationStatusActions('confirmed'), [
		{
			action: 'cancel',
			ariaLabel: 'Cancelar reserva',
			icon: 'trash',
			kind: 'reservation',
			label: 'Cancelar',
			priority: 'low',
			variant: 'icon-danger',
		},
	])
})

test('confirmed reservations expose the first work step as primary and charge as secondary', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 18000,
			canCharge: true,
			reservationStatus: 'confirmed',
			workOrderStatus: 'confirmed',
		}),
		[
			{
				kind: 'work-order-status',
				label: 'Iniciar',
				priority: 'high',
				status: 'in_progress',
				variant: 'filled',
			},
			{
				kind: 'work-order-charge',
				label: 'Cobrar',
				priority: 'medium',
				variant: 'outline',
			},
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		],
	)
})

test('pending reservations do not expose work progress actions yet', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 18000,
			canCharge: true,
			reservationStatus: 'pending',
			workOrderStatus: 'pending',
		}),
		[
			{
				action: 'confirm',
				kind: 'reservation',
				label: 'Confirmar',
				priority: 'high',
				variant: 'filled',
			},
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		],
	)
})

test('ready work with debt prioritizes charge over delivery', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 5000,
			canCharge: true,
			reservationStatus: 'ready',
			workOrderStatus: 'ready',
		}),
		[
			{
				kind: 'work-order-charge',
				label: 'Cobrar',
				priority: 'high',
				variant: 'filled',
			},
			{
				kind: 'work-order-status',
				label: 'Entregar',
				priority: 'medium',
				status: 'delivered',
				variant: 'outline',
			},
		],
	)
})

test('charge action is hidden when balance due is zero', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 0,
			canCharge: true,
			reservationStatus: 'confirmed',
			workOrderStatus: 'confirmed',
		}),
		[
			{
				kind: 'work-order-status',
				label: 'Iniciar',
				priority: 'high',
				status: 'in_progress',
				variant: 'filled',
			},
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		],
	)
})

test('work-order status actions cover progress-only and charge-only states', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			reservationStatus: 'in_progress',
			workOrderStatus: 'in_progress',
		}),
		[
			{
				kind: 'work-order-status',
				label: 'Marcar listo',
				priority: 'high',
				status: 'ready',
				variant: 'filled',
			},
		],
	)
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: '2500',
			canCharge: true,
			reservationStatus: 'delivered',
			workOrderStatus: 'delivered',
		}),
		[
			{
				kind: 'work-order-charge',
				label: 'Cobrar',
				priority: 'high',
				variant: 'filled',
			},
		],
	)
})

test('canceled-disabled config swaps reservation cancel for inline delete', () => {
	assert.deepEqual(
		reservationStatusActions('confirmed', {
			usePending: true,
			useInProgress: true,
			useReady: true,
			useCanceled: false,
		}),
		[
			{
				action: 'delete',
				ariaLabel: 'Eliminar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Eliminar',
				priority: 'low',
				variant: 'icon-danger',
			},
		],
	)
})

test('in-progress and ready disabled jumps confirmed directly to delivered', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			reservationStatus: 'confirmed',
			workOrderStatus: 'confirmed',
			config: {
				usePending: true,
				useInProgress: false,
				useReady: false,
				useCanceled: true,
			},
		}),
		[
			{
				kind: 'work-order-status',
				label: 'Entregar',
				priority: 'high',
				status: 'delivered',
				variant: 'filled',
			},
			{
				action: 'cancel',
				ariaLabel: 'Cancelar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Cancelar',
				priority: 'low',
				variant: 'icon-danger',
			},
		],
	)
})

test('ready disabled jumps in-progress to delivered with charge priority on debt', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 5000,
			canCharge: true,
			reservationStatus: 'in_progress',
			workOrderStatus: 'in_progress',
			config: {
				usePending: true,
				useInProgress: true,
				useReady: false,
				useCanceled: true,
			},
		}),
		[
			{
				kind: 'work-order-charge',
				label: 'Cobrar',
				priority: 'high',
				variant: 'filled',
			},
			{
				kind: 'work-order-status',
				label: 'Entregar',
				priority: 'medium',
				status: 'delivered',
				variant: 'outline',
			},
		],
	)
})

test('unknown or non-chargeable states expose no work-order actions', () => {
	assert.deepEqual(reservationStatusActions('unknown'), [])
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 'no-numero',
			canCharge: true,
			reservationStatus: 'delivered',
			workOrderStatus: 'unknown',
		}),
		[],
	)
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 1000,
			canCharge: false,
			reservationStatus: 'canceled',
			workOrderStatus: 'ready',
		}),
		[
			{
				action: 'confirm',
				kind: 'reservation',
				label: 'Activar',
				priority: 'high',
				variant: 'filled',
			},
			{
				action: 'delete',
				ariaLabel: 'Eliminar reserva',
				icon: 'trash',
				kind: 'reservation',
				label: 'Eliminar',
				priority: 'high',
				variant: 'icon-danger',
			},
		],
	)
})
