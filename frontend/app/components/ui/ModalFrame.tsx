'use client'

import {
	ReactNode,
	useRef,
	useState,
} from 'react'

import * as Dialog from '@radix-ui/react-dialog'
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
	const previouslyFocusedRef = useRef<HTMLElement | null>(
		globalThis.document?.activeElement as HTMLElement | null,
	)
	const [dirty, setDirty] = useState(false)
	const [confirmingClose, setConfirmingClose] = useState(false)

	function requestClose() {
		if (dirty) {
			setConfirmingClose(true)
		} else {
			onClose()
		}
	}

	return (
		<Dialog.Root open={true}>
			<Dialog.Portal>
				<Dialog.Overlay asChild forceMount>
					<m.div
						className="modal-backdrop"
						role="presentation"
						variants={modalBackdropVariants}
						initial="initial"
						animate="animate"
						exit="exit"
					>
						<Dialog.Content
							asChild
							aria-describedby={undefined}
							forceMount
							onCloseAutoFocus={() => previouslyFocusedRef.current?.focus()}
							onEscapeKeyDown={(event) => {
								event.preventDefault()
								if (confirmingClose) {
									setConfirmingClose(false)
								} else {
									requestClose()
								}
							}}
							onPointerDownOutside={(event) => {
								event.preventDefault()
								requestClose()
							}}
							onInteractOutside={(event) => event.preventDefault()}
						>
							<m.div
								className="modal-panel"
								layout
								variants={modalPanelVariants}
								initial="initial"
								animate="animate"
								exit="exit"
								onInput={() => setDirty(true)}
							>
								<div className="modal-head">
									<Dialog.Title asChild>
										<h2>{title}</h2>
									</Dialog.Title>
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
						</Dialog.Content>
					</m.div>
				</Dialog.Overlay>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
