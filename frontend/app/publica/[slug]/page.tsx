import type { Metadata } from 'next'

import { PublicLandingClient } from './PublicLandingClient'

type PublicLandingPageProps = {
	params: Promise<{ slug: string }>
}

type LandingMetaPayload = {
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
		const payload = (await response.json()) as LandingMetaPayload
		const name = payload.business?.name?.trim()
		return name && name.length > 0 ? name : null
	} catch {
		return null
	}
}

export async function generateMetadata({ params }: PublicLandingPageProps): Promise<Metadata> {
	const { slug } = await params
	const businessName = await fetchBusinessName(slug)
	const displayName = businessName ?? 'Reserva online'
	const appleTitle = businessName ? businessName.slice(0, 30) : 'Reserva online'

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
	}
}

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
	const { slug } = await params
	return <PublicLandingClient slug={slug} />
}
