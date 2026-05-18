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
		<main className="app-shell" data-theme={theme}>
			{sidebar}
			<section className="workspace">
				{sidebarOverlay}
				{children}
			</section>
		</main>
	)
}
