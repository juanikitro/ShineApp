import { ReactNode } from 'react'

type AppShellProps = {
	sidebar: ReactNode
	sidebarOverlay?: ReactNode
	children: ReactNode
	theme?: 'light' | 'dark'
}

export function AppShell({
	sidebar,
	sidebarOverlay,
	children,
	theme = 'light',
}: AppShellProps) {
	return (
		<div className="app-shell" data-theme={theme}>
			<a className="skip-link" href="#main-content">
				Saltar al contenido
			</a>
			{sidebar}
			<main id="main-content" tabIndex={-1} className="workspace">
				{sidebarOverlay}
				{children}
			</main>
		</div>
	)
}
