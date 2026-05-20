type UndoShortcutEvent = {
	ctrlKey?: boolean
	metaKey?: boolean
	shiftKey?: boolean
	altKey?: boolean
	key: string
	target?: EventTarget | null
}

function isEditableUndoTarget(target: EventTarget | null | undefined) {
	const element = target as HTMLElement | null | undefined
	if (!element || typeof element.closest !== 'function') return false
	if (
		element.isContentEditable ||
		(typeof element.hasAttribute === 'function' &&
			element.hasAttribute('contenteditable'))
	) {
		return true
	}
	return Boolean(element.closest('input, textarea, select, [contenteditable]'))
}

export function shouldHandleUndoShortcut(event: UndoShortcutEvent) {
	if (event.altKey || event.shiftKey) return false
	if (!(event.ctrlKey || event.metaKey)) return false
	if (event.key.toLowerCase() !== 'z') return false
	return !isEditableUndoTarget(event.target)
}
