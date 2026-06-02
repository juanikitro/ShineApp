'use client'

import {
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
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
	const [dirty, setDirty] = useState(false)
	const [confirmingClose, setConfirmingClose] = useState(false)

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

	useEffect(() => {
		const panel = panelRef.current
		if (!panel) return
		function onInput() {
			setDirty(true)
		}
		panel.addEventListener('input', onInput)
		return () => panel.removeEventListener('input', onInput)
	}, [])

	function requestClose() {
		if (dirty) {
			setConfirmingClose(true)
		} else {
			onClose()
		}
	}

	function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			requestClose()
		}
	}

	function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			event.stopPropagation()
			if (confirmingClose) {
				setConfirmingClose(false)
			} else {
				requestClose()
			}
			return
		}
		if (!confirmingClose) {
			trapFocusWithin(event, panelRef.current)
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
						onClick={requestClose}
					>
						<X size={17} />
					</button>
				</div>
				{children}
				{confirmingClose ? (
					<div
						className="modal-confirm-overlay"
						role="alertdialog"
						aria-label="Confirmar cierre"
					>
						<div className="modal-confirm-box">
							<p className="modal-confirm-message">
								¿Cerrar sin guardar los cambios?
							</p>
							<div className="modal-confirm-actions">
								<button
									type="button"
									className="primary"
									autoFocus
									onClick={() => setConfirmingClose(false)}
								>
									Seguir editando
								</button>
								<button
									type="button"
									className="ghost"
									onClick={onClose}
								>
									Cerrar de todos modos
								</button>
							</div>
						</div>
					</div>
				) : null}
			</m.div>
		</m.div>
	)
}
