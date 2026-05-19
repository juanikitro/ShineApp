'use client'

import {
	type CSSProperties,
	type ElementType,
	type KeyboardEvent,
	type ReactNode,
	useRef,
} from 'react'

import { cx } from '../utils'

type SegmentedIcon = ElementType<{
	'aria-hidden'?: boolean
	size?: number
}>

export type SegmentedOption<T extends string> = {
	value: T
	label: ReactNode
	icon?: SegmentedIcon
	disabled?: boolean
	ariaLabel?: string
}

type SegmentedControlProps<T extends string> = {
	options: ReadonlyArray<SegmentedOption<T>>
	value: T
	onChange: (value: T) => void
	ariaLabel: string
	className?: string
	selectionMode?: 'tabs' | 'segmented'
	iconSize?: number
}

export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	ariaLabel,
	className,
	selectionMode = 'segmented',
	iconSize = 16,
}: SegmentedControlProps<T>) {
	const rootRef = useRef<HTMLDivElement>(null)
	const role = selectionMode === 'tabs' ? 'tablist' : 'group'

	function optionButtons() {
		return Array.from(
			rootRef.current?.querySelectorAll<HTMLButtonElement>(
				'button[data-segmented-option]:not(:disabled)',
			) ?? [],
		)
	}

	function focusButtonAt(index: number) {
		const buttons = optionButtons()
		if (!buttons.length) return
		const nextIndex = (index + buttons.length) % buttons.length
		buttons[nextIndex]?.focus()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const isHorizontal =
			event.key === 'ArrowRight' || event.key === 'ArrowLeft'
		const isVertical = event.key === 'ArrowDown' || event.key === 'ArrowUp'
		const isBoundary = event.key === 'Home' || event.key === 'End'
		if (!isHorizontal && !isVertical && !isBoundary) return

		const buttons = optionButtons()
		if (!buttons.length) return
		const currentIndex = buttons.findIndex(
			(button) => button === event.target,
		)
		if (currentIndex === -1 && !isBoundary) return

		event.preventDefault()
		if (event.key === 'Home') {
			focusButtonAt(0)
			return
		}
		if (event.key === 'End') {
			focusButtonAt(buttons.length - 1)
			return
		}
		const offset =
			event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
		focusButtonAt(currentIndex + offset)
	}

	function handleOptionKeyDown(
		event: KeyboardEvent<HTMLButtonElement>,
		nextValue: T,
	) {
		if (event.key !== 'Enter' && event.key !== ' ') return
		event.preventDefault()
		event.stopPropagation()
		onChange(nextValue)
	}

	return (
		<div
			ref={rootRef}
			className={cx('mode-toggle segmented-control', className)}
			role={role}
			aria-label={ariaLabel}
			onKeyDown={handleKeyDown}
			style={
				{
					'--segmented-count': options.length,
				} as CSSProperties
			}
		>
			{options.map((option) => {
				const selected = option.value === value
				const Icon = option.icon
				return (
					<button
						type="button"
						key={option.value}
						role={selectionMode === 'tabs' ? 'tab' : undefined}
						aria-selected={selectionMode === 'tabs' ? selected : undefined}
						aria-pressed={
							selectionMode === 'segmented' ? selected : undefined
						}
						aria-label={option.ariaLabel}
						className={selected ? 'selected' : ''}
						data-selected={selected ? 'true' : undefined}
						data-segmented-option
						disabled={option.disabled}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => handleOptionKeyDown(event, option.value)}
					>
						{Icon ? <Icon aria-hidden={true} size={iconSize} /> : null}
						{option.label}
					</button>
				)
			})}
		</div>
	)
}
