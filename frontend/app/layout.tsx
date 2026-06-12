import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'

import { AppMotionProvider } from '@/app/components/motion/AppMotionProvider'

import './globals.css'

export const metadata: Metadata = {
	title: 'ShineApp',
	description: 'Gestion operativa para detailing y lavado de autos',
	applicationName: 'ShineApp',
	appleWebApp: {
		capable: true,
		title: 'ShineApp',
		statusBarStyle: 'default',
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: [
			{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
			{ url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
		],
		apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
	},
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	viewportFit: 'cover',
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#0284c7' },
		{ media: '(prefers-color-scheme: dark)', color: '#0b2447' },
	],
}

const montserrat = Montserrat({
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
	weight: ['400', '500', '600', '700'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es" className={montserrat.variable}>
			<body>
				<AppMotionProvider>{children}</AppMotionProvider>
			</body>
		</html>
	)
}
