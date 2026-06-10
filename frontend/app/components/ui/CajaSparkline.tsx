import { useId } from 'react'

import { cx } from '../utils'

const VIEW_WIDTH = 100
const HEIGHT = 26
const PAD = 3

function toNumber(value: unknown) {
	const n = Number(value ?? 0)
	return Number.isFinite(n) ? n : 0
}

// Sparkline de caja con conciencia de signo: incluye la linea base en 0, dibuja
// los tramos positivos en acento y los negativos en rojo (semanas en rojo = atencion).
export function CajaSparkline({
	values,
	className,
}: {
	values: number[]
	className?: string
}) {
	const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
	const points = values.map(toNumber).filter((v) => Number.isFinite(v))
	if (points.length < 2) {
		return null
	}
	const withZero = points.concat([0])
	const min = Math.min(...withZero)
	const max = Math.max(...withZero)
	const span = max - min || 1
	const usable = HEIGHT - PAD * 2
	const y = (value: number) => PAD + (1 - (value - min) / span) * usable
	const baseline = y(0)
	const step = VIEW_WIDTH / (points.length - 1)
	const coords = points
		.map((value, index) => `${(index * step).toFixed(2)},${y(value).toFixed(2)}`)
		.join(' ')
	const aboveId = `caja-above-${id}`
	const belowId = `caja-below-${id}`
	return (
		<svg
			className={cx('caja-spark', className)}
			viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`}
			preserveAspectRatio="none"
			role="presentation"
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<clipPath id={aboveId}>
					<rect x="0" y="0" width={VIEW_WIDTH} height={baseline} />
				</clipPath>
				<clipPath id={belowId}>
					<rect x="0" y={baseline} width={VIEW_WIDTH} height={HEIGHT - baseline} />
				</clipPath>
			</defs>
			<line
				className="caja-spark-base"
				x1="0"
				y1={baseline}
				x2={VIEW_WIDTH}
				y2={baseline}
			/>
			<polyline
				className="caja-spark-pos"
				points={coords}
				clipPath={`url(#${aboveId})`}
			/>
			<polyline
				className="caja-spark-neg"
				points={coords}
				clipPath={`url(#${belowId})`}
			/>
		</svg>
	)
}
