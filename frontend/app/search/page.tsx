'use client'

import {
	Bell,
	Building2,
	CalendarClock,
	CalendarDays,
	Car,
	CreditCard,
	ExternalLink,
	FileText,
	Gauge,
	Hammer,
	Package,
	ReceiptText,
	Search,
	Settings,
	Users,
	Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { StandaloneAppLayout } from '@/app/components/layout/StandaloneAppLayout'
import { apiFetch } from '@/lib/api'

type SearchItem = {
	id: number
	label: string
	sublabel: string
	detail_path: string
}

type SearchGroup = {
	type: string
	label: string
	items: SearchItem[]
}

type SearchResponse = {
	query: string
	groups: SearchGroup[]
}

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
	customer: Users,
	vehicle: Car,
	reservation: CalendarDays,
	work_order: Gauge,
	service: Wrench,
	cash_movement: CreditCard,
	material: Package,
	supplier: Building2,
	tool: Hammer,
	quote: FileText,
	debt: ReceiptText,
	fixed_expense: CalendarClock,
}

function getQuery(): string {
	if (typeof window === 'undefined') return ''
	return new URLSearchParams(window.location.search).get('q') ?? ''
}

export default function SearchPage() {
	const [query, setQuery] = useState(getQuery)
	const [groups, setGroups] = useState<SearchGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [searched, setSearched] = useState(false)

	useEffect(() => {
		const q = getQuery()
		setQuery(q)
		if (q.length < 2) return

		let cancelled = false
		setLoading(true)
		setSearched(false)
		apiFetch<SearchResponse>(`/search/?q=${encodeURIComponent(q)}&limit=10`)
			.then((data) => {
				if (!cancelled) {
					setGroups(data.groups)
					setSearched(true)
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)

	return (
		<StandaloneAppLayout>
			<div className="search-page">
				<header className="search-page-header">
					<div className="search-page-title-row">
						<Search size={20} aria-hidden="true" />
						<h1 className="search-page-title">
							{query ? (
								<>
									Resultados para <em>"{query}"</em>
								</>
							) : (
								'Búsqueda global'
							)}
						</h1>
					</div>
					{searched && !loading ? (
						<p className="search-page-summary">
							{totalItems === 0
								? 'Sin resultados'
								: `${totalItems} resultado${totalItems !== 1 ? 's' : ''} en ${groups.length} categoría${groups.length !== 1 ? 's' : ''}`}
						</p>
					) : null}
				</header>

				{loading ? (
					<div className="search-page-loading" aria-live="polite">
						<span className="global-search-spinner global-search-spinner--lg" aria-hidden="true" />
						<span>Buscando...</span>
					</div>
				) : searched && groups.length === 0 ? (
					<div className="search-page-empty">
						<Search size={40} aria-hidden="true" />
						<p>No encontramos resultados para <strong>"{query}"</strong></p>
						<p className="search-page-empty-hint">
							Intentá con otro término o revisá la ortografía.
						</p>
					</div>
				) : (
					<div className="search-page-groups">
						{groups.map((group) => {
							const Icon = GROUP_ICONS[group.type] ?? Search
							return (
								<section key={group.type} className="search-result-section">
									<header className="search-result-section-header">
										<Icon size={15} aria-hidden="true" />
										<h2 className="search-result-section-title">{group.label}</h2>
									</header>
									<ul className="search-result-list" role="list">
										{group.items.map((item) => (
											<li key={item.id} className="search-result-card">
												<div className="search-result-card-body">
													<span className="search-result-card-label">{item.label}</span>
													{item.sublabel ? (
														<span className="search-result-card-sub">{item.sublabel}</span>
													) : null}
												</div>
												<a
													href={item.detail_path}
													className="search-result-card-action"
													aria-label={`Ver detalle de ${item.label}`}
												>
													<ExternalLink size={14} aria-hidden="true" />
													Ver detalle
												</a>
											</li>
										))}
									</ul>
								</section>
							)
						})}
					</div>
				)}
			</div>
		</StandaloneAppLayout>
	)
}
