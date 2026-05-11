import { ComponentPropsWithoutRef } from 'react'

import { cx } from '../utils'

type RecordCardProps = ComponentPropsWithoutRef<'div'>

export function RecordCard({
	className,
	children,
	...props
}: RecordCardProps) {
	return (
		<div className={cx('record', className)} {...props}>
			{children}
		</div>
	)
}
