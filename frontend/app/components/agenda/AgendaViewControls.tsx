'use client'

import { SegmentedControl, type SegmentedOption } from '@/app/components/ui/SegmentedControl'
import { type WorkOrderViewMode } from '@/lib/work-orders'

type AgendaViewControlsProps = {
	agendaSectorLabel: string
	visibleReservationCount: number
	workViewMode: WorkOrderViewMode
	agendaRangeMode: 'week' | 'month'
	agendaRangeModes: ReadonlyArray<SegmentedOption<'week' | 'month'>>
	workViewModes: ReadonlyArray<SegmentedOption<WorkOrderViewMode>>
	onAgendaRangeChange: (value: 'week' | 'month') => void
	onWorkViewChange: (value: WorkOrderViewMode) => void
}

export function AgendaViewControls({
	agendaSectorLabel,
	visibleReservationCount,
	workViewMode,
	agendaRangeMode,
	agendaRangeModes,
	workViewModes,
	onAgendaRangeChange,
	onWorkViewChange,
}: AgendaViewControlsProps) {
	return (
		<div className="work-view-strip">
			<div className="work-view-copy">
				<strong>{agendaSectorLabel}</strong>
				<small>
					{visibleReservationCount}{' '}
					{visibleReservationCount === 1
						? 'reserva visible'
						: 'reservas visibles'}
				</small>
			</div>
			{workViewMode === 'agenda' ? (
				<SegmentedControl
					ariaLabel="Rango de la agenda"
					className="agenda-range-toggle"
					options={agendaRangeModes}
					value={agendaRangeMode}
					onChange={onAgendaRangeChange}
				/>
			) : null}
			<SegmentedControl
				ariaLabel="Visualizacion de trabajos"
				className="work-view-toggle"
				options={workViewModes}
				selectionMode="tabs"
				value={workViewMode}
				onChange={onWorkViewChange}
			/>
		</div>
	)
}
