import type { Metadata } from 'next'

import { PublicLandingClient } from './PublicLandingClient'

type PublicLandingPageProps = {
	params: Promise<{ slug: string }>
}

type LandingMetaPayload = {
	business?: { name?: string; logo_url?: string | null }
}

type LandingMeta = {
	name: string | null
	logoUrl: string | null
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api').replace(/\/$/, '')

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'])

function isImageLogoUrl(url: string | null): url is string {
	if (!url) return false
	const cleaned = url.split('?')[0].split('#')[0]
	const extension = cleaned.split('.').pop()?.toLowerCase() ?? ''
	return IMAGE_EXTENSIONS.has(extension)
}

async function fetchLandingMeta(slug: string): Promise<LandingMeta> {
	try {
		const response = await fetch(`${API_URL}/public/landing/${encodeURIComponent(slug)}/`, {
			next: { revalidate: 300 },
			headers: { Accept: 'application/json' },
		})
		if (!response.ok) return { name: null, logoUrl: null }
		const payload = (await response.json()) as LandingMetaPayload
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

export async function generateMetadata({ params }: PublicLandingPageProps): Promise<Metadata> {
	const { slug } = await params
	const meta = await fetchLandingMeta(slug)
	const businessName = meta.name
	const displayName = businessName ?? 'Reserva online'
	const appleTitle = businessName ? businessName.slice(0, 30) : 'Reserva online'
	const businessLogo = isImageLogoUrl(meta.logoUrl) ? meta.logoUrl : null

	const icons: Metadata['icons'] = businessLogo
		? {
				icon: [{ url: businessLogo }],
				apple: [{ url: businessLogo }],
				shortcut: [{ url: businessLogo }],
			}
		: undefined

	return {
		title: `${displayName} · Reservas`,
		description: `Reserva turnos y solicita cotizaciones online de ${displayName}.`,
		manifest: `/publica/${slug}/manifest.webmanifest`,
		applicationName: displayName,
		appleWebApp: {
			capable: true,
			title: appleTitle,
			statusBarStyle: 'default',
		},
		...(icons ? { icons } : {}),
	}
}

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
	const { slug } = await params
	return <PublicLandingClient slug={slug} />
}
