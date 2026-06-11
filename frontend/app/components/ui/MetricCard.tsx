import { ComponentPropsWithoutRef, ReactNode } from 'react'

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
	className,
	...props
}: MetricCardProps) {
	const renderedValue =
		animateValue && typeof numericValue === 'number' && format
			? <AnimatedNumber value={numericValue} format={format} />
			: value
	return (
		<div className={cx('metric', className)} {...props}>
			{icon ? <span className="metric-icon" aria-hidden="true">{icon}</span> : null}
			<span>{label}</span>
			<strong>{renderedValue}</strong>
			{hint ? <small>{hint}</small> : null}
			{footer ?? null}
		</div>
	)
}
