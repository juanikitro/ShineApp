import { NextResponse } from 'next/server'

type LandingPayload = {
	business?: { name?: string }
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api').replace(/\/$/, '')

async function fetchBusinessName(slug: string): Promise<string | null> {
	try {
		const response = await fetch(`${API_URL}/public/landing/${encodeURIComponent(slug)}/`, {
			next: { revalidate: 300 },
			headers: { Accept: 'application/json' },
		})
		if (!response.ok) return null
		const payload = (await response.json()) as LandingPayload
		const name = payload.business?.name?.trim()
		return name && name.length > 0 ? name : null
	} catch {
		return null
	}
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
	const { slug } = await context.params
	const businessName = (await fetchBusinessName(slug)) ?? 'Reserva online'
	const shortName = businessName.length > 12 ? `${businessName.slice(0, 11)}…` : businessName

	const manifest = {
		name: businessName,
		short_name: shortName,
		description: `Reserva y cotizaciones online de ${businessName}`,
		start_url: `/publica/${slug}?source=pwa`,
		scope: `/publica/${slug}`,
		id: `/publica/${slug}`,
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#f8fafc',
		theme_color: '#0284c7',
		lang: 'es',
		categories: ['business'],
		icons: [
			{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
			{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
	}

	return NextResponse.json(manifest, {
		headers: {
			'Content-Type': 'application/manifest+json; charset=utf-8',
			'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
		},
	})
}
