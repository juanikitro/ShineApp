type FullscreenDocument = Pick<Document, 'fullscreenElement' | 'exitFullscreen'> & {
	documentElement: Pick<HTMLElement, 'requestFullscreen'>
}

export function isFullscreenSupported(doc: FullscreenDocument): boolean {
	return (
		typeof doc.exitFullscreen === 'function' &&
		typeof doc.documentElement?.requestFullscreen === 'function'
	)
}

export function isFullscreenActive(doc: Pick<Document, 'fullscreenElement'>): boolean {
	return Boolean(doc.fullscreenElement)
}

export async function toggleDocumentFullscreen(
	doc: FullscreenDocument,
): Promise<boolean> {
	if (!isFullscreenSupported(doc)) return false
	if (isFullscreenActive(doc)) {
		await doc.exitFullscreen()
		return false
	}
	await doc.documentElement.requestFullscreen()
	return true
}
