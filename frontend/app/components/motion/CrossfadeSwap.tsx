'use client'

import { type CSSProperties, type ReactNode } from 'react'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import {
	crossfadeContentVariants,
	crossfadeSkeletonVariants,
} from '@/lib/motion-spec'

type CrossfadeSwapProps = {
	loading: boolean
	skeleton: ReactNode
	children: ReactNode
	className?: string
	style?: CSSProperties
	skeletonKey?: string
	contentKey?: string
}

export function CrossfadeSwap({
	loading,
	skeleton,
	children,
	className,
	style,
	skeletonKey = 'skeleton',
	contentKey = 'content',
}: CrossfadeSwapProps) {
	return (
		<div className={className} style={style}>
			<AnimatePresence initial={false} mode="wait">
				{loading ? (
					<m.div
						key={skeletonKey}
						variants={crossfadeSkeletonVariants}
						initial="initial"
						animate="animate"
						exit="exit"
					>
						{skeleton}
					</m.div>
				) : (
					<m.div
						key={contentKey}
						variants={crossfadeContentVariants}
						initial="initial"
						animate="animate"
						exit="exit"
					>
						{children}
					</m.div>
				)}
			</AnimatePresence>
		</div>
	)
}
