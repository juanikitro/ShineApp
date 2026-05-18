'use client'

import {
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	useEffect,
	useId,
	useRef,
} from 'react'

import { X } from 'lucide-react'
import * as m from 'motion/react-m'

import {
	modalBackdropVariants,
	modalPanelVariants,
} from '@/lib/motion-spec'

type ModalFrameProps = {
	title: string
	onClose: () => void
	children: ReactNode
	motionPhase?: 'enter' | 'exit'
}

export function ModalFrame({
	title,
	onClose,
	children,
}: ModalFrameProps) {
	const panelRef = useRef<HTMLDivElement>(null)
	const titleId = useId()

	useEffect(() => {
		const previouslyFocused = document.activeElement
		const frame = window.requestAnimationFrame(() => {
			const firstFocusable = getFocusableElements(panelRef.current)[0]
			;(firstFocusable ?? panelRef.current)?.focus()
		})
		return () => {
			window.cancelAnimationFrame(frame)
			if (
				previouslyFocused instanceof HTMLElement &&
				document.contains(previouslyFocused)
			) {
				previouslyFocused.focus()
			}
		}
	}, [])

	function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose()
		}
	}

	function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			onClose()
			return
		}
		if (event.key !== 'Tab') return

		const focusable = getFocusableElements(panelRef.current)
		if (!focusable.length) {
			event.preventDefault()
			panelRef.current?.focus()
			return
		}

		const first = focusable[0]
		const last = focusable[focusable.length - 1]
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault()
			last.focus()
			return
		}
		if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault()
			first.focus()
		}
	}

	return (
		<m.div
			className="modal-backdrop"
			role="presentation"
			onMouseDown={handleBackdropMouseDown}
			variants={modalBackdropVariants}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			<m.div
				className="modal-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				ref={panelRef}
				tabIndex={-1}
				onKeyDown={handlePanelKeyDown}
				layout
				variants={modalPanelVariants}
				initial="initial"
				animate="animate"
				exit="exit"
		>
				<div className="modal-head">
					<h2 id={titleId}>{title}</h2>
					<button
						type="button"
						className="ghost icon-button"
						aria-label="Cerrar"
						onClick={onClose}
					>
						<X size={17} />
					</button>
				</div>
				{children}
			</m.div>
		</m.div>
	)
}

function getFocusableElements(root: HTMLElement | null) {
	if (!root) return []
	return Array.from(
		root.querySelectorAll<HTMLElement>(
			[
				'a[href]',
				'button:not(:disabled)',
				'input:not(:disabled)',
				'select:not(:disabled)',
				'textarea:not(:disabled)',
				'[tabindex]:not([tabindex="-1"])',
			].join(','),
		),
	).filter(
		(element) =>
			!element.hasAttribute('disabled') &&
			element.getAttribute('aria-hidden') !== 'true' &&
			element.offsetParent !== null,
	)
}
