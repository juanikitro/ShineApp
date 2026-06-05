import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'ShineApp CRM',
		short_name: 'ShineApp',
		description: 'Gestion operativa para detailing y lavado de autos',
		start_url: '/?source=pwa',
		scope: '/',
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#f8fafc',
		theme_color: '#0284c7',
		lang: 'es',
		categories: ['business', 'productivity'],
		icons: [
			{
				src: '/icons/icon-192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/icons/icon-512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/icons/icon-maskable-192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable',
			},
			{
				src: '/icons/icon-maskable-512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
	}
}
