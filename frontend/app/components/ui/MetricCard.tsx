import { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cx } from '../utils'

type MetricCardProps = ComponentPropsWithoutRef<'div'> & {
	label: ReactNode
	value: ReactNode
}

export function MetricCard({
	label,
	value,
	className,
	...props
}: MetricCardProps) {
	return (
		<div className={cx('metric', className)} {...props}>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	)
}
