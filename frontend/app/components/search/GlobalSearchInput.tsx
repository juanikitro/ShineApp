'use client'

import { Search } from 'lucide-react'
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/lib/api'
import { cx } from '../utils'

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
	const [activeIndex, setActiveIndex] = useState(-1)
	const containerRef = useRef<HTMLDivElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const requestSeqRef = useRef(0)
	const listboxId = useId()
	const optionId = (index: number) => `${listboxId}-opt-${index}`

	// Lista plana de opciones (en orden de render) para navegar con flechas y
	// resolver la opción activa via aria-activedescendant sin mover el foco real.
	const flatOptions = useMemo(
		() =>
			groups.flatMap((group) =>
				group.items.map((item) => ({ groupType: group.type, item })),
			),
		[groups],
	)
	const groupOffsets = useMemo(() => {
		const offsets: number[] = []
		let running = 0
		for (const group of groups) {
			offsets.push(running)
			running += group.items.length
		}
		return offsets
	}, [groups])
	const totalOptions = flatOptions.length

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

	// Cada vez que cambian los resultados, la opción activa vuelve a "ninguna":
	// asi Enter envía la búsqueda completa hasta que el usuario navega con flechas.
	useEffect(() => {
		setActiveIndex(-1)
	}, [groups])

	// Mantener la opción activa visible al navegar con teclado.
	useEffect(() => {
		if (!open || activeIndex < 0) return
		dropdownRef.current
			?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
			?.scrollIntoView({ block: 'nearest' })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeIndex, open])

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

	const chooseOption = (index: number) => {
		const option = flatOptions[index]
		if (!option) return
		setOpen(false)
		onOpenResult(option.groupType, option.item)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			if (!open && groups.length > 0) {
				setOpen(true)
				setActiveIndex(0)
				return
			}
			if (!totalOptions) return
			setActiveIndex((i) => (i + 1) % totalOptions)
			return
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault()
			if (!open || !totalOptions) return
			setActiveIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1))
			return
		}
		if (e.key === 'Home' && open && totalOptions) {
			e.preventDefault()
			setActiveIndex(0)
			return
		}
		if (e.key === 'End' && open && totalOptions) {
			e.preventDefault()
			setActiveIndex(totalOptions - 1)
			return
		}
		if (e.key === 'Enter') {
			if (open && activeIndex >= 0 && activeIndex < totalOptions) {
				e.preventDefault()
				chooseOption(activeIndex)
				return
			}
			if (query.trim().length >= MIN_QUERY_LEN) {
				submitQuery(query.trim())
			}
			return
		}
		if (e.key === 'Escape') {
			if (open) {
				e.preventDefault()
				setOpen(false)
				setActiveIndex(-1)
			}
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
						id={listboxId}
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
						{groups.map((group, groupIndex) => (
							<div key={group.type} className="global-search-group">
								<p className="global-search-group-label">{group.label}</p>
								{group.items.map((item, itemIndex) => {
									const index = groupOffsets[groupIndex] + itemIndex
									return (
										<button
											key={`${group.type}-${item.id}`}
											id={optionId(index)}
											type="button"
											className={cx(
												'global-search-result',
												index === activeIndex && 'global-search-result--active',
											)}
											role="option"
											aria-selected={index === activeIndex}
											tabIndex={-1}
											onMouseMove={() => setActiveIndex(index)}
											onClick={() => chooseOption(index)}
										>
											<span className="global-search-result-label">{item.label}</span>
											{item.sublabel ? (
												<span className="global-search-result-sub">{item.sublabel}</span>
											) : null}
										</button>
									)
								})}
							</div>
						))}
						<div className="global-search-footer">
							<button
								type="button"
								className="global-search-see-all"
								tabIndex={-1}
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
					role="combobox"
					aria-expanded={open}
					aria-controls={open ? listboxId : undefined}
					aria-activedescendant={
						open && activeIndex >= 0 ? optionId(activeIndex) : undefined
					}
					aria-autocomplete="list"
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
