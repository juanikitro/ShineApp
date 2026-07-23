'use client'

import { Plus } from 'lucide-react'

import type { AgendaDayMoneySummary } from '@/lib/agenda'
import { agendaColumnStyle } from '@/lib/agenda-layout'
import {
	type WorkingHoursEntry,
	getHoursForDate,
} from '@/lib/scheduling-availability'
import {
	formatDayLabel,
	formatDayName,
	formatFullDateLabel,
	money,
} from '@/lib/page-support'

import { cx } from '../utils'

type AgendaDayHeaderProps = {
	day: string
	column: number
	count: number
	moneySummary: AgendaDayMoneySummary
	hiddenDuringEnter?: boolean
	interactive: boolean
	currentDay: string
	selectedDay: string
	workingHours?: WorkingHoursEntry[]
	onOpenQuickReservation: (day: string, prefillDay?: boolean) => void
}

export function AgendaDayHeader({
	day,
	column,
	count,
	moneySummary,
	hiddenDuringEnter = false,
	interactive,
	currentDay,
	selectedDay,
	workingHours,
	onOpenQuickReservation,
}: AgendaDayHeaderProps) {
	const isToday = day === currentDay
	const isSelected = selectedDay === day
	const fullDateLabel = formatFullDateLabel(day)
	const dayHoursEntry = workingHours?.length
		? getHoursForDate(day, workingHours)
		: null
	const isNonWorkingDay = dayHoursEntry !== null && !dayHoursEntry?.is_open

	return (
		<button
			type="button"
			className={cx(
				'agenda-day-head',
				isToday && 'agenda-day-head--today',
				isSelected && 'agenda-day-head--active',
				isNonWorkingDay && 'agenda-day-head--closed',
				hiddenDuringEnter && 'agenda-entering-overlap-hidden',
			)}
			style={agendaColumnStyle(column)}
			aria-current={isToday ? 'date' : undefined}
			aria-disabled={!interactive}
			aria-label={`Crear reserva el ${fullDateLabel}`}
			title={`Crear reserva el ${fullDateLabel}`}
			onClick={
				interactive ? () => onOpenQuickReservation(day, true) : undefined
			}
			tabIndex={interactive ? undefined : -1}
		>
			<span className="agenda-day-head-row">
				<span className="day-row-head agenda-day-select">
					<span className="day-row-date" aria-hidden="true">
						{formatDayName(day)} {formatDayLabel(day)}
						{isToday ? (
							<strong className="day-row-today-badge">Hoy</strong>
						) : null}
						{isNonWorkingDay ? (
							<span className="agenda-day-closed-badge">Cerrado</span>
						) : null}
					</span>
					<span className="agenda-day-summary">
						<span className="agenda-day-count">
							{count === 1 ? '1 movimiento' : `${count} movimientos`}
						</span>
						<span className="agenda-day-balance agenda-day-balance--collected">
							Cobrado {money(moneySummary.collected)}
						</span>
						<span className="agenda-day-balance agenda-day-balance--receivable">
							Por cobrar {money(moneySummary.receivable)}
						</span>
					</span>
				</span>
				<span className="agenda-day-add-button" aria-hidden="true">
					<Plus size={14} />
				</span>
			</span>
		</button>
	)
}
