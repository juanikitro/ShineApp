'use client'

import { ReactNode } from 'react'

import { AnimatePresence } from 'motion/react'

import { ModalFrame } from '@/app/components/ui/ModalFrame'

type MotionModalProps = {
	open: boolean
	title: string
	onClose: () => void
	children: ReactNode
}

export function MotionModal({
	open,
	title,
	onClose,
	children,
}: MotionModalProps) {
	return (
		<AnimatePresence initial={false}>
			{open ? (
				<ModalFrame title={title} onClose={onClose}>
					{children}
				</ModalFrame>
			) : null}
		</AnimatePresence>
	)
}

