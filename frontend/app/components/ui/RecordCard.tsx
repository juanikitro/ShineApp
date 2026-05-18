import {
	ComponentPropsWithoutRef,
	MouseEventHandler,
	ReactNode,
} from 'react'

import { cx } from '../utils'

type RecordCardProps = ComponentPropsWithoutRef<'div'> & {
	title?: ReactNode
	subtitle?: ReactNode
	primaryAction?: RecordCardPrimaryAction
	actions?: ReactNode
}

type RecordCardPrimaryAction = {
	ariaLabel: string
	onClick: MouseEventHandler<HTMLButtonElement>
	disabled?: boolean
}

type RecordCardHeaderProps = {
	title: ReactNode
	subtitle?: ReactNode
	children?: ReactNode
	primaryAction?: RecordCardPrimaryAction
	actions?: ReactNode
	className?: string
}

export function RecordCardHeader({
	title,
	subtitle,
	children,
	primaryAction,
	actions,
	className,
}: RecordCardHeaderProps) {
	const copy = (
		<div className="record-main-copy">
			<div className="record-title">{title}</div>
			{subtitle ? <div className="record-sub">{subtitle}</div> : null}
			{children}
		</div>
	)
	const hasActions = Boolean(actions)

	return (
		<div
			className={cx(
				'record-head',
				hasActions && 'record-head--split',
				className,
			)}
		>
			{primaryAction ? (
				<button
					type="button"
					className="record-main-action"
					aria-label={primaryAction.ariaLabel}
					disabled={primaryAction.disabled}
					onClick={primaryAction.onClick}
				>
					{copy}
				</button>
			) : (
				copy
			)}
			{hasActions ? <div className="record-actions">{actions}</div> : null}
		</div>
	)
}

export function RecordCard({
	className,
	children,
	title,
	subtitle,
	primaryAction,
	actions,
	...props
}: RecordCardProps) {
	return (
		<div className={cx('record', 'record-card', className)} {...props}>
			{title ? (
				<RecordCardHeader
					title={title}
					subtitle={subtitle}
					primaryAction={primaryAction}
					actions={actions}
				/>
			) : null}
			{children}
		</div>
	)
}
