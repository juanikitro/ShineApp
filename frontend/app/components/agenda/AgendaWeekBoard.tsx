'use client'

import {
	closestCenter,
	DndContext,
	DragOverlay,
	type DragEndEvent,
	type DragStartEvent,
	type SensorDescriptor,
	type SensorOptions,
} from '@dnd-kit/core'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode } from 'react'

import { AgendaDayHeader } from '@/app/components/agenda/AgendaDayHeader'
import { AgendaDraggableRecord } from '@/app/components/agenda/AgendaDraggableRecord'
import { AgendaDroppableDayLane } from '@/app/components/agenda/AgendaDroppableDayLane'
import { cx } from '@/app/components/utils'
import {
	type AgendaCalendarSegment,
	type AgendaOperationalRow,
	buildAgendaDayMoneySummary,
} from '@/lib/agenda'
import {
	agendaBoardGridStyle,
	agendaEnteringColumnHidden,
	agendaEnteringSegmentHidden,
	agendaSegmentStyle,
} from '@/lib/agenda-layout'
import {
	type AgendaSlideMotion,
	agendaBoardVariants,
	agendaSlidePresenceMode,
} from '@/lib/motion-spec'
import { type AnyRecord } from '@/lib/page-support'
import { type WorkingHoursEntry } from '@/lib/scheduling-availability'

type AgendaBoardModel = {
	key: string
	startDay: string
	days: string[]
	rowsByDay: Record<string, AgendaOperationalRow[]>
	segments: AgendaCalendarSegment[]
	dayCount: number
	isInteractive: boolean
	laneEndRow: number
	stackRows: number
}

type AgendaWeekBoardProps = {
	agendaBoardModel: AgendaBoardModel
	agendaSensors: SensorDescriptor<SensorOptions>[]
	agendaSlideMotion: AgendaSlideMotion
	agendaWeekSkeletonActive: boolean
	shouldSuppressEnteringAgendaOverlap: boolean
	visibleDays: number
	currentDay: string
	agendaDropDay: string | null
	agendaMovePendingId: string | null
	selectedDay: string
	workingHours?: WorkingHoursEntry[]
	onDragStart: (event: DragStartEvent) => void
	onDragOver: (event: any) => void
	onDragEnd: (event: DragEndEvent) => void
	onDragCancel: () => void
	onBoardAnimationComplete: () => void
	onOpenQuickReservation: (day: string, prefillDay?: boolean) => void
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	agendaCardClass: (row: AgendaOperationalRow) => string
	flashClass: (target: string | null) => string
	renderReservationCard: (
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		options?: { statusMode?: 'reservation' | 'work-order' },
	) => ReactNode
	renderDragOverlay: (row: AgendaOperationalRow | null) => ReactNode
	activeAgendaRow: AgendaOperationalRow | null
}

export function AgendaWeekBoard({
	agendaBoardModel,
	agendaSensors,
	agendaSlideMotion,
	agendaWeekSkeletonActive,
	shouldSuppressEnteringAgendaOverlap,
	visibleDays,
	currentDay,
	agendaDropDay,
	agendaMovePendingId,
	selectedDay,
	workingHours,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDragCancel,
	onBoardAnimationComplete,
	onOpenQuickReservation,
	recordClass,
	agendaCardClass,
	flashClass,
	renderReservationCard,
	renderDragOverlay,
	activeAgendaRow,
}: AgendaWeekBoardProps) {
	return (
		<DndContext
			sensors={agendaSensors}
			collisionDetection={closestCenter}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDragCancel={onDragCancel}
		>
			<div className="agenda-slide-viewport agenda-slide-viewport--board">
				<AnimatePresence
					custom={agendaSlideMotion}
					initial={false}
					mode={agendaSlidePresenceMode(agendaSlideMotion)}
				>
					<m.div
						key={agendaBoardModel.key}
						className="agenda-carousel-board"
						custom={agendaSlideMotion}
						variants={agendaBoardVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						onAnimationComplete={onBoardAnimationComplete}
					>
						<m.div
							className="week-board"
							style={agendaBoardGridStyle(
								agendaBoardModel.dayCount,
								agendaBoardModel.stackRows,
							)}
						>
							{agendaBoardModel.days.map((day, index) => (
								<AgendaDroppableDayLane
									column={index + 1}
									day={day}
									interactive={agendaBoardModel.isInteractive}
									key={`lane:${agendaBoardModel.key}:${day}`}
									laneEndRow={agendaBoardModel.laneEndRow}
									snapshotKey={agendaBoardModel.key}
									currentDay={currentDay}
									agendaDropDay={agendaDropDay}
								/>
							))}
							{agendaBoardModel.days.map((day, index) => (
								<AgendaDayHeader
									column={index + 1}
									count={agendaBoardModel.rowsByDay[day]?.length ?? 0}
									day={day}
									hiddenDuringEnter={
										agendaWeekSkeletonActive ||
										agendaEnteringColumnHidden(
											index + 1,
											agendaSlideMotion,
											visibleDays,
											shouldSuppressEnteringAgendaOverlap,
										)
									}
									interactive={agendaBoardModel.isInteractive}
									key={`head:${agendaBoardModel.key}:${day}`}
									moneySummary={buildAgendaDayMoneySummary(
										agendaBoardModel.rowsByDay[day],
									)}
									currentDay={currentDay}
									onOpenQuickReservation={onOpenQuickReservation}
									selectedDay={selectedDay}
									workingHours={workingHours}
								/>
							))}
							{agendaBoardModel.segments.map((segment) => {
								const reservation = segment.reservation
								const workOrder = segment.workOrder
								return (
									<div
										className={cx(
											'agenda-board-card-shell',
											agendaEnteringSegmentHidden(
												segment,
												agendaSlideMotion,
												visibleDays,
												shouldSuppressEnteringAgendaOverlap,
											) && 'agenda-entering-overlap-hidden',
										)}
										key={`${agendaBoardModel.key}:segment:${segment.key}`}
										style={agendaSegmentStyle(segment)}
									>
										<AgendaDraggableRecord
											className={cx(
												'agenda-operational-card--spanning',
												segment.spanDays > 1 &&
													'agenda-operational-card--multi-day',
												segment.startsBeforeWindow &&
													'agenda-operational-card--continues-before',
												segment.endsAfterWindow &&
													'agenda-operational-card--continues-after',
											)}
											interactive={agendaBoardModel.isInteractive}
											row={segment.row}
											snapshotKey={agendaBoardModel.key}
											agendaMovePendingId={agendaMovePendingId}
											recordClass={recordClass}
											agendaCardClass={agendaCardClass}
											flashClass={flashClass}
										>
											{reservation
												? renderReservationCard(reservation, workOrder, segment.row, {
														statusMode: 'work-order',
													})
												: null}
											{!reservation && !workOrder ? (
												<span className="agenda-manual-badge">Sin datos</span>
											) : null}
										</AgendaDraggableRecord>
									</div>
								)
							})}
						</m.div>
					</m.div>
				</AnimatePresence>
			</div>
			<DragOverlay>{renderDragOverlay(activeAgendaRow)}</DragOverlay>
		</DndContext>
	)
}
