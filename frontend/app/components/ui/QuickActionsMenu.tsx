'use client'

import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'

import { cx } from '../utils'

export type QuickAction = {
	id: string
	label: string
	onSelect: () => unknown
	description?: ReactNode
	disabled?: boolean
	hidden?: boolean
	icon?: ReactNode
	requiresConfirm?: boolean
	tone?: 'default' | 'primary' | 'danger'
}

type QuickActionsMenuProps = {
	actions: ReadonlyArray<QuickAction>
	anchorPoint: { x: number; y: number } | null
	open: boolean
	title: string
	onClose: () => void
	className?: string
	returnFocusRef?: RefObject<HTMLElement | null>
	pendingActionId?: string | null
}

export function QuickActionsMenu({
	actions,
	anchorPoint,
	open,
	title,
	onClose,
	className,
	returnFocusRef,
	pendingActionId,
}: QuickActionsMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null)
	const [confirmingId, setConfirmingId] = useState<string | null>(null)
	const [localRunningId, setLocalRunningId] = useState<string | null>(null)
	const [position, setPosition] = useState(anchorPoint)
	const mountedRef = useRef(true)
	const visibleActions = useMemo(
		() => actions.filter((action) => !action.hidden),
		[actions],
	)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	function closeMenu() {
		onClose()
		returnFocusRef?.current?.focus()
	}

	useEffect(() => {
		if (!open) return
		setConfirmingId(null)
		setLocalRunningId(null)
		firstEnabledItem()?.focus()
	}, [open, visibleActions])

	useLayoutEffect(() => {
		if (!open || !anchorPoint || !menuRef.current) return
		const viewportGap = 8
		const rect = menuRef.current.getBoundingClientRect()
		setPosition({
			x: Math.max(
				viewportGap,
				Math.min(anchorPoint.x, window.innerWidth - rect.width - viewportGap),
			),
			y: Math.max(
				viewportGap,
				Math.min(anchorPoint.y, window.innerHeight - rect.height - viewportGap),
			),
		})
	}, [open, anchorPoint, visibleActions, confirmingId])

	useEffect(() => {
		if (!open) return

		function handleDocumentMouseDown(event: MouseEvent) {
			if (localRunningId) return
			const target = event.target
			if (
				target instanceof Node &&
				menuRef.current &&
				!menuRef.current.contains(target)
			) {
				closeMenu()
			}
		}

		document.addEventListener('mousedown', handleDocumentMouseDown)
		return () =>
			document.removeEventListener('mousedown', handleDocumentMouseDown)
	}, [open, onClose, returnFocusRef, localRunningId])

	if (
		!open ||
		!anchorPoint ||
		!visibleActions.length ||
		typeof document === 'undefined'
	) {
		return null
	}
	const portalContainer = document.body

	function enabledItems() {
		return Array.from(
			menuRef.current?.querySelectorAll<HTMLButtonElement>(
				'button[role="menuitem"]:not(:disabled)',
			) ?? [],
		)
	}

	function firstEnabledItem() {
		return enabledItems()[0] ?? null
	}

	function focusItemAt(index: number) {
		const items = enabledItems()
		if (!items.length) return
		const nextIndex = (index + items.length) % items.length
		items[nextIndex]?.focus()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			if (localRunningId) return
			event.preventDefault()
			closeMenu()
			return
		}

		// Tab cierra el menú (patrón APG) y devuelve el foco al disparador.
		if (event.key === 'Tab') {
			if (localRunningId) return
			event.preventDefault()
			closeMenu()
			return
		}

		if (
			event.key !== 'ArrowDown' &&
			event.key !== 'ArrowUp' &&
			event.key !== 'Home' &&
			event.key !== 'End'
		) {
			return
		}

		const items = enabledItems()
		if (!items.length) return

		event.preventDefault()
		if (event.key === 'Home') {
			focusItemAt(0)
			return
		}
		if (event.key === 'End') {
			focusItemAt(items.length - 1)
			return
		}

		const currentIndex = items.findIndex((item) => item === event.target)
		const offset = event.key === 'ArrowUp' ? -1 : 1
		focusItemAt(currentIndex + offset)
	}

	function runningIdFor(action: QuickAction) {
		if (localRunningId === action.id) return true
		if (pendingActionId && pendingActionId === action.id) return true
		return false
	}

	async function selectAction(action: QuickAction) {
		if (action.disabled || runningIdFor(action) || localRunningId) return
		if (action.requiresConfirm && confirmingId !== action.id) {
			setConfirmingId(action.id)
			return
		}
		let result: unknown
		try {
			result = action.onSelect()
		} catch (err) {
			closeMenu()
			throw err
		}
		if (
			result &&
			typeof result === 'object' &&
			typeof (result as { then?: unknown }).then === 'function'
		) {
			setLocalRunningId(action.id)
			try {
				await (result as Promise<unknown>)
			} catch {
				// El error ya quedó en manos del onSelect; aca solo liberamos el lock.
			} finally {
				if (mountedRef.current) setLocalRunningId(null)
			}
		}
		closeMenu()
	}

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			aria-label={title}
			className={cx('quick-actions-menu', className)}
			onKeyDown={handleKeyDown}
			style={
				{
					left: position?.x ?? anchorPoint.x,
					top: position?.y ?? anchorPoint.y,
				} as CSSProperties
			}
		>
			{title ? <div className="quick-actions-menu-title">{title}</div> : null}
			{visibleActions.map((action) => {
				const confirming = confirmingId === action.id
				const running = runningIdFor(action)
				const label = confirming
					? `Confirmar ${action.label}`
					: action.label
				return (
					<button
						key={action.id}
						type="button"
						role="menuitem"
						disabled={action.disabled || running}
						aria-busy={running || undefined}
						className={cx(
							'quick-actions-menu-item',
							action.tone === 'primary' && 'primary',
							action.tone === 'danger' && 'danger',
							confirming && 'confirming',
							running && 'is-loading',
						)}
						onClick={() => {
							void selectAction(action)
						}}
					>
						{running ? (
							<span
								className="quick-actions-menu-icon button-spinner"
								aria-hidden="true"
							/>
						) : action.icon ? (
							<span className="quick-actions-menu-icon" aria-hidden="true">
								{action.icon}
							</span>
						) : null}
						<span className="quick-actions-menu-copy">
							<span>{label}</span>
							{action.description ? <small>{action.description}</small> : null}
						</span>
					</button>
				)
			})}
		</div>,
		portalContainer,
	)
}
