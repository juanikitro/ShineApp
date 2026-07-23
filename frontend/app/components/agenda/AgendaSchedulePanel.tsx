'use client'

import { RefreshCw } from 'lucide-react'
import { type ReactNode } from 'react'

import { Button } from '@/app/components/ui/Button'
import { ErrorState } from '@/app/components/ui/Empty'
import { SkeletonLine } from '@/app/components/ui/Skeleton'
import { type AgendaMonthChip, type AgendaMonthWeek } from '@/lib/agenda'

import { AgendaBoardToolbar } from './AgendaBoardToolbar'
import { AgendaMonthGrid } from './AgendaMonthGrid'

type AgendaSchedulePanelProps = {
	currentDay: string
	startLabel: string
	endLabel: string
	visibleDays: number
	rangeMode: 'week' | 'month'
	title?: string
	onMove: (offset: number) => void
	onToday: () => void
	onGoToDate: (isoDate: string) => void
	onOpenCashForRange: () => void
	agendaLoadError: { title: string; description: string } | null
	onReload: () => void
	monthWeeks: AgendaMonthWeek[]
	monthWeekdayLabels: string[]
	onSelectDay: (isoDate: string) => void
	onSelectReservation: (chip: AgendaMonthChip) => void
	chipClassName: (chip: AgendaMonthChip) => string
	chipLabel: (chip: AgendaMonthChip) => string
	dayAriaLabel: (isoDate: string) => string
	agendaWeekSkeletonActive: boolean
	renderWeekBoard: () => ReactNode
}

export function AgendaSchedulePanel({
	currentDay,
	startLabel,
	endLabel,
	visibleDays,
	rangeMode,
	title,
	onMove,
	onToday,
	onGoToDate,
	onOpenCashForRange,
	agendaLoadError,
	onReload,
	monthWeeks,
	monthWeekdayLabels,
	onSelectDay,
	onSelectReservation,
	chipClassName,
	chipLabel,
	dayAriaLabel,
	agendaWeekSkeletonActive,
	renderWeekBoard,
}: AgendaSchedulePanelProps) {
	return (
		<div className="grid agenda-layout">
			<section className="panel agenda-panel">
				<AgendaBoardToolbar
					currentDay={currentDay}
					endLabel={endLabel}
					startLabel={startLabel}
					visibleDays={visibleDays}
					rangeMode={rangeMode}
					title={title}
					onMove={onMove}
					onToday={onToday}
					onGoToDate={onGoToDate}
					onOpenCashForRange={onOpenCashForRange}
				/>
				{agendaLoadError ? (
					<ErrorState
						text={agendaLoadError.title}
						hint={agendaLoadError.description}
						action={
							<Button type="button" variant="ghost" onClick={onReload}>
								<RefreshCw size={16} />
								Actualizar
							</Button>
						}
					/>
				) : null}
				{rangeMode === 'month' && !agendaLoadError ? (
					<AgendaMonthGrid
						weeks={monthWeeks}
						weekdayLabels={monthWeekdayLabels}
						onSelectDay={onSelectDay}
						onSelectReservation={onSelectReservation}
						chipClassName={chipClassName}
						chipLabel={chipLabel}
						dayAriaLabel={dayAriaLabel}
					/>
				) : null}
				{agendaWeekSkeletonActive ? (
					<div
						className="agenda-skeleton-grid"
						role="status"
						aria-live="polite"
						aria-label="Cargando agenda"
					>
						{Array.from({ length: visibleDays }).map((_, index) => (
							<div
								key={index}
								className="agenda-skeleton-column"
								aria-hidden="true"
							>
								<div className="agenda-skeleton-head">
									<SkeletonLine width="70%" height={15} />
									<SkeletonLine width="45%" height={11} />
								</div>
								<div className="agenda-skeleton-lane">
									<span className="skeleton agenda-skeleton-card" />
									<span className="skeleton agenda-skeleton-card" />
								</div>
							</div>
						))}
					</div>
				) : null}
				{rangeMode === 'week' ? renderWeekBoard() : null}
			</section>
		</div>
	)
}
