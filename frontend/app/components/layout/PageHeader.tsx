import { ReactNode } from 'react'

type PageHeaderProps = {
	title: string
	subtitle?: string
	titleAddon?: ReactNode
	actions?: ReactNode
}

export function PageHeader({
	title,
	subtitle,
	titleAddon,
	actions,
}: PageHeaderProps) {
	return (
		<header className="topbar">
			<div className="page-intro">
				<div className="page-title-row">
					<h1>{title}</h1>
					{titleAddon}
				</div>
				{subtitle ? <p>{subtitle}</p> : null}
			</div>
			{actions ? <div className="toolbar page-actions">{actions}</div> : null}
		</header>
	)
}
