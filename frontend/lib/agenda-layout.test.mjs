import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	agendaBoardGridStyle,
	agendaColumnStyle,
	agendaEnteringColumnHidden,
	agendaEnteringSegmentHidden,
	agendaLaneStyle,
	agendaSegmentStyle,
} from './agenda-layout'

test('builds the CSS positions used by agenda columns, lanes and segments', () => {
	assert.deepEqual(agendaColumnStyle(3), { gridColumn: '3' })
	assert.deepEqual(agendaLaneStyle(2, 6), {
		gridColumn: '2',
		gridRow: '1 / 6',
	})
	assert.deepEqual(
		agendaSegmentStyle({ startColumn: 2, spanDays: 3, stackRow: 1 }),
		{
			gridColumn: '2 / span 3',
			gridRow: '2',
		},
	)
})

test('builds the board row template for empty and stacked agenda boards', () => {
	assert.deepEqual(agendaBoardGridStyle(5, 0), {
		'--agenda-board-days': '5',
		gridTemplateRows: 'auto minmax(240px, 1fr)',
	})
	assert.deepEqual(agendaBoardGridStyle(7, 3), {
		'--agenda-board-days': '7',
		gridTemplateRows: 'auto auto auto auto minmax(240px, 1fr)',
	})
})

test('hides only entering columns while overlapping agenda ranges animate', () => {
	const forward = {
		direction: 'forward',
		distancePercent: 40,
		offsetDays: 2,
		scope: 'day',
	}
	const backward = { ...forward, direction: 'backward', offsetDays: -2 }

	assert.equal(agendaEnteringColumnHidden(1, forward, 5, true), true)
	assert.equal(agendaEnteringColumnHidden(4, forward, 5, true), false)
	assert.equal(agendaEnteringColumnHidden(2, backward, 5, true), false)
	assert.equal(agendaEnteringColumnHidden(3, backward, 5, true), true)
	assert.equal(agendaEnteringColumnHidden(1, forward, 5, false), false)
	assert.equal(agendaEnteringColumnHidden(1, { ...forward, offsetDays: 5 }, 5, true), false)
})

test('uses segment spans when hiding entering agenda cards', () => {
	const forward = {
		direction: 'forward',
		distancePercent: 40,
		offsetDays: 2,
		scope: 'day',
	}
	const backward = { ...forward, direction: 'backward', offsetDays: -2 }

	assert.equal(
		agendaEnteringSegmentHidden(
			{ startColumn: 3, spanDays: 2, stackRow: 0 },
			forward,
			5,
			true,
		),
		true,
	)
	assert.equal(
		agendaEnteringSegmentHidden(
			{ startColumn: 4, spanDays: 1, stackRow: 0 },
			forward,
			5,
			true,
		),
		false,
	)
	assert.equal(
		agendaEnteringSegmentHidden(
			{ startColumn: 1, spanDays: 3, stackRow: 0 },
			backward,
			5,
			true,
		),
		true,
	)
})
