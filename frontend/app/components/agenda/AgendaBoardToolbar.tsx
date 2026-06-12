'use client'

import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react'

type AgendaBoardToolbarProps = {
	startLabel: string
	endLabel: string
	currentDay: string
	visibleDays: number
	onMove: (offset: number) => void
	onToday: () => void
	onGoToDate: (isoDate: string) => void
}

export function AgendaBoardToolbar({
	startLabel,
	endLabel,
	currentDay,
	visibleDays,
	onMove,
	onToday,
	onGoToDate,
}: AgendaBoardToolbarProps) {
	return (
		<div className="agenda-toolbar">
			<div className="agenda-toolbar-copy">
				<h2 className="week-title">
					Agenda del {startLabel} al {endLabel}
				</h2>
			</div>
			<div className="agenda-toolbar-tools">
				<div className="agenda-nav-row">
					<input
						type="date"
						className="agenda-date-picker"
						aria-label="Ir a fecha"
						title="Ir a fecha"
						value={currentDay}
						onChange={(e) => e.target.value && onGoToDate(e.target.value)}
					/>
					<div className="agenda-nav" aria-label="Navegar agenda">
						<button
							type="button"
							className="ghost icon-button"
							aria-label={`Retroceder ${visibleDays} dias`}
							title={`Retroceder ${visibleDays} dias`}
							onClick={() => onMove(-visibleDays)}
						>
							<ChevronsLeft size={17} />
						</button>
						<button
							type="button"
							className="ghost icon-button"
							aria-label="Retroceder 1 dia"
							title="Retroceder 1 dia"
							onClick={() => onMove(-1)}
						>
							<ChevronLeft size={17} />
						</button>
						<button
							type="button"
							className="ghost"
							aria-label="Ir a hoy"
							title="Ir a hoy"
							onClick={onToday}
						>
							Hoy
						</button>
						<button
							type="button"
							className="ghost icon-button"
							aria-label="Adelantar 1 dia"
							title="Adelantar 1 dia"
							onClick={() => onMove(1)}
						>
							<ChevronRight size={17} />
						</button>
						<button
							type="button"
							className="ghost icon-button"
							aria-label={`Adelantar ${visibleDays} dias`}
							title={`Adelantar ${visibleDays} dias`}
							onClick={() => onMove(visibleDays)}
						>
							<ChevronsRight size={17} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
