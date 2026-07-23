import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	customerFilterOptions,
	customerFilterOptionsForEconomy,
} from './CustomerListPanel'

test('customer filter options preserve labels and restrict balances without economy access', () => {
	assert.deepEqual(customerFilterOptions, [
		{ value: 'all', label: 'Todos' },
		{ value: 'with_reservation', label: 'Con reserva' },
		{ value: 'birthday_soon', label: 'Cumple pronto' },
		{ value: 'no_upcoming', label: 'Sin proxima visita' },
		{ value: 'with_balance', label: 'Con saldo' },
	])
	assert.deepEqual(
		customerFilterOptionsForEconomy(false).map((option) => option.value),
		['all', 'with_reservation', 'birthday_soon', 'no_upcoming'],
	)
	assert.deepEqual(
		customerFilterOptionsForEconomy(true),
		customerFilterOptions,
	)
})
