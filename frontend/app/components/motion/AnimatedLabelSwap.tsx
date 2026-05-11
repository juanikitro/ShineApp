'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { labelSwapVariants } from '@/lib/motion-spec'

type AnimatedLabelSwapProps = {
	label: string
}

export function AnimatedLabelSwap({ label }: AnimatedLabelSwapProps) {
	return (
		<span aria-live="polite" className="button-label-slot">
			<AnimatePresence initial={false} mode="wait">
				<m.span
					key={label}
					className="button-label-swap"
					variants={labelSwapVariants}
					initial="initial"
					animate="animate"
					exit="exit"
				>
					{label}
				</m.span>
			</AnimatePresence>
		</span>
	)
}
