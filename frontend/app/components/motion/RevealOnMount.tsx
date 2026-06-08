'use client'

import { type CSSProperties, type ReactNode } from 'react'

import * as m from 'motion/react-m'

import { revealOnMountVariants } from '@/lib/motion-spec'

type RevealOnMountProps = {
	children: ReactNode
	className?: string
	style?: CSSProperties
	delay?: number
}

export function RevealOnMount({
	children,
	className,
	style,
	delay = 0,
}: RevealOnMountProps) {
	return (
		<m.div
			className={className}
			style={style}
			variants={revealOnMountVariants}
			initial="initial"
			animate="animate"
			transition={delay ? { delay } : undefined}
		>
			{children}
		</m.div>
	)
}
