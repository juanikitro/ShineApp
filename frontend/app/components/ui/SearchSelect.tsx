'use client'

import {
	FocusEvent,
	KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from 'react'

import { Plus, Search } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
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
	const triggerRef = useRef<HTMLButtonElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const pendingOptionFocusRef = useRef<'first' | 'last' | null>(null)
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

	useEffect(() => {
		if (!open || !pendingOptionFocusRef.current) return
		const edge = pendingOptionFocusRef.current
		pendingOptionFocusRef.current = null
		window.requestAnimationFrame(() => focusEdgeOption(edge))
	}, [open, visibleOptions.length])

	function closeWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
		const nextTarget = event.relatedTarget
		if (
			nextTarget instanceof Node &&
			event.currentTarget.contains(nextTarget)
		) {
			return
		}
		setOpen(false)
	}

	function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (
			disabled ||
			(event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
		) {
			return
		}

		event.preventDefault()
		const edge = event.key === 'ArrowUp' ? 'last' : 'first'
		if (open) {
			focusEdgeOption(edge)
			return
		}

		pendingOptionFocusRef.current = edge
		setOpen(true)
	}

	function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			setOpen(false)
			triggerRef.current?.focus()
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
			className={cx('combo-field', className)}
			data-focus-key={focusKey}
			onBlur={closeWhenFocusLeaves}
		>
			<span className="field-label">{label}</span>
			<button
				type="button"
				className="combo-trigger"
				disabled={disabled}
				ref={triggerRef}
				onClick={() => setOpen((current) => !current)}
				onKeyDown={handleTriggerKeyDown}
			>
				<span>{selected?.label ?? placeholder}</span>
				<Search size={14} />
			</button>
			<AnimatePresence initial={false}>
				{open ? (
					<m.div
						className="combo-menu"
						ref={menuRef}
						variants={comboMenuVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						onKeyDown={handleMenuKeyDown}
					>
						<input
							autoFocus
							placeholder="Buscar..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
						{onAdd ? (
							<button
								type="button"
								className="combo-add"
								onClick={() => {
									setOpen(false)
									setQuery('')
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
									setOpen(false)
									setQuery('')
									onCreate?.(createValue)
								}}
							>
								<Plus size={14} />
								{resolvedCreateLabel}
							</button>
						) : null}
						<div className="combo-options">
							<button
								type="button"
								data-combo-option
								className={!value ? 'selected' : ''}
								onClick={() => {
									onChange('')
									setQuery('')
									setOpen(false)
								}}
							>
								{placeholder}
							</button>
							{visibleOptions.length ? (
								visibleOptions.map((option) => (
									<button
										type="button"
										key={option.value}
										data-combo-option
										className={
											option.value === value ? 'selected' : ''
										}
										onClick={() => {
											onChange(option.value)
											setQuery('')
											setOpen(false)
										}}
									>
										<span>{option.label}</span>
										{option.meta ? <small>{option.meta}</small> : null}
									</button>
								))
							) : (
								<div className="combo-empty">Sin resultados</div>
							)}
						</div>
					</m.div>
				) : null}
			</AnimatePresence>
		</MotionFlashSurface>
	)
}
