type StatusPillProps = {
	value: string
	labels: Record<string, string>
}

export function StatusPill({ value, labels }: StatusPillProps) {
	return <span className={`status ${value}`}>{labels[value] ?? value}</span>
}
