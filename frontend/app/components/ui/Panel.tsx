import { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cx } from '../utils'

type PanelProps = ComponentPropsWithoutRef<'section'> & {
	title?: string
	subtitle?: string
	actions?: ReactNode
}

export function Panel({
	title,
	subtitle,
	actions,
	className,
	children,
	...props
}: PanelProps) {
	return (
		<section className={cx('panel', className)} {...props}>
			{title || subtitle || actions ? (
				<div className="panel-head">
					<div>
						{title ? <h2>{title}</h2> : null}
						{subtitle ? <p>{subtitle}</p> : null}
					</div>
					{actions}
				</div>
			) : null}
			{children}
		</section>
	)
}
