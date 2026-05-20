export const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[contenteditable="true"]',
	'[tabindex]:not([tabindex="-1"])',
].join(',')

type FocusTrapKeyboardEvent = {
	key: string
	shiftKey: boolean
	preventDefault: () => void
}

export function isFocusableElement(element: HTMLElement) {
	const hasLayoutBox =
		typeof element.getClientRects === 'function'
			? element.getClientRects().length > 0
			: element.offsetParent !== null
	const hasVisibleStyle =
		typeof window === 'undefined' ||
		typeof window.getComputedStyle !== 'function' ||
		window.getComputedStyle(element).visibility !== 'hidden'
	return (
		!element.hasAttribute('disabled') &&
		!element.hasAttribute('hidden') &&
		element.getAttribute('aria-hidden') !== 'true' &&
		element.getAttribute('aria-disabled') !== 'true' &&
		hasLayoutBox &&
		hasVisibleStyle
	)
}

export function getFocusableElements(root: HTMLElement | null) {
	if (!root) return []
	return Array.from(
		root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
	).filter(isFocusableElement)
}

export function focusFirstElement(root: HTMLElement | null) {
	const firstFocusable = getFocusableElements(root)[0]
	const target = firstFocusable ?? root
	if (!target) return false
	target.focus()
	return true
}

export function focusElementIfAvailable(element: HTMLElement | null | undefined) {
	if (!element || !document.contains(element)) return false
	element.focus()
	return true
}

export function wrappedFocusIndex({
	currentIndex,
	focusableCount,
	shiftKey,
}: {
	currentIndex: number
	focusableCount: number
	shiftKey: boolean
}) {
	if (focusableCount < 1) return null
	if (currentIndex === -1) return shiftKey ? focusableCount - 1 : 0
	if (shiftKey && currentIndex === 0) return focusableCount - 1
	if (!shiftKey && currentIndex === focusableCount - 1) return 0
	return null
}

export function trapFocusWithin(
	event: FocusTrapKeyboardEvent,
	root: HTMLElement | null,
) {
	if (event.key !== 'Tab') return false
	const focusable = getFocusableElements(root)
	if (!focusable.length) {
		event.preventDefault()
		root?.focus()
		return true
	}

	const nextIndex = wrappedFocusIndex({
		currentIndex: focusable.findIndex(
			(element) => element === document.activeElement,
		),
		focusableCount: focusable.length,
		shiftKey: event.shiftKey,
	})

	if (nextIndex === null) return false
	event.preventDefault()
	focusable[nextIndex]?.focus()
	return true
}
