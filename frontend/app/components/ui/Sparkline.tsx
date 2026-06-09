import { cx } from '../utils'

type SparklineProps = {
	values: number[]
	height?: number
	className?: string
}

const VIEW_WIDTH = 100

// Dependency-free trend line: a single <polyline> in a stretched viewBox.
// preserveAspectRatio="none" fills the card width; vector-effect keeps the
// stroke constant (set in CSS) despite the horizontal stretch.
export function Sparkline({ values, height = 28, className }: SparklineProps) {
	const points = values.filter((value) => Number.isFinite(value))
	if (points.length < 2) {
		return null
	}
	const min = Math.min(...points)
	const max = Math.max(...points)
	const span = max - min
	const pad = 2
	const usableHeight = height - pad * 2
	const stepX = VIEW_WIDTH / (points.length - 1)
	const coords = points
		.map((value, index) => {
			const x = index * stepX
			const y =
				span === 0
					? height / 2
					: pad + (1 - (value - min) / span) * usableHeight
			return `${x.toFixed(2)},${y.toFixed(2)}`
		})
		.join(' ')
	return (
		<svg
			className={cx('sparkline', className)}
			viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
			preserveAspectRatio="none"
			role="presentation"
			aria-hidden="true"
			focusable="false"
		>
			<polyline points={coords} />
		</svg>
	)
}
