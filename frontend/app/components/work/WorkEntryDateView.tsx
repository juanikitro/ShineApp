'use client'

import { Plus } from 'lucide-react'
import { type ReactNode } from 'react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { cx } from '@/app/components/utils'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { type AgendaOperationalRow } from '@/lib/agenda'
import { type AnyRecord, formatDateLabel } from '@/lib/page-support'
import { type ReservationEntryDateGroup } from '@/lib/work-orders'

function agendaCardFlashKey(rowKey: string) {
	return `agenda:${rowKey}`
}

type WorkEntryDateViewProps = {
	workEntryDateGroups: ReservationEntryDateGroup[]
	workFreeQuotesWithoutEntryDate: AnyRecord[]
	selectedDay: string
	onCreateReservation: () => void
	getReservationRow: (reservation: AnyRecord) => AgendaOperationalRow
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	agendaCardClass: (row: AgendaOperationalRow) => string
	flashClass: (target: string | null) => string
	renderReservationCard: (
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		options?: { statusMode?: 'reservation' | 'work-order'; listMode?: boolean },
	) => ReactNode
	quoteQuickActions: (item: AnyRecord) => QuickAction[]
	detailRecordProps: (kind: string, data: AnyRecord) => Record<string, unknown>
	quickActionTargetProps: (
		title: string,
		actions: QuickAction[],
	) => Record<string, unknown>
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel: string,
	) => ReactNode
	renderQuoteCardContent: (item: AnyRecord) => ReactNode
}

export function WorkEntryDateView({
	workEntryDateGroups,
	workFreeQuotesWithoutEntryDate,
	selectedDay,
	onCreateReservation,
	getReservationRow,
	recordClass,
	agendaCardClass,
	flashClass,
	renderReservationCard,
	quoteQuickActions,
	detailRecordProps,
	quickActionTargetProps,
	renderQuickActionsTrigger,
	renderQuoteCardContent,
}: WorkEntryDateViewProps) {
	function renderReservationListCard(reservation: AnyRecord) {
		const row = getReservationRow(reservation)
		return (
			<MotionFlashSurface
				className={recordClass(
					'reservation',
					reservation.id,
					cx(
						'compact',
						agendaCardClass(row),
						flashClass(agendaCardFlashKey(row.key)),
					),
				)}
				key={`work-reservation-${reservation.id}`}
			>
				<div className="agenda-card-stack">
					{renderReservationCard(reservation, row.workOrder, row, {
						statusMode: 'work-order',
						listMode: true,
					})}
				</div>
			</MotionFlashSurface>
		)
	}

	function renderFreeQuoteCard(item: AnyRecord) {
		const quickActions = quoteQuickActions(item)
		return (
			<MotionFlashSurface
				className={recordClass('quote', item.id, 'quote-board-card')}
				key={`work-free-quote-${item.id}`}
				{...detailRecordProps('Cotizacion', item)}
				{...quickActionTargetProps('Acciones de cotizacion', quickActions)}
			>
				{renderQuickActionsTrigger(
					'Acciones de cotizacion',
					quickActions,
					'Acciones rapidas de cotizacion',
				)}
				{renderQuoteCardContent(item)}
			</MotionFlashSurface>
		)
	}

	const hasContent =
		workEntryDateGroups.length || workFreeQuotesWithoutEntryDate.length

	if (!hasContent) {
		return (
			<section className="panel">
				<Empty
					text="Sin reservas o cotizaciones para este filtro."
					hint="Crea una reserva o cambia el tipo de servicio para ver trabajos por fecha de ingreso."
					action={
						<button
							type="button"
							className="primary"
							onClick={() => onCreateReservation()}
						>
							<Plus size={16} />
							Crear reserva
						</button>
					}
				/>
			</section>
		)
	}

	return (
		<div className="grid work-groups work-groups--entry-date">
			{workEntryDateGroups.map((group) => (
				<section className="panel work-group-panel" key={group.key}>
					<div className="panel-head">
						<div>
							<h2>{formatDateLabel(group.entryDate)}</h2>
							<p>{group.reservations.length} reservas</p>
						</div>
					</div>
					<div className="records compact-records">
						{group.reservations.map((reservation) =>
							renderReservationListCard(reservation),
						)}
					</div>
				</section>
			))}
			{workFreeQuotesWithoutEntryDate.length ? (
				<section
					className="panel work-group-panel"
					key="without-entry-date"
				>
					<div className="panel-head">
						<div>
							<h2>Sin fecha de ingreso</h2>
							<p>{workFreeQuotesWithoutEntryDate.length} cotizaciones libres</p>
						</div>
					</div>
					<div className="records compact-records">
						{workFreeQuotesWithoutEntryDate.map((quote) =>
							renderFreeQuoteCard(quote),
						)}
					</div>
				</section>
			) : null}
		</div>
	)
}
