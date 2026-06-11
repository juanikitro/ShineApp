'use client'

import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

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

type Props = {
	collapsed?: boolean
}

export function GlobalSearchInput({ collapsed }: Props) {
	const [query, setQuery] = useState('')
	const [groups, setGroups] = useState<SearchGroup[]>([])
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	const fetchResults = useCallback((q: string) => {
		if (q.length < MIN_QUERY_LEN) {
			setGroups([])
			setOpen(false)
			return
		}
		abortRef.current?.abort()
		abortRef.current = new AbortController()
		setLoading(true)
		apiFetch<SearchResponse>(`/search/?q=${encodeURIComponent(q)}&limit=3`, {
			signal: abortRef.current.signal,
		})
			.then((data) => {
				setGroups(data.groups)
				setOpen(data.groups.length > 0)
			})
			.catch(() => {})
			.finally(() => setLoading(false))
	}, [])

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value
		setQuery(val)
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => fetchResults(val), DEBOUNCE_MS)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && query.trim().length >= MIN_QUERY_LEN) {
			setOpen(false)
			window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
		}
		if (e.key === 'Escape') {
			setOpen(false)
			inputRef.current?.blur()
		}
	}

	const handleIconClick = () => {
		if (collapsed) {
			window.location.href = '/search'
			return
		}
		inputRef.current?.focus()
	}

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [])

	useEffect(() => {
		return () => {
			abortRef.current?.abort()
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [])

	if (collapsed) {
		return (
			<button
				type="button"
				className="global-search-icon-btn"
				onClick={handleIconClick}
				title="Buscar"
				aria-label="Abrir búsqueda global"
			>
				<Search size={16} />
			</button>
		)
	}

	return (
		<div ref={containerRef} className="global-search-wrapper">
			<div className="global-search-field">
				<Search size={14} className="global-search-icon" aria-hidden="true" />
				<input
					ref={inputRef}
					type="search"
					className="global-search-input"
					placeholder="Buscar..."
					value={query}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onFocus={() => {
						if (groups.length > 0) setOpen(true)
					}}
					aria-label="Búsqueda global"
					autoComplete="off"
				/>
				{loading ? (
					<span className="global-search-spinner" aria-hidden="true" />
				) : null}
			</div>

			{open && groups.length > 0 ? (
				<div className="global-search-dropdown" role="listbox" aria-label="Resultados de búsqueda">
					{groups.map((group) => (
						<div key={group.type} className="global-search-group">
							<p className="global-search-group-label">{group.label}</p>
							{group.items.map((item) => (
								<a
									key={item.id}
									href={item.detail_path}
									className="global-search-result"
									role="option"
									aria-selected="false"
									onClick={() => setOpen(false)}
								>
									<span className="global-search-result-label">{item.label}</span>
									{item.sublabel ? (
										<span className="global-search-result-sub">{item.sublabel}</span>
									) : null}
								</a>
							))}
						</div>
					))}
					<div className="global-search-footer">
						<a
							href={`/search?q=${encodeURIComponent(query)}`}
							className="global-search-see-all"
							onClick={() => setOpen(false)}
						>
							Ver todos los resultados
						</a>
					</div>
				</div>
			) : null}
		</div>
	)
}
