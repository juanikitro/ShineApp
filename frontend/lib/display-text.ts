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

export function selectOptionsFromValues(values: string[], currentValue?: any) {
	const current = String(currentValue ?? '').trim()
	const normalizedValues =
		current && !values.includes(current) ? [current, ...values] : values
	return normalizedValues.map((value) => ({ value, label: value }))
}
