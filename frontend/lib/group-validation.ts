import { createValidationNotice } from './api-errors'
import { validateGroupVehicleLines } from './quote-groups'

type GroupLine = Record<string, any>

export function groupValidationNotice(
	title: string,
	description: string,
	lines: GroupLine[],
) {
	const errors = validateGroupVehicleLines(lines)
	if (!errors.length) return null
	return createValidationNotice(title, description, errors)
}
