function cleanText(value: unknown) {
	return String(value ?? '').trim()
}

export function joinDisplayParts(
	parts: Array<unknown>,
	separator = ' - ',
) {
	return parts
		.map(cleanText)
		.filter(Boolean)
		.join(separator)
}
