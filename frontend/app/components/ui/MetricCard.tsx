import { ComponentPropsWithoutRef, ReactNode, useId } from 'react'

import { AnimatedNumber } from '@/app/components/motion/AnimatedNumber'

import { cx } from '../utils'

type MetricCardProps = ComponentPropsWithoutRef<'div'> & {
	label: ReactNode
	value: ReactNode
	hint?: ReactNode
	footer?: ReactNode
	icon?: ReactNode
	numericValue?: number
	format?: (value: number) => string
	animateValue?: boolean
	tooltip?: ReactNode
}

export function MetricCard({
	label,
	value,
	hint,
	footer,
	icon,
	numericValue,
	format,
	animateValue = true,
	tooltip,
	className,
	tabIndex,
	'aria-describedby': ariaDescribedBy,
	...props
}: MetricCardProps) {
	const tooltipId = useId()
	const renderedValue =
		animateValue && typeof numericValue === 'number' && format
			? <AnimatedNumber value={numericValue} format={format} />
			: value
	const describedBy = [ariaDescribedBy, tooltip ? tooltipId : null]
		.filter(Boolean)
		.join(' ') || undefined
	return (
		<div
			className={cx('metric', tooltip ? 'metric--with-tooltip' : undefined, className)}
			tabIndex={tooltip ? (tabIndex ?? 0) : tabIndex}
			aria-describedby={describedBy}
			{...props}
		>
			{icon ? <span className="metric-icon" aria-hidden="true">{icon}</span> : null}
			<span>{label}</span>
			<strong>{renderedValue}</strong>
			{hint ? <small>{hint}</small> : null}
			{footer ?? null}
			{tooltip ? (
				<span id={tooltipId} role="tooltip" className="metric-tooltip">
					{tooltip}
				</span>
			) : null}
		</div>
	)
}
