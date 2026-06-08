import { NextResponse } from 'next/server'

type LandingPayload = {
	business?: { name?: string; logo_url?: string | null }
}

type LandingMeta = {
	name: string | null
	logoUrl: string | null
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api').replace(/\/$/, '')

const IMAGE_EXTENSION_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	gif: 'image/gif',
}

function inferImageMime(url: string): string | null {
	const cleaned = url.split('?')[0].split('#')[0]
	const extension = cleaned.split('.').pop()?.toLowerCase() ?? ''
	if (!extension) return null
	return IMAGE_EXTENSION_MIME[extension] ?? null
}

function businessLogoIconType(url: string | null) {
	if (!url) return null
	const mime = inferImageMime(url)
	if (!mime) return null
	return { src: url, type: mime }
}

async function fetchLandingMeta(slug: string): Promise<LandingMeta> {
	try {
		const response = await fetch(`${API_URL}/public/landing/${encodeURIComponent(slug)}/`, {
			next: { revalidate: 300 },
			headers: { Accept: 'application/json' },
		})
		if (!response.ok) return { name: null, logoUrl: null }
		const payload = (await response.json()) as LandingPayload
		const name = payload.business?.name?.trim() ?? ''
		const logoUrl = payload.business?.logo_url?.trim() ?? ''
		return {
			name: name.length > 0 ? name : null,
			logoUrl: logoUrl.length > 0 ? logoUrl : null,
		}
	} catch {
		return { name: null, logoUrl: null }
	}
}

const FALLBACK_ICONS = [
	{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
	{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
	{ src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
	{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
	const { slug } = await context.params
	const meta = await fetchLandingMeta(slug)
	const businessName = meta.name ?? 'Reserva online'
	const shortName = businessName.length > 12 ? `${businessName.slice(0, 11)}…` : businessName
	const businessIcon = businessLogoIconType(meta.logoUrl)

	const icons = businessIcon
		? [
				{ src: businessIcon.src, sizes: 'any', type: businessIcon.type, purpose: 'any' },
				{ src: businessIcon.src, sizes: 'any', type: businessIcon.type, purpose: 'maskable' },
			]
		: FALLBACK_ICONS

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
		icons,
	}

	return NextResponse.json(manifest, {
		headers: {
			'Content-Type': 'application/manifest+json; charset=utf-8',
			'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
		},
	})
}
