import type { Metadata } from 'next'

import { AppMotionProvider } from '@/app/components/motion/AppMotionProvider'

import './globals.css'

export const metadata: Metadata = {
	title: 'ShineApp',
	description: 'Gestion operativa para detailing y lavado de autos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es">
			<body>
				<AppMotionProvider>{children}</AppMotionProvider>
			</body>
		</html>
	)
}
