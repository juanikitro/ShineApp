import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { type AgendaOperationalRow } from '@/lib/agenda'

import { AgendaWeekBoard } from './AgendaWeekBoard'

afterEach(cleanup)

const reservation = { id: 7, day: '2026-07-20' }

const row: AgendaOperationalRow = {
	key: 'reservation:7',
	day: '2026-07-20',
	displayDay: '2026-07-20',
	phase: 'entry',
	kind: 'reservation-only',
	reservation,
	workOrder: null,
}

function renderBoard(overrides = {}) {
	const openQuickReservationCalls: Array<[string, boolean | undefined]> = []
	const dragOverlayRows: Array<AgendaOperationalRow | null> = []
	const props = {
		agendaBoardModel: {
			key: 'agenda-board:2026-07-20:stay',
			startDay: '2026-07-20',
			days: ['2026-07-20'],
			rowsByDay: { '2026-07-20': [row] },
			segments: [
				{
					key: row.key,
					startDay: row.day,
					endDay: row.day,
					startColumn: 1,
					spanDays: 1,
					stackRow: 1,
					startsBeforeWindow: false,
					endsAfterWindow: false,
					row,
					reservation,
					workOrder: null,
				},
			],
			dayCount: 1,
			isInteractive: true,
			laneEndRow: 4,
			stackRows: 1,
		},
		agendaSensors: [],
		agendaSlideMotion: {
			direction: 'forward',
			distancePercent: 24,
			offsetDays: 5,
			scope: 'range',
		},
		agendaWeekSkeletonActive: false,
		shouldSuppressEnteringAgendaOverlap: false,
		visibleDays: 5,
		currentDay: '2026-07-20',
		agendaDropDay: '2026-07-20',
		agendaMovePendingId: null,
		selectedDay: '2026-07-20',
		onDragStart: () => {},
		onDragOver: () => {},
		onDragEnd: () => {},
		onDragCancel: () => {},
		onBoardAnimationComplete: () => {},
		onOpenQuickReservation: (day: string, prefillDay?: boolean) => {
			openQuickReservationCalls.push([day, prefillDay])
		},
		recordClass: (_kind: string, id: string | number, extraClass = '') =>
			['record', `id-${id}`, extraClass].filter(Boolean).join(' '),
		agendaCardClass: () => 'agenda-card--confirmed',
		flashClass: () => 'flash-target',
		renderReservationCard: (item: { id: number }) => <span>Reserva {item.id}</span>,
		renderDragOverlay: (activeRow: AgendaOperationalRow | null) => {
			dragOverlayRows.push(activeRow)
			return activeRow ? <span>Arrastrando {activeRow.key}</span> : null
		},
		activeAgendaRow: row,
		...overrides,
	} as Parameters<typeof AgendaWeekBoard>[0]

	return {
		...render(<AgendaWeekBoard {...props} />),
		openQuickReservationCalls,
		dragOverlayRows,
	}
}

test('AgendaWeekBoard preserves the weekly board, draggable card, and drag overlay', () => {
	const { container, openQuickReservationCalls, dragOverlayRows } = renderBoard()
	const board = container.querySelector<HTMLElement>('.week-board')
	const lane = container.querySelector<HTMLElement>('.agenda-day-lane')
	const card = container.querySelector<HTMLElement>('.agenda-operational-card--spanning')

	assert.ok(container.querySelector('.agenda-slide-viewport--board'))
	assert.ok(board)
	assert.ok(lane?.classList.contains('day-row--today'))
	assert.ok(lane?.classList.contains('day-row--drop-target'))
	assert.ok(card?.classList.contains('record'))
	assert.ok(card?.classList.contains('id-7'))
	assert.ok(card?.classList.contains('agenda-card--confirmed'))
	assert.ok(card?.classList.contains('flash-target'))
	assert.ok(screen.getByText('Reserva 7'))
	assert.deepEqual(dragOverlayRows, [row])

	fireEvent.click(screen.getByRole('button', { name: /crear reserva el/i }))
	assert.deepEqual(openQuickReservationCalls, [['2026-07-20', true]])
})

test('AgendaWeekBoard preserves entering and multi-day card classes', () => {
	const { container } = renderBoard({
		agendaWeekSkeletonActive: true,
		shouldSuppressEnteringAgendaOverlap: true,
		agendaSlideMotion: {
			direction: 'forward',
			distancePercent: 24,
			offsetDays: 1,
			scope: 'day',
		},
		agendaBoardModel: {
			key: 'agenda-board:2026-07-20:stay',
			startDay: '2026-07-20',
			days: ['2026-07-20'],
			rowsByDay: { '2026-07-20': [row] },
			segments: [
				{
					key: row.key,
					startDay: row.day,
					endDay: '2026-07-21',
					startColumn: 1,
					spanDays: 2,
					stackRow: 1,
					startsBeforeWindow: true,
					endsAfterWindow: true,
					row,
					reservation,
					workOrder: null,
				},
			],
			dayCount: 1,
			isInteractive: true,
			laneEndRow: 4,
			stackRows: 1,
		},
	})
	const header = container.querySelector<HTMLElement>('.agenda-day-head')
	const shell = container.querySelector<HTMLElement>('.agenda-board-card-shell')
	const card = container.querySelector<HTMLElement>('.agenda-operational-card--spanning')

	assert.ok(header?.classList.contains('agenda-entering-overlap-hidden'))
	assert.ok(shell?.classList.contains('agenda-entering-overlap-hidden'))
	assert.ok(card?.classList.contains('agenda-operational-card--multi-day'))
	assert.ok(card?.classList.contains('agenda-operational-card--continues-before'))
	assert.ok(card?.classList.contains('agenda-operational-card--continues-after'))
})
