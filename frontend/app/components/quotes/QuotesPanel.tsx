'use client'

import {
	closestCenter,
	DndContext,
	DragOverlay,
	useDraggable,
	useDroppable,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { type ReactNode } from 'react'

import { CalendarDays, FileText, Plus } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { cx } from '@/app/components/utils'
import { serviceDisplayName } from '@/lib/service-display'
import {
	money,
	type AnyRecord,
} from '@/lib/page-support'

type QuoteLaneStatus = 'draft' | 'sent'

type QuoteCardContentProps = {
	item: AnyRecord
	overlay?: boolean
	quoteCode: (item: AnyRecord) => string
	quoteHasReservation: (item: AnyRecord) => boolean
	quoteLaneStatus: (item: AnyRecord) => QuoteLaneStatus
	quoteTentativeTimeLabel: (value: any) => string
	onCreateReservationFromQuote: (item: AnyRecord) => void
	onDownloadQuotePdf: (item: AnyRecord) => void
	onDownloadQuotePdfAndMarkSent: (item: AnyRecord) => void
	onOpenQuoteReservationInAgenda: (item: AnyRecord) => void
}

export function QuoteCardContent({
	item,
	overlay = false,
	quoteCode,
	quoteHasReservation,
	quoteLaneStatus,
	quoteTentativeTimeLabel,
	onCreateReservationFromQuote,
	onDownloadQuotePdf,
	onDownloadQuotePdfAndMarkSent,
	onOpenQuoteReservationInAgenda,
}: QuoteCardContentProps) {
	const code = quoteCode(item)
	const hasReservation = quoteHasReservation(item)
	const isDraft = quoteLaneStatus(item) === 'draft'

	return (
		<div className="record-head quote-card-head">
			<div className="quote-card-copy">
				<div className="record-title">
					Cotizacion {code} - {item.customer_name}
				</div>
				<div className="record-sub">
					{item.vehicle_label || 'Sin vehiculo'} - {money(item.total)}
				</div>
				{item.reservation_day ? (
					<div className="record-sub">
						Reserva tentativa: {item.reservation_day}
						{quoteTentativeTimeLabel(item.reservation_start_time)}
					</div>
				) : null}
				{item.items?.length ? (
					<div className="quote-card-services" aria-label="Servicios">
						{item.items.map((quoteItem: AnyRecord) => (
							<span
								className="quote-card-service-name"
								key={quoteItem.id ?? `${item.id}-${quoteItem.service}`}
							>
								{serviceDisplayName({
									service_icon: quoteItem.service_icon,
									service_name:
										quoteItem.service_name ?? quoteItem.description,
								})}
							</span>
						))}
					</div>
				) : null}
			</div>
			{overlay ? null : (
				<div className="record-actions quote-card-actions">
					{hasReservation ? (
						<button
							type="button"
							className="ghost quote-action-button quote-action-button--outline"
							aria-label="Ver reserva en agenda"
							onClick={() => onOpenQuoteReservationInAgenda(item)}
						>
							<CalendarDays size={16} />
							Agenda
						</button>
					) : (
						<button
							type="button"
							className="ghost quote-action-button quote-action-button--outline"
							aria-label="Crear reserva desde cotizacion"
							onClick={() => onCreateReservationFromQuote(item)}
						>
							<CalendarDays size={16} />
							Reserva
						</button>
					)}
					<button
						type="button"
						className="ghost quote-action-button quote-action-button--outline"
						aria-label="Bajar PDF"
						onClick={() => onDownloadQuotePdf(item)}
					>
						<FileText size={16} />
						PDF
					</button>
					{isDraft ? (
						<button
							type="button"
							className="primary quote-action-button quote-action-button--filled"
							aria-label="Bajar PDF y marcar cotizacion como enviada"
							onClick={() => onDownloadQuotePdfAndMarkSent(item)}
						>
							<FileText size={16} />
							Enviar
						</button>
					) : null}
				</div>
			)}
		</div>
	)
}

type QuotesPanelProps = {
	activeQuoteDrag: AnyRecord | null
	agendaSensors: any
	quoteBoard: Record<QuoteLaneStatus, AnyRecord[]>
	quoteDropStatus: QuoteLaneStatus | null
	quoteMovePendingId: string | null
	detailRecordProps: (title: string, data: AnyRecord) => AnyRecord
	quickActionTargetProps: (title: string, actions: QuickAction[]) => AnyRecord
	quoteCode: (item: AnyRecord) => string
	quoteHasReservation: (item: AnyRecord) => boolean
	quoteLaneStatus: (item: AnyRecord) => QuoteLaneStatus
	quoteQuickActions: (quote: AnyRecord) => QuickAction[]
	quoteTentativeTimeLabel: (value: any) => string
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	renderQuickActionsTrigger: (
		label: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	onCreateQuote: () => void
	onCreateReservationFromQuote: (item: AnyRecord) => void
	onDownloadQuotePdf: (item: AnyRecord) => void
	onDownloadQuotePdfAndMarkSent: (item: AnyRecord) => void
	onOpenQuoteReservationInAgenda: (item: AnyRecord) => void
	onQuoteDragCancel: () => void
	onQuoteDragEnd: (event: DragEndEvent) => void
	onQuoteDragOver: (event: any) => void
	onQuoteDragStart: (event: DragStartEvent) => void
}

export function QuotesPanel({
	activeQuoteDrag,
	agendaSensors,
	quoteBoard,
	quoteDropStatus,
	quoteMovePendingId,
	detailRecordProps,
	quickActionTargetProps,
	quoteCode,
	quoteHasReservation,
	quoteLaneStatus,
	quoteQuickActions,
	quoteTentativeTimeLabel,
	recordClass,
	renderQuickActionsTrigger,
	onCreateQuote,
	onCreateReservationFromQuote,
	onDownloadQuotePdf,
	onDownloadQuotePdfAndMarkSent,
	onOpenQuoteReservationInAgenda,
	onQuoteDragCancel,
	onQuoteDragEnd,
	onQuoteDragOver,
	onQuoteDragStart,
}: QuotesPanelProps) {
	const quoteCardContentProps = {
		quoteCode,
		quoteHasReservation,
		quoteLaneStatus,
		quoteTentativeTimeLabel,
		onCreateReservationFromQuote,
		onDownloadQuotePdf,
		onDownloadQuotePdfAndMarkSent,
		onOpenQuoteReservationInAgenda,
	}

	function QuoteDraggableRecord({ item }: { item: AnyRecord }) {
		const quoteId = String(item.id ?? '')
		const laneStatus = quoteLaneStatus(item)
		const canDrag = laneStatus === 'draft'
		const quickActions = quoteQuickActions(item)
		const { listeners, setNodeRef, isDragging } = useDraggable({
			id: `quote:${quoteId}`,
			data: {
				quoteId,
				status: laneStatus,
			},
			disabled: !quoteId || !canDrag || Boolean(quoteMovePendingId),
		})

		return (
			<MotionFlashSurface
				ref={setNodeRef}
				{...listeners}
				className={recordClass(
					'quote',
					item.id,
					cx(
						'quote-board-card',
						'quote-board-card--draggable',
						!canDrag && 'quote-board-card--locked',
						isDragging && 'quote-board-card--dragging',
						quoteMovePendingId === quoteId && 'quote-board-card--moving',
					),
				)}
				{...detailRecordProps('Cotizacion', item)}
				{...quickActionTargetProps('Acciones de cotizacion', quickActions)}
			>
				{renderQuickActionsTrigger(
					'Acciones de cotizacion',
					quickActions,
					'Acciones rapidas de cotizacion',
				)}
				<QuoteCardContent item={item} {...quoteCardContentProps} />
			</MotionFlashSurface>
		)
	}

	function QuoteDroppableLane({
		status,
		children,
	}: {
		status: QuoteLaneStatus
		children: ReactNode
	}) {
		const { setNodeRef } = useDroppable({
			id: `quote-lane:${status}`,
			data: { status },
		})
		const count = quoteBoard[status].length

		return (
			<section
				ref={setNodeRef}
				className={cx(
					'quote-lane',
					`quote-lane--${status}`,
					quoteDropStatus === status && 'quote-lane--drop-target',
				)}
			>
				<div className="quote-lane-head">
					<div>
						<h3>{status === 'draft' ? 'Sin enviar' : 'Enviados'}</h3>
						<span>
							{status === 'draft'
								? 'Por fecha de creacion'
								: 'Por fecha de envio'}
						</span>
					</div>
					<strong>{count}</strong>
				</div>
				<div className="records quote-lane-records">{children}</div>
			</section>
		)
	}

	function renderQuoteDragOverlay(item: AnyRecord | null) {
		if (!item) return null
		return (
			<div className="record quote-board-card quote-board-card--drag-overlay">
				<QuoteCardContent item={item} overlay {...quoteCardContentProps} />
			</div>
		)
	}

	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<button type="button" className="primary" onClick={onCreateQuote}>
						<Plus size={16} />
						Nueva cotizacion
					</button>
				</div>
				<DndContext
					sensors={agendaSensors}
					collisionDetection={closestCenter}
					onDragStart={onQuoteDragStart}
					onDragOver={onQuoteDragOver}
					onDragEnd={onQuoteDragEnd}
					onDragCancel={onQuoteDragCancel}
				>
					<div className="quote-board">
						<QuoteDroppableLane status="draft">
							{quoteBoard.draft.length ? (
								quoteBoard.draft.map((item) => (
									<QuoteDraggableRecord item={item} key={item.id} />
								))
							) : (
								<Empty text="Sin cotizaciones sin enviar." />
							)}
						</QuoteDroppableLane>
						<QuoteDroppableLane status="sent">
							{quoteBoard.sent.length ? (
								quoteBoard.sent.map((item) => (
									<QuoteDraggableRecord item={item} key={item.id} />
								))
							) : (
								<Empty text="Sin cotizaciones enviadas." />
							)}
						</QuoteDroppableLane>
					</div>
					<DragOverlay>{renderQuoteDragOverlay(activeQuoteDrag)}</DragOverlay>
				</DndContext>
			</section>
		</div>
	)
}
