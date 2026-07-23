import type { CSSProperties } from 'react'

import type { AgendaCalendarSegment } from './agenda'
import type { AgendaSlideMotion } from './motion-spec'

export function agendaColumnStyle(column: number): CSSProperties {
	return { gridColumn: String(column) }
}

export function agendaLaneStyle(
	column: number,
	laneEndRow: number,
): CSSProperties {
	return {
		gridColumn: String(column),
		gridRow: `1 / ${laneEndRow}`,
	}
}

export function agendaSegmentStyle(
	segment: AgendaCalendarSegment,
): CSSProperties {
	return {
		gridColumn: `${segment.startColumn} / span ${segment.spanDays}`,
		gridRow: String(segment.stackRow + 1),
	}
}

export function agendaBoardGridStyle(
	dayCount: number,
	stackRows: number,
): CSSProperties {
	const rows = ['auto']
	for (let index = 0; index < stackRows; index += 1) {
		rows.push('auto')
	}
	rows.push('minmax(240px, 1fr)')
	return {
		'--agenda-board-days': String(dayCount),
		gridTemplateRows: rows.join(' '),
	} as CSSProperties
}

export function agendaEnteringColumnHidden(
	column: number,
	motion: AgendaSlideMotion,
	visibleDays: number,
	suppressOverlap: boolean,
) {
	if (!suppressOverlap) return false
	const offset = Math.abs(motion.offsetDays)
	if (offset <= 0 || offset >= visibleDays) return false

	return motion.direction === 'forward'
		? column <= visibleDays - offset
		: column > offset
}

export function agendaEnteringSegmentHidden(
	segment: AgendaCalendarSegment,
	motion: AgendaSlideMotion,
	visibleDays: number,
	suppressOverlap: boolean,
) {
	if (!suppressOverlap) return false
	const offset = Math.abs(motion.offsetDays)
	if (offset <= 0 || offset >= visibleDays) return false

	const endColumn = segment.startColumn + segment.spanDays - 1
	return motion.direction === 'forward'
		? segment.startColumn <= visibleDays - offset
		: endColumn > offset
}
