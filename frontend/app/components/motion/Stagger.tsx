'use client'

import { type CSSProperties, type ReactNode } from 'react'

import * as m from 'motion/react-m'

import {
	staggerContainerVariants,
	staggerItemVariants,
} from '@/lib/motion-spec'

type StaggerProps = {
	children: ReactNode
	className?: string
	style?: CSSProperties
	role?: string
	'aria-label'?: string
	'aria-live'?: 'off' | 'polite' | 'assertive'
}

export function Stagger({
	children,
	className,
	style,
	role,
	'aria-label': ariaLabel,
	'aria-live': ariaLive,
}: StaggerProps) {
	return (
		<m.div
			className={className}
			style={style}
			role={role}
			aria-label={ariaLabel}
			aria-live={ariaLive}
			data-motion="stagger"
			variants={staggerContainerVariants}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			{children}
		</m.div>
	)
}

type StaggerItemProps = {
	children: ReactNode
	className?: string
	style?: CSSProperties
}

export function StaggerItem({ children, className, style }: StaggerItemProps) {
	return (
		<m.div
			className={className}
			style={style}
			variants={staggerItemVariants}
		>
			{children}
		</m.div>
	)
}
