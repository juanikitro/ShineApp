import { type ReactNode } from 'react'

import { ChevronDown } from 'lucide-react'

import { cx } from '../utils'

type CollapsibleSectionProps = {
	title: ReactNode
	count?: number
	defaultOpen?: boolean
	className?: string
	children: ReactNode
}

export function CollapsibleSection({
	title,
	count,
	defaultOpen = false,
	className,
	children,
}: CollapsibleSectionProps) {
	return (
		<details className={cx('collapsible-section', className)} open={defaultOpen}>
			<summary className="collapsible-summary">
				<ChevronDown
					size={16}
					className="collapsible-chevron"
					aria-hidden="true"
				/>
				<span className="collapsible-title">{title}</span>
				{count != null ? (
					<span className="collapsible-count">{count}</span>
				) : null}
			</summary>
			<div className="collapsible-body">{children}</div>
		</details>
	)
}
