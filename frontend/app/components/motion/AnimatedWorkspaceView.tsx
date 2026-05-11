'use client'

import { ReactNode, useEffect } from 'react'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { workspaceViewVariants } from '@/lib/motion-spec'

type AnimatedWorkspaceViewProps = {
	viewKey: string
	children: ReactNode
}

export function AnimatedWorkspaceView({
	viewKey,
	children,
}: AnimatedWorkspaceViewProps) {
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
	}, [viewKey])

	return (
		<AnimatePresence initial={false} mode="wait">
			<m.div
				key={viewKey}
				className="workspace-view"
				variants={workspaceViewVariants}
				initial="initial"
				animate="animate"
				exit="exit"
			>
				{children}
			</m.div>
		</AnimatePresence>
	)
}

