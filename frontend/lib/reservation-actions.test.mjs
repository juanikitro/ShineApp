import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadReservationActionsModule() {
	const sourcePath = resolve('lib/reservation-actions.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const { reservationStatusActions, buildAgendaReservationActions } =
	loadReservationActionsModule()

test('canceled reservations expose an activation action through the confirm endpoint', () => {
	assert.deepEqual(reservationStatusActions('canceled'), [
		{
			action: 'confirm',
			kind: 'reservation',
			label: 'Activar',
			priority: 'high',
			variant: 'filled',
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

test('pending work keeps the operational step as primary and charge as secondary', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 18000,
			canCharge: true,
			reservationStatus: 'confirmed',
			workOrderStatus: 'pending',
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

test('ready work with debt prioritizes charge over delivery', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 5000,
			canCharge: true,
			reservationStatus: 'confirmed',
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

test('charge action is hidden when balance due is zero', () => {
	assert.deepEqual(
		buildAgendaReservationActions({
			balanceDue: 0,
			canCharge: true,
			reservationStatus: 'confirmed',
			workOrderStatus: 'pending',
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
