'use client'

import { useDroppable } from '@dnd-kit/core'

import { agendaLaneStyle } from '@/lib/agenda-layout'

import { cx } from '../utils'

type AgendaDroppableDayLaneProps = {
	day: string
	column: number
	interactive: boolean
	laneEndRow: number
	snapshotKey: string
	currentDay: string
	agendaDropDay: string | null
}

export function AgendaDroppableDayLane({
	day,
	column,
	interactive,
	laneEndRow,
	snapshotKey,
	currentDay,
	agendaDropDay,
}: AgendaDroppableDayLaneProps) {
	const { setNodeRef } = useDroppable({
		id: interactive ? day : `${snapshotKey}:lane:${day}`,
		data: { day },
		disabled: !interactive,
	})
	const isToday = day === currentDay

	return (
		<div
			ref={setNodeRef}
			className={cx(
				'day-row',
				'agenda-day-lane',
				isToday && 'day-row--today',
				interactive && agendaDropDay === day && 'day-row--drop-target',
			)}
			style={agendaLaneStyle(column, laneEndRow)}
		/>
	)
}
