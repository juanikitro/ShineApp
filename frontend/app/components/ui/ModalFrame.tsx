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
import {
	focusElementIfAvailable,
	focusFirstElement,
	trapFocusWithin,
} from '@/lib/a11y'

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
			focusFirstElement(panelRef.current)
		})
		return () => {
			window.cancelAnimationFrame(frame)
			if (previouslyFocused instanceof HTMLElement) {
				focusElementIfAvailable(previouslyFocused)
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
			event.stopPropagation()
			onClose()
			return
		}
		trapFocusWithin(event, panelRef.current)
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
