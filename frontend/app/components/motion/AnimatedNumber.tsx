'use client'

import { useEffect, useRef, useState } from 'react'

type AnimatedNumberProps = {
	value: number
	format?: (value: number) => string
	durationMs?: number
	from?: number
	animateOnMount?: boolean
	className?: string
}

function prefersReducedMotion() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false
	}
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches
	} catch {
		return false
	}
}

function easeOutCubic(t: number) {
	return 1 - Math.pow(1 - t, 3)
}

function nowMs() {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now()
	}
	return Date.now()
}

export function AnimatedNumber({
	value,
	format = (input) => input.toLocaleString('es-AR'),
	durationMs = 700,
	from = 0,
	animateOnMount = true,
	className,
}: AnimatedNumberProps) {
	const safeValue = Number.isFinite(value) ? value : 0
	const reducedMotion = prefersReducedMotion()
	const initialDisplay =
		reducedMotion || !animateOnMount ? safeValue : from
	const [display, setDisplay] = useState<number>(initialDisplay)
	const fromRef = useRef<number>(initialDisplay)
	const rafRef = useRef<number | null>(null)

	useEffect(() => {
		if (reducedMotion || !Number.isFinite(value)) {
			setDisplay(safeValue)
			fromRef.current = safeValue
			return
		}

		const startValue = fromRef.current
		const distance = safeValue - startValue
		if (distance === 0) {
			setDisplay(safeValue)
			return
		}

		const startTime = nowMs()

		function frame() {
			const elapsed = nowMs() - startTime
			const progress = Math.min(1, elapsed / durationMs)
			const eased = easeOutCubic(progress)
			const next = startValue + distance * eased
			setDisplay(next)

			if (progress < 1) {
				rafRef.current = requestAnimationFrame(frame)
			} else {
				fromRef.current = safeValue
				rafRef.current = null
			}
		}

		rafRef.current = requestAnimationFrame(frame)

		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current)
				rafRef.current = null
			}
			fromRef.current = safeValue
		}
	}, [safeValue, durationMs, reducedMotion, value])

	return <span className={className}>{format(display)}</span>
}
