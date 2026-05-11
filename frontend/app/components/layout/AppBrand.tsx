import { cx } from '../utils'

type AppBrandProps = {
	className?: string
	collapsed?: boolean
	subtitle?: string
	themeMode?: 'light' | 'dark'
	titleAs?: 'h1' | 'span' | 'strong'
}

export function AppBrand({
	className,
	collapsed = false,
	subtitle,
	themeMode = 'light',
	titleAs = 'strong',
}: AppBrandProps) {
	const TitleTag = titleAs
	const logoSrc =
		themeMode === 'dark'
			? '/shineapp-logo-dark.png'
			: '/shineapp-logo.png'

	return (
		<div className={cx('app-brand', collapsed && 'app-brand--collapsed', className)}>
			<img
				src={logoSrc}
				alt={collapsed ? 'ShineApp' : ''}
				aria-hidden={collapsed ? undefined : true}
				className="app-brand-logo"
				height={44}
				width={44}
			/>
			{collapsed ? null : (
				<div className="app-brand-copy">
					<TitleTag className="app-brand-title">ShineApp</TitleTag>
					{subtitle ? (
						<span className="app-brand-subtitle">{subtitle}</span>
					) : null}
				</div>
			)}
		</div>
	)
}
