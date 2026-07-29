'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

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

export type QuickActionsMenuState = {
	title: string
	actions: QuickAction[]
	anchorPoint: { x: number; y: number }
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

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		value !== null &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (value as PromiseLike<unknown>).then === 'function'
	)
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
	const mountedRef = useRef(true)
	const visibleActions = useMemo(
		() => actions.filter((action) => !action.hidden),
		[actions],
	)
	const hasRunningAction =
		localRunningId !== null ||
		(pendingActionId !== null && pendingActionId !== undefined)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	useEffect(() => {
		if (!open) return
		setConfirmingId(null)
		setLocalRunningId(null)
	}, [open, visibleActions])

	if (
		!open ||
		!anchorPoint ||
		!visibleActions.length ||
		typeof document === 'undefined'
	) {
		return null
	}

	function runningIdFor(action: QuickAction) {
		return localRunningId === action.id || pendingActionId === action.id
	}

	async function selectAction(action: QuickAction, event: Event) {
		if (action.disabled || runningIdFor(action) || localRunningId) {
			event.preventDefault()
			return
		}
		if (action.requiresConfirm && confirmingId !== action.id) {
			event.preventDefault()
			setConfirmingId(action.id)
			return
		}

		let result: unknown
		try {
			result = action.onSelect()
		} catch (error) {
			event.preventDefault()
			onClose()
			throw error
		}

		if (!isThenable(result)) return

		event.preventDefault()
		setLocalRunningId(action.id)
		try {
			await result
		} catch {
			// El error ya quedó en manos del onSelect; aca solo liberamos el lock.
		} finally {
			if (mountedRef.current) setLocalRunningId(null)
		}
		onClose()
	}

	return (
		<DropdownMenu.Root
			modal={false}
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !hasRunningAction) onClose()
			}}
		>
			<DropdownMenu.Trigger
				aria-hidden="true"
				tabIndex={-1}
				style={{
					border: 0,
					height: 0,
					left: anchorPoint.x,
					minHeight: 0,
					minWidth: 0,
					padding: 0,
					pointerEvents: 'none',
					position: 'fixed',
					top: anchorPoint.y,
					width: 0,
				}}
			/>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					ref={menuRef}
					align="start"
					aria-label={title}
					aria-labelledby={undefined}
					className={cx('quick-actions-menu', className)}
					collisionPadding={8}
					loop
					onCloseAutoFocus={(event) => {
						event.preventDefault()
						returnFocusRef?.current?.focus()
					}}
					onEscapeKeyDown={(event) => {
						if (hasRunningAction) event.preventDefault()
					}}
					onInteractOutside={(event) => {
						if (hasRunningAction) event.preventDefault()
					}}
					onKeyDown={(event) => {
						if (event.key !== 'Tab') return
						event.preventDefault()
						if (!hasRunningAction) onClose()
					}}
					onPointerDownOutside={(event) => {
						if (hasRunningAction) event.preventDefault()
					}}
					side="bottom"
					sideOffset={0}
				>
					{title ? (
						<DropdownMenu.Label className="quick-actions-menu-title">
							{title}
						</DropdownMenu.Label>
					) : null}
					{visibleActions.map((action) => {
						const confirming = confirmingId === action.id
						const running = runningIdFor(action)
						const disabled = action.disabled || running
						const label = confirming
							? `Confirmar ${action.label}`
							: action.label
						return (
							<DropdownMenu.Item
								key={action.id}
								asChild
								disabled={disabled}
								onSelect={(event) => {
									void selectAction(action, event)
								}}
							>
								<button
									type="button"
									role="menuitem"
									disabled={disabled}
									aria-busy={running || undefined}
									className={cx(
										'quick-actions-menu-item',
										action.tone === 'primary' && 'primary',
										action.tone === 'danger' && 'danger',
										confirming && 'confirming',
										running && 'is-loading',
									)}
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
							</DropdownMenu.Item>
						)
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}
