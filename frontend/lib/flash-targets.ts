export function recordFlashKey(
	kind: string,
	id: string | number | null | undefined,
) {
	return id === null || id === undefined || id === ''
		? null
		: `record:${kind}:${id}`
}

export function fieldFlashKey(target: string) {
	return `field:${target}`
}

export function agendaCardFlashKey(rowKey: string) {
	return `agenda:${rowKey}`
}

export function createFlashClass(flashTarget: string | null) {
	return (target: string | null) =>
		target && flashTarget === target ? 'motion-flash' : ''
}

export function createRecordClass(flashTarget: string | null) {
	const flashClass = createFlashClass(flashTarget)
	return (kind: string, id: string | number, extraClass?: string) =>
		['record', extraClass, flashClass(recordFlashKey(kind, id))]
			.filter(Boolean)
			.join(' ')
}
