type AuditRecord = Record<string, unknown>

export function sortedAuditValues(
	records: AuditRecord[],
	key: string,
	label: (value: string) => string,
) {
	return Array.from(new Set(records.map((item) => String(item[key] ?? ''))))
		.filter(Boolean)
		.sort((left, right) => label(left).localeCompare(label(right), 'es-AR'))
}

export function sortedAuditActorValues(records: AuditRecord[]) {
	return Array.from(
		new Set(
			records.map((item) => String(item.actor_username ?? '')).filter(Boolean),
		),
	).sort((left, right) => left.localeCompare(right, 'es-AR'))
}

export function hasActiveAuditFilters(filters: Record<string, unknown>) {
	return Object.values(filters).some((value) => String(value ?? '').trim())
}
