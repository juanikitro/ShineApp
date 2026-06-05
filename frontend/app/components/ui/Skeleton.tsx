import { CSSProperties } from 'react'

type Common = {
	className?: string
	style?: CSSProperties
}

function dimension(value: string | number): string {
	return typeof value === 'number' ? `${value}px` : value
}

export function SkeletonLine({
	width = '100%',
	height = 12,
	className,
	style,
}: Common & { width?: string | number; height?: string | number }) {
	return (
		<span
			className={`skeleton skeleton-line${className ? ` ${className}` : ''}`}
			style={{ width: dimension(width), height: dimension(height), ...style }}
			aria-hidden="true"
		/>
	)
}

export function SkeletonCard({
	lines = 3,
	className,
	style,
}: Common & { lines?: number }) {
	return (
		<div
			className={`skeleton-card${className ? ` ${className}` : ''}`}
			style={style}
			aria-hidden="true"
		>
			<SkeletonLine width="40%" height={14} />
			{Array.from({ length: lines }).map((_, index) => (
				<SkeletonLine key={index} width={`${60 + ((index * 17) % 35)}%`} />
			))}
		</div>
	)
}

export function SkeletonRow({
	columns = 4,
	className,
	style,
}: Common & { columns?: number }) {
	const widthPercent = Math.max(8, 100 / columns - 4)
	return (
		<div
			className={`skeleton-row${className ? ` ${className}` : ''}`}
			style={style}
			aria-hidden="true"
		>
			{Array.from({ length: columns }).map((_, index) => (
				<SkeletonLine key={index} width={`${widthPercent}%`} />
			))}
		</div>
	)
}

export function SkeletonMetric({ className, style }: Common) {
	return (
		<div
			className={`skeleton-metric${className ? ` ${className}` : ''}`}
			style={style}
			aria-hidden="true"
		>
			<SkeletonLine width="50%" height={10} />
			<SkeletonLine width="70%" height={22} />
		</div>
	)
}

export function SkeletonList({
	rows = 6,
	columns = 4,
	label = 'Cargando',
	className,
	style,
}: Common & { rows?: number; columns?: number; label?: string }) {
	return (
		<div
			className={`skeleton-list${className ? ` ${className}` : ''}`}
			style={style}
			role="status"
			aria-live="polite"
			aria-label={label}
		>
			{Array.from({ length: rows }).map((_, index) => (
				<SkeletonRow key={index} columns={columns} />
			))}
		</div>
	)
}
