import { MouseEvent, ReactNode } from 'react'

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
	function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose()
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
				layout
				variants={modalPanelVariants}
				initial="initial"
				animate="animate"
				exit="exit"
			>
				<div className="modal-head">
					<h2>{title}</h2>
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
