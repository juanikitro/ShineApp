export type AuditLogFilters = {
	actor?: string
	module?: string
	action?: string
	from?: string
	to?: string
	q?: string
}

export type AuditLogEntry = {
	actor?: number | string | null
	actor_username?: string
	changes?: Record<string, { before: unknown; after: unknown }>
}

export function auditActorLabel(entry: AuditLogEntry, currentUserId?: number | string | null) {
	const username = String(entry.actor_username ?? '').trim()
	const base = username || 'Sistema'
	if (entry.actor !== null && entry.actor !== undefined && String(entry.actor) === String(currentUserId ?? '')) {
		return `${base} (Vos)`
	}
	return base
}

export function auditValueText(value: unknown): string {
	if (value === null || value === undefined || value === '') return 'Sin valor'
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}

export function auditChangeRows(
	changes: Record<string, { before: unknown; after: unknown }> = {},
) {
	return Object.entries(changes)
		.sort(([left], [right]) => left.localeCompare(right, 'es-AR'))
		.map(([field, change]) => ({
			field,
			before: auditValueText(change.before),
			after: auditValueText(change.after),
		}))
}

export function auditLogQueryString(filters: AuditLogFilters = {}) {
	const params = new URLSearchParams()
	for (const key of ['actor', 'module', 'action', 'from', 'to', 'q'] as const) {
		const value = String(filters[key] ?? '').trim()
		if (value) {
			params.set(key, value)
		}
	}
	const query = params.toString()
	return query ? `?${query}` : ''
}

export async function auditLogListOrEmpty<T>(
	loader: (path: string) => Promise<T[]>,
	filters: AuditLogFilters = {},
) {
	try {
		return await loader(`/audit-log/${auditLogQueryString(filters)}`)
	} catch (error: unknown) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'status' in error &&
			(error as { status?: unknown }).status === 404
		) {
			return []
		}
		throw error
	}
}
