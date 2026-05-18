import { PublicLandingClient } from './PublicLandingClient'

type PublicLandingPageProps = {
	params: Promise<{ slug: string }>
}

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
	const { slug } = await params
	return <PublicLandingClient slug={slug} />
}
