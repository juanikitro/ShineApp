'use client'

import type { AgendaMonthChip, AgendaMonthWeek } from '@/lib/agenda'

import { cx } from '../utils'

type AgendaMonthGridProps = {
	weeks: AgendaMonthWeek[]
	weekdayLabels: string[]
	onSelectDay: (isoDate: string) => void
	onSelectReservation?: (chip: AgendaMonthChip) => void
	chipClassName?: (chip: AgendaMonthChip) => string
	chipLabel: (chip: AgendaMonthChip) => string
	dayAriaLabel?: (isoDate: string) => string
}

export function AgendaMonthGrid({
	weeks,
	weekdayLabels,
	onSelectDay,
	onSelectReservation,
	chipClassName,
	chipLabel,
	dayAriaLabel,
}: AgendaMonthGridProps) {
	return (
		<div className="agenda-month" role="grid" aria-label="Agenda mensual">
			<div className="agenda-month-weekdays" role="row">
				{weekdayLabels.map((label, index) => (
					<span
						key={`${label}-${index}`}
						className="agenda-month-weekday"
						role="columnheader"
					>
						{label}
					</span>
				))}
			</div>
			<div className="agenda-month-grid">
				{weeks.map((week) => (
					<div className="agenda-month-week" role="row" key={week.key}>
						{week.days.map((cell) => (
							<div
								className={cx(
									'agenda-month-cell',
									!cell.inCurrentMonth && 'agenda-month-cell--outside',
									cell.isToday && 'agenda-month-cell--today',
								)}
								role="gridcell"
								key={cell.isoDate}
							>
								<button
									type="button"
									className="agenda-month-day"
									onClick={() => onSelectDay(cell.isoDate)}
									aria-label={
										dayAriaLabel
											? dayAriaLabel(cell.isoDate)
											: `Ver dia ${cell.isoDate}`
									}
								>
									<span className="agenda-month-day-number">
										{cell.dayNumber}
									</span>
									{cell.count > 0 ? (
										<span
											className="agenda-month-day-count"
											aria-label={`${cell.count} reservas`}
										>
											{cell.count}
										</span>
									) : null}
								</button>
								<div className="agenda-month-chips">
									{cell.chips.map((chip) => (
										<button
											type="button"
											key={chip.key}
											className={cx(
												'agenda-month-chip',
												chipClassName?.(chip),
											)}
											onClick={() => onSelectReservation?.(chip)}
											title={chipLabel(chip)}
										>
											{chipLabel(chip)}
										</button>
									))}
									{cell.overflowCount > 0 ? (
										<button
											type="button"
											className="agenda-month-chip agenda-month-more"
											onClick={() => onSelectDay(cell.isoDate)}
										>
											+{cell.overflowCount} mas
										</button>
									) : null}
								</div>
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	)
}
