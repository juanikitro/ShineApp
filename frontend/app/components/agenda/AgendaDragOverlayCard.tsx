'use client'

import { type ReactNode } from 'react'

import { type AgendaServiceLine } from '@/lib/agenda-display'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { cx } from '@/app/components/utils'

type AgendaDragOverlayCardProps = {
	cardClass: string
	showWorkStatus: boolean
	timeLabel: string
	customerName: string
	serviceLines: AgendaServiceLine[]
	vehicleModel: string
	statusValue: string
	statusLabels: Record<string, string>
	workDebt?: ReactNode
}

export function AgendaDragOverlayCard({
	cardClass,
	showWorkStatus,
	timeLabel,
	customerName,
	serviceLines,
	vehicleModel,
	statusValue,
	statusLabels,
	workDebt,
}: AgendaDragOverlayCardProps) {
	return (
		<div
			className={cx(
				'record',
				'compact',
				cardClass,
				'agenda-operational-card--drag-overlay',
			)}
		>
			<div className="agenda-card-stack">
				<div className="agenda-entry-card agenda-entry-card--reservation">
					<div className="agenda-entry-head">
						<div className="agenda-entry-copy">
							<div className="agenda-entry-kicker">
								<span className="agenda-entry-eyebrow">
									{showWorkStatus ? 'Trabajo' : 'Reserva'}
								</span>
								{timeLabel ? (
									<span className="agenda-entry-time">{timeLabel}</span>
								) : null}
							</div>
							<div className="record-title">{customerName}</div>
							{serviceLines.length ? (
								<div className="agenda-service-stack" aria-label="Servicios">
									{serviceLines.map((service) => (
										<span className="agenda-service-name" key={service.key}>
											{service.name}
										</span>
									))}
								</div>
							) : null}
							{vehicleModel ? (
								<div className="agenda-vehicle-model">{vehicleModel}</div>
							) : null}
						</div>
						<StatusPill value={statusValue} labels={statusLabels} />
					</div>
					{workDebt}
				</div>
			</div>
		</div>
	)
}
