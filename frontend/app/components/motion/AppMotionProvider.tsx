'use client'

import { ReactNode } from 'react'

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'

type AppMotionProviderProps = {
	children: ReactNode
}

export function AppMotionProvider({ children }: AppMotionProviderProps) {
	return (
		<MotionConfig reducedMotion="user">
			<LazyMotion features={domAnimation}>{children}</LazyMotion>
		</MotionConfig>
	)
}

