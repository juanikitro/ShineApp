import { ReactNode } from 'react'

type AppShellProps = {
	sidebar: ReactNode
	children: ReactNode
	theme?: 'light' | 'dark'
}

export function AppShell({ sidebar, children, theme = 'light' }: AppShellProps) {
	return (
		<main className="app-shell" data-theme={theme}>
			{sidebar}
			<section className="workspace">{children}</section>
		</main>
	)
}
