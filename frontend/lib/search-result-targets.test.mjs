import assert from 'node:assert/strict'
import { test } from 'vitest'

import { searchResultTargets } from './search-result-targets'

test('maps global search result types to their stable SPA targets', () => {
	const expectedTargets = [
		['customer', 'customers', 'Cliente', '/customers/42/'],
		['task', 'tasks', '', '/tasks/42/'],
		['vehicle', 'vehicles', 'Vehiculo', '/vehicles/42/'],
		['reservation', 'agenda', 'Reserva', '/reservations/42/'],
		['work_order', 'agenda', 'Orden de trabajo', '/work-orders/42/'],
		['service', 'services', 'Servicio', '/services/42/'],
		['cash_movement', 'cash', 'Movimiento de caja', '/cash-movements/42/'],
		['material', 'inventory', 'Material', '/materials/42/'],
		['supplier', 'suppliers', 'Proveedor', '/suppliers/42/'],
		['tool', 'tools', 'Herramienta', '/tools/42/'],
		['quote', 'quotes', 'Cotizacion', '/quotes/42/'],
		['debt', 'debts', 'Deuda', '/debts/42/'],
		['fixed_expense', 'fixed-expenses', '', '/fixed-expenses/42/'],
	]

	for (const [type, section, detailTitle, apiPath] of expectedTargets) {
		const target = searchResultTargets[type]
		assert.deepEqual(
			{
				section: target.section,
				detailTitle: target.detailTitle,
				apiPath: target.apiPath(42),
			},
			{ section, detailTitle, apiPath },
		)
	}
})
