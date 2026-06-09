import { ComponentPropsWithoutRef, ReactNode } from 'react'

import { AnimatedNumber } from '@/app/components/motion/AnimatedNumber'

import { cx } from '../utils'
import { Sparkline } from './Sparkline'

type MetricCardProps = ComponentPropsWithoutRef<'div'> & {
	label: ReactNode
	value: ReactNode
	hint?: ReactNode
	numericValue?: number
	format?: (value: number) => string
	animateValue?: boolean
	sparkline?: number[]
}

export function MetricCard({
	label,
	value,
	hint,
	numericValue,
	format,
	animateValue = true,
	sparkline,
	className,
	...props
}: MetricCardProps) {
	const renderedValue =
		animateValue && typeof numericValue === 'number' && format
			? <AnimatedNumber value={numericValue} format={format} />
			: value
	return (
		<div className={cx('metric', className)} {...props}>
			<span>{label}</span>
			<strong>{renderedValue}</strong>
			{hint ? <small>{hint}</small> : null}
			{sparkline && sparkline.length >= 2 ? (
				<Sparkline values={sparkline} className="metric-spark" />
			) : null}
		</div>
	)
}
