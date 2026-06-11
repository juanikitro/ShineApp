'use client'

import {
	Building2,
	CalendarClock,
	CalendarDays,
	Car,
	ChevronDown,
	CreditCard,
	FileText,
	Gauge,
	Hammer,
	Package,
	ReceiptText,
	Search,
	SquarePen,
	Users,
	Wrench,
} from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '../utils'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import type {
	GlobalSearchGroup,
	GlobalSearchItem,
} from '@/app/components/search/GlobalSearchInput'
import { apiFetch } from '@/lib/api'

const MIN_QUERY_LEN = 2
const RESULTS_PER_GROUP = 10

type SearchResponse = {
	query: string
	groups: GlobalSearchGroup[]
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

type Props = {
	query: string
	onSubmitQuery: (query: string) => void
	onOpenResult: (groupType: string, item: GlobalSearchItem) => void
}

export function SearchResultsPanel({ query, onSubmitQuery, onOpenResult }: Props) {
	const [input, setInput] = useState(query)
	const [groups, setGroups] = useState<GlobalSearchGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(false)
	const [searched, setSearched] = useState(false)
	const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
		() => new Set(),
	)
	const requestSeqRef = useRef(0)

	// Sin AbortController a proposito: apiFetch deduplica GETs en vuelo por URL,
	// asi que abortar una llamada rechaza la promesa compartida para cualquier
	// otro caller del mismo path (con StrictMode eso dejaba la busqueda inicial
	// cancelada para siempre). Las respuestas viejas se descartan por secuencia.
	const runSearch = useCallback((q: string) => {
		const seq = ++requestSeqRef.current
		if (q.length < MIN_QUERY_LEN) {
			setGroups([])
			setSearched(false)
			setError(false)
			return
		}
		setLoading(true)
		setError(false)
		apiFetch<SearchResponse>(
			`/search/?q=${encodeURIComponent(q)}&limit=${RESULTS_PER_GROUP}`,
		)
			.then((data) => {
				if (requestSeqRef.current !== seq) return
				setGroups(data.groups)
				setSearched(true)
				setCollapsedGroups(new Set())
			})
			.catch(() => {
				if (requestSeqRef.current !== seq) return
				setError(true)
			})
			.finally(() => {
				if (requestSeqRef.current !== seq) return
				setLoading(false)
			})
	}, [])

	useEffect(() => {
		setInput(query)
		runSearch(query)
	}, [query, runSearch])

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault()
		const next = input.trim()
		if (next.length < MIN_QUERY_LEN) return
		if (next === query) {
			runSearch(next)
		} else {
			onSubmitQuery(next)
		}
	}

	const toggleGroup = (type: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev)
			if (next.has(type)) {
				next.delete(type)
			} else {
				next.add(type)
			}
			return next
		})
	}

	const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0)
	const summary =
		totalItems === 0
			? 'Sin resultados'
			: `${totalItems} resultado${totalItems !== 1 ? 's' : ''} en ${groups.length} categoría${groups.length !== 1 ? 's' : ''}`

	return (
		<div className="grid">
			<section className="panel search-results-panel" aria-label="Resultados de búsqueda">
				<form
					className="search-results-toolbar"
					role="search"
					onSubmit={handleSubmit}
				>
					<div className="global-search-field search-results-field">
						<Search size={15} className="global-search-icon" aria-hidden="true" />
						<input
							type="search"
							className="global-search-input"
							placeholder="Buscar en todos los módulos..."
							value={input}
							onChange={(event) => setInput(event.target.value)}
							aria-label="Buscar en todos los módulos"
							autoComplete="off"
						/>
					</div>
					<button type="submit" className="primary">
						<Search size={16} />
						Buscar
					</button>
				</form>

				{query.length >= MIN_QUERY_LEN ? (
					<p className="search-results-summary" aria-live="polite">
						{loading ? (
							'Buscando...'
						) : (
							<>
								{searched ? `${summary} para ` : 'Resultados para '}
								<strong className="search-results-query">"{query}"</strong>
							</>
						)}
					</p>
				) : null}

				{loading ? (
					<LoadingState text="Buscando..." />
				) : error ? (
					<ErrorState
						text="No se pudo completar la búsqueda"
						hint="Reintentá nuevamente o revisá la conexión con el servidor."
						action={
							<button type="button" className="ghost" onClick={() => runSearch(query)}>
								Reintentar
							</button>
						}
					/>
				) : query.length < MIN_QUERY_LEN ? (
					<Empty
						text="Buscá en todos los módulos"
						hint="Escribí al menos 2 caracteres: clientes, vehículos, reservas, servicios, caja y más."
					/>
				) : searched && groups.length === 0 ? (
					<Empty
						text={`No encontramos resultados para "${query}"`}
						hint="Intentá con otro término o revisá la ortografía."
					/>
				) : (
					<div className="search-results-groups">
						{groups.map((group) => {
							const Icon = GROUP_ICONS[group.type] ?? Search
							const expanded = !collapsedGroups.has(group.type)
							return (
								<section key={group.type} className="search-results-group">
									<button
										type="button"
										className="search-results-group-header"
										aria-expanded={expanded}
										onClick={() => toggleGroup(group.type)}
									>
										<Icon size={15} aria-hidden="true" />
										<h3 className="search-results-group-title">{group.label}</h3>
										<span className="search-results-group-count">
											{group.items.length}
										</span>
										<ChevronDown
											size={16}
											aria-hidden="true"
											className={cx(
												'search-results-chevron',
												expanded && 'search-results-chevron--open',
											)}
										/>
									</button>
									{expanded ? (
										<ul className="search-results-list" role="list">
											{group.items.map((item) => (
												<li key={item.id}>
													<button
														type="button"
														className="search-results-item"
														onClick={() => onOpenResult(group.type, item)}
													>
														<span className="search-results-item-copy">
															<span className="search-results-item-label">
																{item.label}
															</span>
															{item.sublabel ? (
																<span className="search-results-item-sub">
																	{item.sublabel}
																</span>
															) : null}
														</span>
														<span
															className="search-results-item-action"
															aria-hidden="true"
														>
															<SquarePen size={14} />
															Abrir
														</span>
													</button>
												</li>
											))}
										</ul>
									) : null}
								</section>
							)
						})}
					</div>
				)}
			</section>
		</div>
	)
}
