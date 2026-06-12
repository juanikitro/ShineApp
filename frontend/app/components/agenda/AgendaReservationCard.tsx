'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

import { Trash2 } from 'lucide-react'

import { type AgendaOperationalPhase } from '@/lib/agenda'
import { type AgendaReservationAction } from '@/lib/reservation-actions'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { cx } from '@/app/components/utils'

type AgendaRecord = Record<string, any>

export type AgendaServiceLine = {
	key: string
	name: string
}

type AgendaReservationCardProps = {
	reservation: AgendaRecord
	detailProps?: HTMLAttributes<HTMLDivElement>
	phase: AgendaOperationalPhase
	phaseLabel: string
	reservationStatusLabel: string
	reservationStatusValue: string
	workStatusValue: string
	workStatusLabels: Record<string, string>
	statusMode?: 'reservation' | 'work-order'
	listMode?: boolean
	title: string
	timeLabel?: string
	serviceLines: AgendaServiceLine[]
	vehicleModel?: string
	rangeLabel?: string
	workDebt?: ReactNode
	quickActionsTrigger?: ReactNode
	actions: AgendaReservationAction[]
	onAction: (action: AgendaReservationAction) => void
}

export function AgendaReservationCard({
	reservation,
	detailProps,
	phase,
	phaseLabel,
	reservationStatusLabel,
	reservationStatusValue,
	workStatusValue,
	workStatusLabels,
	statusMode = 'reservation',
	listMode = false,
	title,
	timeLabel,
	serviceLines,
	vehicleModel,
	rangeLabel,
	workDebt,
	quickActionsTrigger,
	actions,
	onAction,
}: AgendaReservationCardProps) {
	const isWorkStatusMode = statusMode === 'work-order'

	if (listMode) {
		return (
			<div
				className="agenda-entry-card agenda-entry-card--reservation agenda-entry-card--list"
				{...detailProps}
			>
				<div className="agenda-list-identity">
					<div className="agenda-entry-kicker">
						{isWorkStatusMode ? (
							<StatusPill value={workStatusValue} labels={workStatusLabels} />
						) : (
							<span className={`agenda-phase-badge agenda-phase-badge--${phase}`}>
								{phaseLabel}
							</span>
						)}
						{timeLabel ? (
							<span className="agenda-entry-time">{timeLabel}</span>
						) : null}
					</div>
					<div className="record-title">{title}</div>
					{serviceLines.length ? (
						<div className="agenda-service-stack" aria-label="Servicios">
							{serviceLines.map((service) => (
								<span className="agenda-service-name" key={service.key}>
									{service.name}
								</span>
							))}
						</div>
					) : null}
				</div>
				<div className="agenda-list-meta">
					{vehicleModel ? (
						<div className="agenda-list-meta-col">
							<span>Vehículo</span>
							<strong>{vehicleModel}</strong>
						</div>
					) : null}
					{rangeLabel ? (
						<div className="agenda-list-meta-col">
							<span>Período</span>
							<strong>{rangeLabel}</strong>
						</div>
					) : null}
				</div>
				<div className="agenda-list-actions">
					{quickActionsTrigger}
					<AgendaReservationActionBar
						actions={actions}
						reservationId={reservation.id}
						onAction={onAction}
					/>
				</div>
			</div>
		)
	}

	return (
		<div
			className="agenda-entry-card agenda-entry-card--reservation"
			{...detailProps}
		>
			<div className="agenda-entry-head">
				<div className="agenda-entry-copy">
					<div className="agenda-entry-kicker">
						{isWorkStatusMode ? (
							<StatusPill
								value={workStatusValue}
								labels={workStatusLabels}
							/>
						) : (
							<span className={`agenda-phase-badge agenda-phase-badge--${phase}`}>
								{phaseLabel}
							</span>
						)}
						{isWorkStatusMode ? null : (
							<span className="agenda-entry-eyebrow">
								{reservationStatusLabel || reservationStatusValue}
							</span>
						)}
						{timeLabel ? (
							<span className="agenda-entry-time">{timeLabel}</span>
						) : null}
					</div>
					<div className="record-title">{title}</div>
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
					{rangeLabel ? (
						<div className="agenda-range-label">{rangeLabel}</div>
					) : null}
				</div>
				{quickActionsTrigger ? (
					<div className="agenda-entry-tools">{quickActionsTrigger}</div>
				) : null}
			</div>
			{workDebt}
			<AgendaReservationActionBar
				actions={actions}
				reservationId={reservation.id}
				onAction={onAction}
			/>
		</div>
	)
}

function AgendaReservationActionBar({
	actions,
	reservationId,
	onAction,
}: {
	actions: AgendaReservationAction[]
	reservationId: unknown
	onAction: (action: AgendaReservationAction) => void
}) {
	if (!actions.length) return null

	const primaryActions = actions.filter((action) => action.priority === 'high')
	const secondaryActions = actions.filter((action) => action.priority !== 'high')

	return (
		<div className="agenda-card-actions">
			{primaryActions.length ? (
				<div
					className="agenda-primary-actions"
					aria-label="Acciones principales"
				>
					{primaryActions.map((action) => (
						<AgendaActionButton
							action={action}
							key={`${reservationId}:primary:${action.kind}:${action.label}`}
							onAction={onAction}
						/>
					))}
				</div>
			) : null}
			{secondaryActions.length ? (
				<div
					className="agenda-secondary-actions"
					aria-label="Acciones secundarias"
				>
					{secondaryActions.map((action) => (
						<AgendaActionButton
							action={action}
							key={`${reservationId}:secondary:${action.kind}:${action.label}`}
							onAction={onAction}
						/>
					))}
				</div>
			) : null}
		</div>
	)
}

function AgendaActionButton({
	action,
	onAction,
}: {
	action: AgendaReservationAction
	onAction: (action: AgendaReservationAction) => void
}) {
	const isIconOnly = action.variant === 'icon-danger'
	const label =
		action.kind === 'reservation' ? action.ariaLabel ?? action.label : action.label

	return (
		<button
			aria-label={isIconOnly ? label : undefined}
			className={agendaActionButtonClass(action)}
			onClick={() => onAction(action)}
			title={isIconOnly ? label : undefined}
			type="button"
		>
			{action.kind === 'reservation' && action.icon === 'trash' ? (
				<Trash2 aria-hidden="true" size={16} />
			) : null}
			{isIconOnly ? null : action.label}
		</button>
	)
}

function agendaActionButtonClass(action: AgendaReservationAction) {
	return cx(
		'agenda-action-button',
		action.variant === 'filled' && 'agenda-action-button--filled',
		action.variant === 'outline' && 'agenda-action-button--outline',
		action.variant === 'icon-danger' && 'agenda-action-button--icon-danger',
	)
}
