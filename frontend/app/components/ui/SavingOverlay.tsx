'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

type SavingOverlayProps = {
	active: boolean
	label?: string
	compact?: boolean
}

export function SavingOverlay({
	active,
	label = 'Guardando…',
	compact = false,
}: SavingOverlayProps) {
	return (
		<AnimatePresence initial={false}>
			{active ? (
				<m.span
					className={`saving-overlay${compact ? ' saving-overlay--compact' : ''}`}
					role="status"
					aria-live="polite"
					aria-label={label}
					initial={{ opacity: 0, y: -2 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -2 }}
					transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
				>
					<span className="button-spinner" aria-hidden="true" />
					{!compact ? (
						<span className="saving-overlay-label">{label}</span>
					) : null}
				</m.span>
			) : null}
		</AnimatePresence>
	)
}
