'use client'

import { Search } from 'lucide-react'
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/lib/api'

const DEBOUNCE_MS = 250
const MIN_QUERY_LEN = 2
const DROPDOWN_WIDTH = 300
const DROPDOWN_GAP = 10
const VIEWPORT_GAP = 8

export type GlobalSearchItem = {
	id: number
	label: string
	sublabel: string
	detail_path: string
}

export type GlobalSearchGroup = {
	type: string
	label: string
	items: GlobalSearchItem[]
}

type SearchResponse = {
	query: string
	groups: GlobalSearchGroup[]
}

type DropdownPosition = {
	left: number
	top: number
	maxHeight: number
}

type Props = {
	collapsed?: boolean
	onSubmitQuery: (query: string) => void
	onOpenResult: (groupType: string, item: GlobalSearchItem) => void
}

export function GlobalSearchInput({
	collapsed,
	onSubmitQuery,
	onOpenResult,
}: Props) {
	const [query, setQuery] = useState('')
	const [groups, setGroups] = useState<GlobalSearchGroup[]>([])
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [position, setPosition] = useState<DropdownPosition | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const requestSeqRef = useRef(0)

	// El dropdown vive en un portal con position fixed: asi queda por encima de
	// todo y se abre hacia la derecha del input sin que el sidebar (overflow
	// hidden + transform en mobile) lo recorte.
	const updatePosition = useCallback(() => {
		const field = containerRef.current
		if (!field) return
		const rect = field.getBoundingClientRect()
		const left = Math.max(
			VIEWPORT_GAP,
			Math.min(rect.right + DROPDOWN_GAP, window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_GAP),
		)
		const top = Math.max(VIEWPORT_GAP, rect.top)
		setPosition({
			left,
			top,
			maxHeight: Math.max(160, window.innerHeight - top - VIEWPORT_GAP),
		})
	}, [])

	// Sin AbortController a proposito: apiFetch deduplica GETs en vuelo por URL
	// y un abort rechaza la promesa compartida para otros callers del mismo
	// path. Las respuestas fuera de orden se descartan por secuencia.
	const fetchResults = useCallback((q: string) => {
		const seq = ++requestSeqRef.current
		if (q.length < MIN_QUERY_LEN) {
			setGroups([])
			setOpen(false)
			return
		}
		setLoading(true)
		apiFetch<SearchResponse>(`/search/?q=${encodeURIComponent(q)}&limit=3`)
			.then((data) => {
				if (requestSeqRef.current !== seq) return
				setGroups(data.groups)
				setOpen(data.groups.length > 0)
			})
			.catch(() => {})
			.finally(() => {
				if (requestSeqRef.current !== seq) return
				setLoading(false)
			})
	}, [])

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value
		setQuery(val)
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => fetchResults(val), DEBOUNCE_MS)
	}

	const submitQuery = (q: string) => {
		setOpen(false)
		onSubmitQuery(q)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && query.trim().length >= MIN_QUERY_LEN) {
			submitQuery(query.trim())
		}
		if (e.key === 'Escape') {
			setOpen(false)
			inputRef.current?.blur()
		}
	}

	const handleIconClick = () => {
		if (collapsed) {
			submitQuery('')
			return
		}
		inputRef.current?.focus()
	}

	useEffect(() => {
		if (!open) return
		updatePosition()
		window.addEventListener('resize', updatePosition)
		window.addEventListener('scroll', updatePosition, true)
		return () => {
			window.removeEventListener('resize', updatePosition)
			window.removeEventListener('scroll', updatePosition, true)
		}
	}, [open, updatePosition])

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const target = e.target as Node
			if (containerRef.current?.contains(target)) return
			if (dropdownRef.current?.contains(target)) return
			setOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [])

	useEffect(() => {
		return () => {
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

	const dropdown =
		open && groups.length > 0 && position && typeof document !== 'undefined'
			? createPortal(
					<div
						ref={dropdownRef}
						className="global-search-dropdown"
						role="listbox"
						aria-label="Resultados de búsqueda"
						style={
							{
								left: position.left,
								top: position.top,
								maxHeight: position.maxHeight,
							} as CSSProperties
						}
					>
						{groups.map((group) => (
							<div key={group.type} className="global-search-group">
								<p className="global-search-group-label">{group.label}</p>
								{group.items.map((item) => (
									<button
										key={item.id}
										type="button"
										className="global-search-result"
										role="option"
										aria-selected="false"
										onClick={() => {
											setOpen(false)
											onOpenResult(group.type, item)
										}}
									>
										<span className="global-search-result-label">{item.label}</span>
										{item.sublabel ? (
											<span className="global-search-result-sub">{item.sublabel}</span>
										) : null}
									</button>
								))}
							</div>
						))}
						<div className="global-search-footer">
							<button
								type="button"
								className="global-search-see-all"
								onClick={() => submitQuery(query.trim())}
							>
								Ver todos los resultados
							</button>
						</div>
					</div>,
					document.body,
				)
			: null

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
			{dropdown}
		</div>
	)
}
