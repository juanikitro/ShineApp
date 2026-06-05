'use client'

import {
	closestCenter,
	DndContext,
	DragOverlay,
	useDraggable,
	useDroppable,
	type DragEndEvent,
	type DragStartEvent,
	type SensorDescriptor,
	type SensorOptions,
} from '@dnd-kit/core'
import { type ReactNode } from 'react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { cx } from '@/app/components/utils'
import { Empty } from '@/app/components/ui/Empty'
import { type AgendaOperationalRow } from '@/lib/agenda'
import { type AnyRecord } from '@/lib/page-support'
import {
	reservationCanMoveWorkStatus,
	workOrderForReservation,
	workStatusColumnForStatus,
	workStatusForReservation,
	type ReservationStatusGroup,
	type WorkOrderStatusColumn,
} from '@/lib/work-orders'

function agendaCardFlashKey(rowKey: string) {
	return `agenda:${rowKey}`
}

type SharedCardProps = {
	workOrderByReservation: Record<string, AnyRecord>
	workStatusMovePendingId: string | null
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	agendaCardClass: (row: AgendaOperationalRow) => string
	flashClass: (target: string | null) => string
	renderReservationCard: (
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		options?: { statusMode?: 'reservation' | 'work-order' },
	) => ReactNode
}

type DraggableReservationProps = SharedCardProps & {
	reservation: AnyRecord
	statusColumns: readonly WorkOrderStatusColumn[]
}

function WorkStatusDraggableReservation({
	reservation,
	statusColumns,
	workOrderByReservation,
	workStatusMovePendingId,
	recordClass,
	agendaCardClass,
	flashClass,
	renderReservationCard,
}: DraggableReservationProps) {
	const reservationId = String(reservation.id ?? '')
	const workOrder = workOrderForReservation(reservation, workOrderByReservation)
	const workOrderId = String(workOrder?.id ?? '')
	const entryDay = String(reservation.day ?? '')
	const row: AgendaOperationalRow = {
		key: `reservation:${reservationId}`,
		day: entryDay,
		displayDay: entryDay,
		phase: 'entry',
		kind: workOrder ? 'reservation-work-order' : 'reservation-only',
		reservation,
		workOrder,
	}
	const status = workStatusForReservation(reservation, workOrderByReservation)
	const statusColumn = workStatusColumnForStatus(status, statusColumns)
	const canDrag = reservationCanMoveWorkStatus(
		reservation,
		workOrderByReservation,
	)
	const { listeners, setNodeRef, isDragging } = useDraggable({
		id: `work-status-reservation:${reservationId}`,
		data: {
			reservationId,
			status,
			statusGroup: statusColumn?.key,
			workOrderId,
		},
		disabled:
			!reservationId ||
			!canDrag ||
			Boolean(workStatusMovePendingId),
	})

	return (
		<MotionFlashSurface
			ref={setNodeRef}
			{...listeners}
			className={recordClass(
				'reservation',
				reservation.id,
				cx(
					'compact',
					agendaCardClass(row),
					flashClass(agendaCardFlashKey(row.key)),
					'work-status-card',
					'agenda-operational-card--draggable',
					!canDrag && 'agenda-operational-card--locked',
					isDragging && 'agenda-operational-card--dragging',
					workStatusMovePendingId === reservationId &&
						'agenda-operational-card--moving',
				),
			)}
		>
			<div className="agenda-card-stack">
				{renderReservationCard(reservation, row.workOrder, row, {
					statusMode: 'work-order',
				})}
			</div>
		</MotionFlashSurface>
	)
}

type DroppableLaneProps = SharedCardProps & {
	group: ReservationStatusGroup
	statusColumns: readonly WorkOrderStatusColumn[]
	workStatusDropStatus: string | null
}

function WorkStatusDroppableLane({
	group,
	statusColumns,
	workStatusDropStatus,
	workOrderByReservation,
	workStatusMovePendingId,
	recordClass,
	agendaCardClass,
	flashClass,
	renderReservationCard,
}: DroppableLaneProps) {
	const { setNodeRef } = useDroppable({
		id: `work-status:${group.key}`,
		data: { status: group.dropStatus ?? group.key, statusGroup: group.key },
	})

	return (
		<section
			ref={setNodeRef}
			className={cx(
				'panel',
				'work-group-panel',
				'work-status-lane',
				workStatusDropStatus === group.key &&
					'work-status-lane--drop-target',
			)}
		>
			<div className="panel-head">
				<div>
					<h2>{group.label}</h2>
					<p>{group.reservations.length} reservas</p>
				</div>
			</div>
			<div className="records compact-records">
				{group.reservations.length ? (
					group.reservations.map((reservation) => (
						<WorkStatusDraggableReservation
							key={`work-status-${group.key}-${reservation.id}`}
							reservation={reservation}
							statusColumns={statusColumns}
							workOrderByReservation={workOrderByReservation}
							workStatusMovePendingId={workStatusMovePendingId}
							recordClass={recordClass}
							agendaCardClass={agendaCardClass}
							flashClass={flashClass}
							renderReservationCard={renderReservationCard}
						/>
					))
				) : (
					<Empty
						text={`Sin trabajos en ${group.label.toLowerCase()}.`}
						hint="La columna queda lista para recibir trabajos cuando cambie el avance operativo."
					/>
				)}
			</div>
		</section>
	)
}

type WorkStatusViewProps = SharedCardProps & {
	sensors: SensorDescriptor<SensorOptions>[]
	onDragStart: (event: DragStartEvent) => void
	onDragOver: (event: any) => void
	onDragEnd: (event: DragEndEvent) => void
	onDragCancel: () => void
	statusColumns: readonly WorkOrderStatusColumn[]
	workStatusGroups: ReservationStatusGroup[]
	workStatusDropStatus: string | null
	activeWorkStatusRow: AgendaOperationalRow | null
	renderDragOverlay: (row: AgendaOperationalRow | null) => ReactNode
}

export function WorkStatusView({
	sensors,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDragCancel,
	statusColumns,
	workStatusGroups,
	workStatusDropStatus,
	workStatusMovePendingId,
	activeWorkStatusRow,
	workOrderByReservation,
	recordClass,
	agendaCardClass,
	flashClass,
	renderReservationCard,
	renderDragOverlay,
}: WorkStatusViewProps) {
	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDragCancel={onDragCancel}
		>
			<div className="grid work-groups work-status-groups">
				{workStatusGroups.map((group) => (
					<WorkStatusDroppableLane
						group={group}
						key={group.key}
						statusColumns={statusColumns}
						workStatusDropStatus={workStatusDropStatus}
						workOrderByReservation={workOrderByReservation}
						workStatusMovePendingId={workStatusMovePendingId}
						recordClass={recordClass}
						agendaCardClass={agendaCardClass}
						flashClass={flashClass}
						renderReservationCard={renderReservationCard}
					/>
				))}
			</div>
			<DragOverlay>
				{renderDragOverlay(activeWorkStatusRow)}
			</DragOverlay>
		</DndContext>
	)
}
