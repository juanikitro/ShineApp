import assert from 'node:assert/strict'
import { test } from 'vitest'

import { type AgendaOperationalRow } from '@/lib/agenda'
import { agendaCardClass } from './agenda-card-class'

function row(
	overrides: Partial<AgendaOperationalRow> = {},
): AgendaOperationalRow {
	return {
		key: 'reservation:1',
		day: '2026-07-10',
		displayDay: '2026-07-10',
		phase: 'entry',
		kind: 'reservation-only',
		reservation: {},
		workOrder: null,
		...overrides,
	}
}

test('builds agenda card classes from reservation status', () => {
	assert.equal(
		agendaCardClass(row({ reservation: { status: 'pending' } })),
		'agenda-operational-card agenda-operational-card--pending',
	)
})

test('adds the work-order class without a known reservation status', () => {
	assert.equal(
		agendaCardClass(
			row({ reservation: { status: 'other' }, workOrder: {} }),
		),
		'agenda-operational-card agenda-operational-card--with-order',
	)
})
