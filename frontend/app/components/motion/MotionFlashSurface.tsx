'use client'

import { ReactNode, forwardRef } from 'react'

import { AnimatePresence, type HTMLMotionProps } from 'motion/react'
import * as m from 'motion/react-m'

import { flashOverlayVariants, motionTransitions } from '@/lib/motion-spec'

type MotionFlashSurfaceProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
	children: ReactNode
}

function stripMotionFlashClassName(className?: string) {
	const parts = String(className ?? '')
		.split(/\s+/)
		.map((item) => item.trim())
		.filter(Boolean)
	const active = parts.includes('motion-flash')
	return {
		active,
		className: parts.filter((item) => item !== 'motion-flash').join(' '),
	}
}

const MotionFlashSurface = forwardRef<HTMLDivElement, MotionFlashSurfaceProps>(
	function MotionFlashSurface(
		{ children, className, layout, ...props }: MotionFlashSurfaceProps,
		ref,
	) {
		const flashState = stripMotionFlashClassName(className)

		return (
			<m.div
				{...props}
				ref={ref}
				layout={layout}
				className={flashState.className}
				transition={layout ? motionTransitions.layout : undefined}
			>
				{children}
				<AnimatePresence initial={false}>
					{flashState.active ? (
						<m.div
							key="flash"
							className="motion-flash-overlay"
							variants={flashOverlayVariants}
							initial="initial"
							animate="animate"
							exit="exit"
						/>
					) : null}
				</AnimatePresence>
			</m.div>
		)
	},
)

export { MotionFlashSurface }
