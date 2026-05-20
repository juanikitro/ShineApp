'use client'

import {
	type MouseEventHandler,
	type ReactNode,
} from 'react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { RecordCardHeader } from '@/app/components/ui/RecordCard'
import { cx } from '@/app/components/utils'

type FinanceRecordBadge = {
	label: ReactNode
	className?: string
}

type FinanceRecordStat = {
	label: ReactNode
	value: ReactNode
	hint?: ReactNode
}

type FinanceRecordAmount = {
	label: ReactNode
	value: ReactNode
	tone?: 'income' | 'expense' | 'neutral' | 'payment' | 'warning'
}

type FinanceRecordAction = {
	label: ReactNode
	icon?: ReactNode
	onClick: MouseEventHandler<HTMLButtonElement>
	disabled?: boolean
	variant?: 'primary' | 'ghost' | 'danger'
	ariaLabel?: string
}

type FinanceRecordCardProps = {
	className?: string
	title: ReactNode
	subtitle?: ReactNode
	badges?: FinanceRecordBadge[]
	amount?: FinanceRecordAmount
	stats?: FinanceRecordStat[]
	primaryAction?: FinanceRecordAction
	secondaryActions?: FinanceRecordAction[]
	quickActionsTrigger?: ReactNode
	onContextMenu?: MouseEventHandler<HTMLDivElement>
}

function renderAction(action: FinanceRecordAction, key: string) {
	return (
		<button
			type="button"
			className={action.variant ?? 'ghost'}
			aria-label={action.ariaLabel}
			disabled={action.disabled}
			onClick={action.onClick}
			key={key}
		>
			{action.icon}
			{action.label}
		</button>
	)
}

export function FinanceRecordCard({
	className,
	title,
	subtitle,
	badges = [],
	amount,
	stats = [],
	primaryAction,
	secondaryActions = [],
	quickActionsTrigger,
	onContextMenu,
}: FinanceRecordCardProps) {
	const hasActions = Boolean(
		primaryAction ||
			secondaryActions.length ||
			amount ||
			quickActionsTrigger,
	)

	return (
		<MotionFlashSurface
			className={cx(className, 'finance-record-card')}
			onContextMenu={onContextMenu}
		>
			<RecordCardHeader
				title={title}
				subtitle={subtitle}
				className="finance-record-head"
				actions={
					hasActions ? (
						<div className="finance-record-side">
							{amount ? (
								<div
									className={cx(
										'finance-record-amount',
										amount.tone && `finance-record-amount--${amount.tone}`,
									)}
								>
									<span>{amount.label}</span>
									<strong>{amount.value}</strong>
								</div>
							) : null}
							{primaryAction || secondaryActions.length ? (
								<div className="finance-record-actions">
									{primaryAction ? renderAction(primaryAction, 'primary') : null}
									{secondaryActions.length ? (
										<div className="finance-record-secondary-actions">
											{secondaryActions.map((action, index) =>
												renderAction(action, `secondary-${index}`),
											)}
										</div>
									) : null}
								</div>
							) : null}
							{quickActionsTrigger}
						</div>
					) : null
				}
			>
				{badges.length ? (
					<div className="finance-record-meta">
						{badges.map((badge, index) => (
							<span
								className={cx('finance-record-badge', badge.className)}
								key={index}
							>
								{badge.label}
							</span>
						))}
					</div>
				) : null}
			</RecordCardHeader>
			{stats.length ? (
				<div className="finance-record-body">
					{stats.map((stat, index) => (
						<div className="finance-record-stat" key={index}>
							<span>{stat.label}</span>
							<strong>{stat.value}</strong>
							{stat.hint ? <small>{stat.hint}</small> : null}
						</div>
					))}
				</div>
			) : null}
		</MotionFlashSurface>
	)
}
