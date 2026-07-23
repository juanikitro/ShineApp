import { type AnyRecord } from './page-support'

export function addServiceMaterialLine(lines: AnyRecord[]) {
	return [...lines, { id: '', material: '', quantity: '' }]
}

export function removeServiceMaterialLine(lines: AnyRecord[], index: number) {
	return lines.filter((_, itemIndex) => itemIndex !== index)
}

export function updateServiceMaterialLine(
	lines: AnyRecord[],
	index: number,
	changes: AnyRecord,
) {
	return lines.map((line, itemIndex) =>
		itemIndex === index ? { ...line, ...changes } : line,
	)
}
