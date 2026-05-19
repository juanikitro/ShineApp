'use client'

import {
	FocusEvent,
	KeyboardEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'

import { Plus, Search } from 'lucide-react'
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
	const fieldId = useId()
	const optionsId = `${fieldId}-options`
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

	function closeWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
		const currentTarget = event.currentTarget
		const nextTarget = event.relatedTarget
		if (
			nextTarget instanceof Node &&
			currentTarget.contains(nextTarget)
		) {
			return
		}
		window.requestAnimationFrame(() => {
			const activeElement = document.activeElement
			if (
				activeElement instanceof Node &&
				currentTarget.contains(activeElement)
			) {
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
		setOpen(true)
	}

	function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			event.stopPropagation()
			closeMenu()
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
			className={cx('combo-field', open && 'combo-field--open', className)}
			data-focus-key={focusKey}
			onBlur={closeWhenFocusLeaves}
		>
			<span className="field-label" id={`${fieldId}-label`}>
				{label}
			</span>
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
						setOpen(true)
					}
				}}
				onKeyDown={handleTriggerKeyDown}
				aria-controls={optionsId}
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-labelledby={`${fieldId}-label`}
			>
				<span>{selected?.label ?? placeholder}</span>
				<Search size={14} />
			</button>
			{open ? (
				<m.div
					id={`${fieldId}-menu`}
					className="combo-menu"
					ref={menuRef}
					aria-labelledby={`${fieldId}-label`}
					variants={comboMenuVariants}
					initial="initial"
					animate="animate"
					onKeyDown={handleMenuKeyDown}
				>
						<input
							autoFocus
							className="combo-search-input"
							placeholder="Buscar..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							aria-controls={optionsId}
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
								visibleOptions.map((option) => (
									<button
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
								<div className="combo-empty">Sin resultados</div>
							)}
						</div>
				</m.div>
			) : null}
		</MotionFlashSurface>
	)
}
