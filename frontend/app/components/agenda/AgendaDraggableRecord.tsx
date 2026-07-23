'use client'

import { useDraggable } from '@dnd-kit/core'
import { type CSSProperties, type ReactNode } from 'react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { cx } from '@/app/components/utils'
import { type AgendaOperationalRow } from '@/lib/agenda'
import { agendaCardFlashKey } from '@/lib/flash-targets'

type AgendaDraggableRecordProps = {
	row: AgendaOperationalRow
	children: ReactNode
	className?: string
	style?: CSSProperties
	interactive?: boolean
	snapshotKey?: string
	agendaMovePendingId: string | null
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	agendaCardClass: (row: AgendaOperationalRow) => string
	flashClass: (target: string | null) => string
}

export function AgendaDraggableRecord({
	row,
	children,
	className,
	style,
	interactive = true,
	snapshotKey = 'active',
	agendaMovePendingId,
	recordClass,
	agendaCardClass,
	flashClass,
}: AgendaDraggableRecordProps) {
	const reservationId = String(row.reservation?.id ?? '')
	const canDrag = interactive && row.phase === 'entry'
	const { listeners, setNodeRef, isDragging } = useDraggable({
		id: interactive ? row.key : `${snapshotKey}:drag:${row.key}`,
		data: {
			reservationId,
			day: String(row.reservation?.day ?? row.day),
		},
		disabled:
			!interactive || !reservationId || !canDrag || Boolean(agendaMovePendingId),
	})

	return (
		<MotionFlashSurface
			ref={setNodeRef}
			{...listeners}
			className={recordClass(
				row.workOrder ? 'workorder' : 'reservation',
				row.workOrder?.id ?? row.reservation?.id,
				cx(
					'compact',
					agendaCardClass(row),
					className,
					flashClass(agendaCardFlashKey(row.key)),
					'agenda-operational-card--draggable',
					!canDrag && 'agenda-operational-card--locked',
					isDragging && 'agenda-operational-card--dragging',
					agendaMovePendingId === reservationId &&
						'agenda-operational-card--moving',
				),
			)}
			style={style}
		>
			<div className="agenda-card-stack">{children}</div>
		</MotionFlashSurface>
	)
}
