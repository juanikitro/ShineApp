import assert from 'node:assert/strict'
import { DndContext } from '@dnd-kit/core'
import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { AgendaDroppableDayLane } from './AgendaDroppableDayLane'

afterEach(cleanup)

function renderLane(overrides = {}) {
	const props = {
		day: '2026-07-21',
		column: 3,
		interactive: true,
		laneEndRow: 5,
		snapshotKey: 'agenda:2026-07-21',
		currentDay: '2026-07-21',
		agendaDropDay: '2026-07-21',
		...overrides,
	} as Parameters<typeof AgendaDroppableDayLane>[0]

	return render(
		<DndContext>
			<AgendaDroppableDayLane {...props} />
		</DndContext>,
	)
}

test('AgendaDroppableDayLane preserves the current interactive drop target', () => {
	const { container } = renderLane()
	const lane = container.querySelector<HTMLElement>('.agenda-day-lane')

	assert.ok(lane)
	assert.ok(lane.classList.contains('day-row--today'))
	assert.ok(lane.classList.contains('day-row--drop-target'))
	assert.equal(lane.style.gridColumn, '3')
	assert.equal(lane.style.gridRow, '1 / 5')
})

test('AgendaDroppableDayLane keeps snapshot lanes out of drop-target state', () => {
	const { container } = renderLane({
		interactive: false,
		currentDay: '2026-07-22',
	})
	const lane = container.querySelector<HTMLElement>('.agenda-day-lane')

	assert.ok(lane)
	assert.equal(lane.classList.contains('day-row--today'), false)
	assert.equal(lane.classList.contains('day-row--drop-target'), false)
})
