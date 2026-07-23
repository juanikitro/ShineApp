import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { AgendaSchedulePanel } from './AgendaSchedulePanel'

afterEach(cleanup)

const monthWeeks = [
	{
		key: 'week:2026-07-20',
		days: [
			{
				isoDate: '2026-07-20',
				dayNumber: 20,
				inCurrentMonth: true,
				isToday: true,
				count: 1,
				chips: [
					{
						key: 'reservation:7',
						phase: 'entry' as const,
						reservation: { id: 7, day: '2026-07-20' },
						workOrder: null,
					},
				],
				overflowCount: 0,
			},
		],
	},
]

function renderPanel(overrides = {}) {
	const calls: {
		reload: number
		selectedDays: string[]
		selectedReservations: string[]
	} = { reload: 0, selectedDays: [], selectedReservations: [] }
	const props = {
		currentDay: '2026-07-20',
		startLabel: '20/7',
		endLabel: '24/7',
		visibleDays: 3,
		rangeMode: 'month' as const,
		title: 'Agenda de julio',
		onMove: () => {},
		onToday: () => {},
		onGoToDate: () => {},
		onOpenCashForRange: () => {},
		agendaLoadError: null,
		onReload: () => {
			calls.reload += 1
		},
		monthWeeks,
		monthWeekdayLabels: ['lun'],
		onSelectDay: (day: string) => {
			calls.selectedDays.push(day)
		},
		onSelectReservation: (chip: { key: string }) => {
			calls.selectedReservations.push(chip.key)
		},
		chipClassName: () => 'agenda-chip--confirmed',
		chipLabel: () => 'Reserva Ana',
		dayAriaLabel: (day: string) => `Ver agenda del ${day}`,
		agendaWeekSkeletonActive: false,
		renderWeekBoard: () => <div data-testid="week-board">Tablero semanal</div>,
		...overrides,
	} as Parameters<typeof AgendaSchedulePanel>[0]

	return { ...render(<AgendaSchedulePanel {...props} />), calls }
}

test('AgendaSchedulePanel preserves the monthly agenda toolbar and selection callbacks', () => {
	const { calls } = renderPanel()

	assert.ok(screen.getByRole('heading', { name: 'Agenda de julio' }))
	assert.ok(screen.getByRole('grid', { name: 'Agenda mensual' }))
	assert.equal(screen.queryByTestId('week-board'), null)
	fireEvent.click(screen.getByRole('button', { name: 'Ver agenda del 2026-07-20' }))
	fireEvent.click(screen.getByRole('button', { name: 'Reserva Ana' }))
	assert.deepEqual(calls.selectedDays, ['2026-07-20'])
	assert.deepEqual(calls.selectedReservations, ['reservation:7'])
})

test('AgendaSchedulePanel preserves error retry, skeleton, and the weekly board', () => {
	const { container, calls } = renderPanel({
		rangeMode: 'week',
		agendaLoadError: {
			title: 'No se pudo cargar la agenda',
			description: 'Intenta actualizar.',
		},
		agendaWeekSkeletonActive: true,
	})

	assert.ok(screen.getByText('No se pudo cargar la agenda'))
	assert.ok(screen.getByText('Intenta actualizar.'))
	assert.equal(
		container.querySelectorAll('.agenda-skeleton-column').length,
		3,
	)
	assert.ok(screen.getByTestId('week-board'))
	fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
	assert.equal(calls.reload, 1)
})
