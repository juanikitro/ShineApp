'use client'

import {
	type CSSProperties,
	FocusEvent,
	KeyboardEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'

import { Plus, Search } from 'lucide-react'
import * as m from 'motion/react-m'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { getFocusableElements } from '@/lib/a11y'
import { comboMenuVariants } from '@/lib/motion-spec'
import { cx } from '../utils'

export type SelectOption = {
	value: string
	label: string
	meta?: string
}

type SearchSelectProps = {
	label: string
	value: string
	options: SelectOption[]
	onChange: (value: string) => void
	name?: string
	placeholder?: string
	disabled?: boolean
	onAdd?: () => void
	addLabel?: string
	onCreate?: (value: string) => void
	createLabel?: string | ((value: string) => string)
	className?: string
	focusKey?: string
}

export function SearchSelect({
	label,
	value,
	options,
	onChange,
	name,
	placeholder = 'Seleccionar',
	disabled = false,
	onAdd,
	addLabel = 'A\u00f1adir',
	onCreate,
	createLabel = (value: string) => `Crear "${value}"`,
	className,
	focusKey,
}: SearchSelectProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [coords, setCoords] = useState<{
		top: number
		left: number
		width: number
	} | null>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const pendingOptionFocusRef = useRef<'first' | 'last' | null>(null)
	const fieldId = useId()
	const optionsId = `${fieldId}-options`
	const placeholderOptionId = `${fieldId}-option-placeholder`
	const selected = options.find((option) => option.value === value)
	const normalizedQuery = query.trim().toLowerCase()
	const visibleOptions = normalizedQuery
		? options.filter((option) =>
				`${option.label} ${option.meta ?? ''}`
					.toLowerCase()
					.includes(normalizedQuery),
			)
		: options
	const createValue = query.trim()
	const canCreate =
		Boolean(onCreate && createValue) &&
		!options.some(
			(option) =>
				option.value.toLowerCase() === createValue.toLowerCase() ||
				option.label.toLowerCase() === createValue.toLowerCase(),
		)
	const resolvedCreateLabel =
		typeof createLabel === 'function'
			? createLabel(createValue)
			: createLabel
	const selectedVisibleIndex = visibleOptions.findIndex(
		(option) => option.value === value,
	)
	const activeOptionId = !value
		? placeholderOptionId
		: selectedVisibleIndex >= 0
			? `${fieldId}-option-${selectedVisibleIndex}`
			: undefined

	function getOptionButtons() {
		return Array.from(
			menuRef.current?.querySelectorAll<HTMLButtonElement>(
				'[data-combo-option]',
			) ?? [],
		)
	}

	function focusOptionAt(index: number) {
		const buttons = getOptionButtons()
		if (!buttons.length) return
		const normalizedIndex = (index + buttons.length) % buttons.length
		const button = buttons[normalizedIndex]
		button.focus()
		button.scrollIntoView({ block: 'nearest' })
	}

	function focusEdgeOption(edge: 'first' | 'last') {
		const buttons = getOptionButtons()
		if (!buttons.length) return
		focusOptionAt(edge === 'first' ? 0 : buttons.length - 1)
	}

	function getPortalContainer() {
		return (
			document.querySelector<HTMLElement>('.app-shell') ?? document.body
		)
	}

	function measurePosition() {
		const trigger = triggerRef.current
		if (!trigger) return
		const rect = trigger.getBoundingClientRect()
		const margin = 8
		const gap = 6
		const menuHeight = menuRef.current?.offsetHeight ?? 0
		const viewportHeight = window.innerHeight
		const viewportWidth = window.innerWidth
		const spaceBelow = viewportHeight - rect.bottom - margin
		const spaceAbove = rect.top - margin
		let top = rect.bottom + gap
		if (menuHeight > spaceBelow && spaceAbove > spaceBelow) {
			top = rect.top - gap - menuHeight
		}
		if (menuHeight) {
			top = Math.min(top, Math.max(margin, viewportHeight - margin - menuHeight))
		}
		top = Math.max(margin, top)
		const width = rect.width
		const left = Math.max(
			margin,
			Math.min(rect.left, viewportWidth - width - margin),
		)
		setCoords({ top, left, width })
	}

	function openMenu() {
		const rect = triggerRef.current?.getBoundingClientRect()
		if (rect) {
			setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width })
		}
		setOpen(true)
	}

	function focusWithinControl(node: EventTarget | null) {
		return (
			node instanceof Node &&
			Boolean(
				triggerRef.current?.contains(node) ||
					menuRef.current?.contains(node),
			)
		)
	}

	function closeMenu() {
		pendingOptionFocusRef.current = null
		setOpen(false)
		setQuery('')
	}

	function chooseValue(nextValue: string) {
		onChange(nextValue)
		closeMenu()
		window.requestAnimationFrame(() => triggerRef.current?.focus())
	}

	function handleOptionKeyDown(
		event: KeyboardEvent<HTMLButtonElement>,
		nextValue: string,
	) {
		if (event.key !== 'Enter' && event.key !== ' ') return
		event.preventDefault()
		event.stopPropagation()
		chooseValue(nextValue)
	}

	useEffect(() => {
		if (!open || !pendingOptionFocusRef.current) return
		const edge = pendingOptionFocusRef.current
		pendingOptionFocusRef.current = null
		window.requestAnimationFrame(() => focusEdgeOption(edge))
	}, [open, visibleOptions.length])

	useLayoutEffect(() => {
		if (!open) return
		measurePosition()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, query, visibleOptions.length, canCreate])

	useEffect(() => {
		if (!open) return
		function reposition() {
			measurePosition()
		}
		function handleDocumentMouseDown(event: MouseEvent) {
			if (focusWithinControl(event.target)) return
			closeMenu()
		}
		window.addEventListener('resize', reposition)
		window.addEventListener('scroll', reposition, true)
		document.addEventListener('mousedown', handleDocumentMouseDown)
		return () => {
			window.removeEventListener('resize', reposition)
			window.removeEventListener('scroll', reposition, true)
			document.removeEventListener('mousedown', handleDocumentMouseDown)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])

	function handleFocusOut(event: FocusEvent<HTMLDivElement>) {
		if (focusWithinControl(event.relatedTarget)) {
			return
		}
		window.requestAnimationFrame(() => {
			if (focusWithinControl(document.activeElement)) {
				return
			}
			closeMenu()
		})
	}

	function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (disabled) {
			return
		}
		if (event.key === 'Escape' && open) {
			event.preventDefault()
			event.stopPropagation()
			closeMenu()
			return
		}
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

		event.preventDefault()
		const edge = event.key === 'ArrowUp' ? 'last' : 'first'
		if (open) {
			focusEdgeOption(edge)
			return
		}

		pendingOptionFocusRef.current = edge
		openMenu()
	}

	function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			event.stopPropagation()
			closeMenu()
			triggerRef.current?.focus()
			return
		}

		if (event.key === 'Tab') {
			const focusables = getFocusableElements(menuRef.current)
			if (!focusables.length) return
			event.preventDefault()
			event.stopPropagation()
			const currentIndex = focusables.findIndex(
				(element) => element === document.activeElement,
			)
			const direction = event.shiftKey ? -1 : 1
			const base =
				currentIndex === -1
					? event.shiftKey
						? focusables.length - 1
						: 0
					: currentIndex + direction
			const nextIndex =
				(base + focusables.length) % focusables.length
			focusables[nextIndex]?.focus()
			return
		}

		const navigatesOptions =
			event.key === 'ArrowDown' || event.key === 'ArrowUp'
		const jumpsToBoundary = event.key === 'Home' || event.key === 'End'
		if (!navigatesOptions && !jumpsToBoundary) return

		const buttons = getOptionButtons()
		if (!buttons.length) return
		const currentIndex = buttons.findIndex(
			(button) => button === event.target,
		)
		if (jumpsToBoundary && currentIndex === -1) return

		event.preventDefault()
		if (event.key === 'Home') {
			focusOptionAt(0)
			return
		}
		if (event.key === 'End') {
			focusOptionAt(buttons.length - 1)
			return
		}
		if (currentIndex === -1) {
			focusOptionAt(event.key === 'ArrowUp' ? buttons.length - 1 : 0)
			return
		}
		focusOptionAt(currentIndex + (event.key === 'ArrowDown' ? 1 : -1))
	}

	return (
		<MotionFlashSurface
			className={cx('combo-field', open && 'combo-field--open', className)}
			data-focus-key={focusKey}
			onBlur={handleFocusOut}
		>
			<span className="field-label" id={`${fieldId}-label`}>
				{label}
			</span>
			{name ? (
				<input type="hidden" name={name} value={value} disabled={disabled} />
			) : null}
			<button
				id={`${fieldId}-trigger`}
				type="button"
				className="combo-trigger"
				disabled={disabled}
				ref={triggerRef}
				onClick={() => {
					if (open) {
						closeMenu()
					} else {
						openMenu()
					}
				}}
				onKeyDown={handleTriggerKeyDown}
				role="combobox"
				aria-controls={optionsId}
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-activedescendant={open ? activeOptionId : undefined}
				aria-labelledby={`${fieldId}-label`}
			>
				<span>{selected?.label ?? placeholder}</span>
				<Search size={14} />
			</button>
			{open && typeof document !== 'undefined'
				? createPortal(
					<m.div
						id={`${fieldId}-menu`}
						className="combo-menu"
						ref={menuRef}
						aria-labelledby={`${fieldId}-label`}
						variants={comboMenuVariants}
						initial="initial"
						animate="animate"
						onKeyDown={handleMenuKeyDown}
						onBlur={handleFocusOut}
						style={
							{
								top: coords?.top ?? 0,
								left: coords?.left ?? 0,
								width: coords?.width || undefined,
							} as CSSProperties
						}
					>
						<input
							className="combo-search-input"
							placeholder="Buscar..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							aria-controls={optionsId}
							aria-activedescendant={activeOptionId}
							aria-label={`Buscar ${label}`}
						/>
						{onAdd ? (
							<button
								type="button"
								className="combo-add"
								onClick={() => {
									closeMenu()
									onAdd()
								}}
							>
								<Plus size={14} />
								{addLabel}
							</button>
						) : null}
						{canCreate ? (
							<button
								type="button"
								className="combo-add"
								onClick={() => {
									closeMenu()
									onCreate?.(createValue)
								}}
							>
								<Plus size={14} />
								{resolvedCreateLabel}
							</button>
						) : null}
						<div
							className="combo-options"
							id={optionsId}
							role="listbox"
							aria-labelledby={`${fieldId}-label`}
						>
							<button
								id={placeholderOptionId}
								type="button"
								data-combo-placeholder
								data-combo-option
								role="option"
								aria-selected={!value}
								className={!value ? 'selected' : ''}
								onClick={() => chooseValue('')}
								onKeyDown={(event) => handleOptionKeyDown(event, '')}
							>
								{placeholder}
							</button>
							{visibleOptions.length ? (
								visibleOptions.map((option, optionIndex) => (
									<button
										id={`${fieldId}-option-${optionIndex}`}
										type="button"
										key={option.value}
										data-combo-option
										role="option"
										aria-selected={option.value === value}
										className={
											option.value === value ? 'selected' : ''
										}
										onClick={() => chooseValue(option.value)}
										onKeyDown={(event) =>
											handleOptionKeyDown(event, option.value)
										}
									>
										<span>{option.label}</span>
										{option.meta ? <small>{option.meta}</small> : null}
									</button>
								))
							) : (
								<div className="combo-empty" role="status" aria-live="polite">
									Sin resultados
								</div>
							)}
						</div>
					</m.div>,
					getPortalContainer(),
				)
				: null}
		</MotionFlashSurface>
	)
}
