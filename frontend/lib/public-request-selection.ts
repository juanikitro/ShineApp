export type PublicRequestSelection = {
	customer?: string
	vehicle?: string
}

export type PublicRequestSelections = Record<string, PublicRequestSelection>

export function publicRequestSelectionForId(
	selections: PublicRequestSelections,
	requestId: unknown,
) {
	return selections[String(requestId)] ?? {}
}

export function patchPublicRequestSelection(
	selections: PublicRequestSelections,
	requestId: unknown,
	patch: PublicRequestSelection,
) {
	const itemId = String(requestId)
	return {
		...selections,
		[itemId]: {
			...selections[itemId],
			...patch,
		},
	}
}

export function publicRequestConversionPayload(
	selection: PublicRequestSelection,
) {
	const payload: Record<string, number> = {}
	if (selection.customer) {
		payload.customer = Number(selection.customer)
	}
	if (selection.vehicle) {
		payload.vehicle = Number(selection.vehicle)
	}
	return payload
}

export function clearPublicRequestSelection(
	selections: PublicRequestSelections,
	requestId: unknown,
) {
	const next = { ...selections }
	delete next[String(requestId)]
	return next
}
