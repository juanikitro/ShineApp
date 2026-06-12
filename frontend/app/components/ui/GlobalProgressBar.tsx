'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

type GlobalProgressBarProps = {
	active: boolean
	label?: string
}

export function GlobalProgressBar({
	active,
	label = 'Guardando cambios',
}: GlobalProgressBarProps) {
	return (
		<AnimatePresence initial={false}>
			{active ? (
				<m.div
					className="global-progress-bar"
					role="status"
					aria-live="polite"
					aria-label={label}
					initial={{ opacity: 0, scaleY: 0.4 }}
					animate={{ opacity: 1, scaleY: 1 }}
					exit={{ opacity: 0, scaleY: 0.4 }}
					transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
				>
					<span className="global-progress-bar-fill" aria-hidden="true" />
				</m.div>
			) : null}
		</AnimatePresence>
	)
}
