import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	firstGroupReservationLine,
	quoteBoardForQuotes,
	quoteCode,
	quoteDropStatus,
	quoteHasReservation,
	quoteLaneStatus,
	quoteReservationId,
	quoteStatusLabels,
} from './quote-display'

test('keeps the quote status labels used by quote, customer and service views', () => {
	assert.deepEqual(quoteStatusLabels, {
		draft: 'Sin enviar',
		sent: 'Enviado',
		accepted: 'Aceptada',
		rejected: 'Rechazada',
	})
})

test('preserves non-nullish public quote codes', () => {
	assert.equal(quoteCode({ public_code: 'C-007', id: 7 }), 'C-007')
	assert.equal(quoteCode({ public_code: '', id: 7 }), '')
	assert.equal(quoteCode({ public_code: 0, id: 7 }), 0)
})

test('falls back to the quote id only for nullish public codes', () => {
	assert.equal(quoteCode({ public_code: null, id: 7 }), '#7')
	assert.equal(quoteCode({ id: 8 }), '#8')
})

test('preserves explicit has-reservation values', () => {
	assert.equal(
		quoteHasReservation({ has_reservation: false, reservation: 7 }),
		false,
	)
	assert.equal(
		quoteHasReservation({ has_reservation: true, reservation: null }),
		true,
	)
})

test('falls back to the reservation field when the primary value is nullish', () => {
	assert.equal(
		quoteHasReservation({ has_reservation: null, reservation: 7 }),
		true,
	)
	assert.equal(quoteHasReservation({ reservation: null }), false)
})

test('keeps exact draft statuses in the draft lane', () => {
	assert.equal(quoteLaneStatus({ status: 'draft' }), 'draft')
	assert.equal(quoteLaneStatus({}), 'draft')
	assert.equal(quoteLaneStatus({ status: null }), 'draft')
})

test('places every non-draft status in the sent lane', () => {
	assert.equal(quoteLaneStatus({ status: 'sent' }), 'sent')
	assert.equal(quoteLaneStatus({ status: 'Draft' }), 'sent')
})

test('builds quote lanes with the same draft-only status split', () => {
	const draft = { id: 1, status: 'draft' }
	const implicitDraft = { id: 2 }
	const sent = { id: 3, status: 'sent' }
	const other = { id: 4, status: 'accepted' }

	assert.deepEqual(quoteBoardForQuotes([draft, implicitDraft, sent, other]), {
		draft: [draft, implicitDraft],
		sent: [sent, other],
	})
})

test('accepts only supported direct and prefixed quote drop lanes', () => {
	assert.equal(quoteDropStatus('draft'), 'draft')
	assert.equal(quoteDropStatus('quote-lane:sent'), 'sent')
	assert.equal(quoteDropStatus('quote-lane:archived'), null)
	assert.equal(quoteDropStatus('Draft'), null)
	assert.equal(quoteDropStatus(null), null)
})

test('selects the first group line with a reservation', () => {
	const firstReservation = { reservation: 12, reservation_id: 99 }
	assert.equal(
		firstGroupReservationLine({
			vehicle_lines: [
				{ reservation: 0, reservation_id: 0 },
				firstReservation,
				{ reservation: 13 },
			],
		}),
		firstReservation,
	)
})

test('falls back to a group reservation id and returns undefined when absent', () => {
	const idOnlyReservation = { reservation: null, reservation_id: 8 }
	assert.equal(
		firstGroupReservationLine({ vehicle_lines: [idOnlyReservation] }),
		idOnlyReservation,
	)
	assert.equal(firstGroupReservationLine({ vehicle_lines: [] }), undefined)
	assert.equal(firstGroupReservationLine({}), undefined)
})

test('returns normal quote reservation ids only when present', () => {
	assert.equal(quoteReservationId({ reservation: 12 }), '12')
	assert.equal(quoteReservationId({ reservation: 0 }), '0')
	assert.equal(quoteReservationId({ reservation: null }), '')
	assert.equal(quoteReservationId({}), '')
})

test('uses the group reservation id only when the reservation is nullish', () => {
	assert.equal(
		quoteReservationId({
			is_group: true,
			vehicle_lines: [{ reservation: null, reservation_id: 8 }],
		}),
		'8',
	)
	assert.equal(
		quoteReservationId({
			is_group: true,
			vehicle_lines: [{ reservation: '', reservation_id: 8 }],
		}),
		'',
	)
})

test('returns an empty group reservation id when no line is available', () => {
	assert.equal(
		quoteReservationId({ is_group: true, vehicle_lines: [] }),
		'',
	)
})
