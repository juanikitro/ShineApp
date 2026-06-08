import type { Transition, Variants } from 'motion/react'

export type SlideDirection = 'forward' | 'backward'

export type AgendaSlideMotion = {
	direction: SlideDirection
	distancePercent: number
	offsetDays: number
	scope: 'day' | 'range'
}

const standardEase = [0.22, 1, 0.36, 1] as const
const emphasisEase = [0.16, 1, 0.3, 1] as const
const agendaEase = [0.4, 0, 0.2, 1] as const

export const motionTokens = {
	duration: {
		fast: 0.16,
		base: 0.22,
		view: 0.28,
		slow: 0.38,
		pulse: 0.88,
	},
	ease: {
		standard: standardEase,
		emphasis: emphasisEase,
		agenda: agendaEase,
	},
	distance: {
		xs: 4,
		sm: 8,
		md: 14,
		lg: 22,
	},
} as const

export const motionTransitions = {
	fast: {
		duration: motionTokens.duration.fast,
		ease: motionTokens.ease.standard,
	} satisfies Transition,
	base: {
		duration: motionTokens.duration.base,
		ease: motionTokens.ease.standard,
	} satisfies Transition,
	view: {
		duration: motionTokens.duration.view,
		ease: motionTokens.ease.emphasis,
	} satisfies Transition,
	layout: {
		type: 'spring',
		stiffness: 360,
		damping: 34,
		mass: 0.9,
	} satisfies Transition,
	agenda: {
		duration: motionTokens.duration.slow,
		ease: motionTokens.ease.agenda,
	} satisfies Transition,
} as const

export const workspaceViewVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.md,
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: motionTransitions.view,
	},
	exit: {
		opacity: 0,
		y: -motionTokens.distance.sm,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const modalBackdropVariants = {
	initial: { opacity: 0 },
	animate: {
		opacity: 1,
		transition: motionTransitions.base,
	},
	exit: {
		opacity: 0,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const modalPanelVariants = {
	initial: {
		opacity: 0,
		scale: 0.985,
		y: motionTokens.distance.md,
	},
	animate: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: motionTransitions.view,
	},
	exit: {
		opacity: 0,
		scale: 0.992,
		y: motionTokens.distance.sm,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const toastVariants = {
	initial: {
		opacity: 0,
		y: -motionTokens.distance.lg,
		scale: 0.96,
	},
	animate: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: motionTransitions.view,
	},
	exit: {
		opacity: 0,
		y: -motionTokens.distance.md,
		scale: 0.98,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const toastIconVariants = {
	initial: {
		opacity: 0,
		scale: 0.72,
	},
	animate: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.36,
			ease: motionTokens.ease.emphasis,
			delay: 0.08,
		},
	},
	exit: {
		opacity: 0,
		scale: 0.9,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const comboMenuVariants = {
	initial: {
		opacity: 0,
		scale: 0.985,
		y: motionTokens.distance.xs,
	},
	animate: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: motionTransitions.base,
	},
	exit: {
		opacity: 0,
		scale: 0.992,
		y: motionTokens.distance.xs,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const labelSwapVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.xs,
		scale: 0.98,
	},
	animate: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: motionTransitions.base,
	},
	exit: {
		opacity: 0,
		y: -motionTokens.distance.xs,
		scale: 0.985,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const staggerContainerVariants = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.04,
			delayChildren: 0.02,
		},
	},
	exit: {
		transition: {
			staggerChildren: 0.02,
			staggerDirection: -1,
		},
	},
} satisfies Variants

export const staggerItemVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.sm,
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: motionTransitions.view,
	},
	exit: {
		opacity: 0,
		y: -motionTokens.distance.xs,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const revealOnMountVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.sm,
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: motionTransitions.view,
	},
} satisfies Variants

export const crossfadeContentVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.xs,
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: motionTransitions.view,
	},
	exit: {
		opacity: 0,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const crossfadeSkeletonVariants = {
	initial: { opacity: 1 },
	animate: {
		opacity: 1,
		transition: motionTransitions.fast,
	},
	exit: {
		opacity: 0,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const deltaHintVariants = {
	initial: {
		opacity: 0,
		y: motionTokens.distance.xs,
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: motionTransitions.base,
	},
	exit: {
		opacity: 0,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const flashOverlayVariants = {
	initial: {
		opacity: 0,
		scale: 0.98,
	},
	animate: {
		opacity: [0, 1, 0],
		scale: [1, 1.012, 1],
		transition: {
			duration: motionTokens.duration.pulse,
			ease: motionTokens.ease.emphasis,
			times: [0, 0.38, 1],
		},
	},
	exit: {
		opacity: 0,
		transition: motionTransitions.fast,
	},
} satisfies Variants

export const agendaBoardVariants = {
	initial: (
		custom: AgendaSlideMotion = {
			direction: 'forward',
			distancePercent: 24,
			offsetDays: 5,
			scope: 'range',
		},
	) => ({
		opacity: 1,
		pointerEvents: 'none',
		x:
			custom.direction === 'forward'
				? `${custom.distancePercent}%`
				: `-${custom.distancePercent}%`,
	}),
	animate: (
		custom: AgendaSlideMotion = {
			direction: 'forward',
			distancePercent: 24,
			offsetDays: 5,
			scope: 'range',
		},
	) => ({
		opacity: 1,
		pointerEvents: 'auto',
		x: '0%',
		transition:
			custom.scope === 'day' ? motionTransitions.view : motionTransitions.agenda,
	}),
	exit: (
		custom: AgendaSlideMotion = {
			direction: 'forward',
			distancePercent: 24,
			offsetDays: 5,
			scope: 'range',
		},
	) => ({
		opacity: 1,
		pointerEvents: 'none',
		x:
			custom.direction === 'forward'
				? `-${custom.distancePercent}%`
				: `${custom.distancePercent}%`,
		transition:
			custom.scope === 'day' ? motionTransitions.view : motionTransitions.agenda,
	}),
} satisfies Variants

export function agendaSlideMotionFromOffset(
	offsetDays: number,
	visibleDays: number,
): AgendaSlideMotion {
	const normalizedVisibleDays = Math.max(1, visibleDays)
	const normalizedOffset = Math.max(1, Math.abs(offsetDays))
	const distancePercent = Math.min(
		100,
		Math.max(18, (normalizedOffset / normalizedVisibleDays) * 100),
	)

	return {
		direction: offsetDays >= 0 ? 'forward' : 'backward',
		distancePercent,
		offsetDays,
		scope: normalizedOffset >= normalizedVisibleDays ? 'range' : 'day',
	}
}

export function agendaSlidePresenceMode(
	motion: AgendaSlideMotion,
): 'sync' | 'wait' {
	return 'sync'
}

export function agendaSlideWindowsOverlap(
	motion: AgendaSlideMotion,
	visibleDays: number,
): boolean {
	const normalizedVisibleDays = Math.max(1, visibleDays)
	const normalizedOffset = Math.abs(motion.offsetDays)
	return normalizedOffset > 0 && normalizedOffset < normalizedVisibleDays
}
