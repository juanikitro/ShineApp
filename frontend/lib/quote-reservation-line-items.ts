import { type AnyRecord } from './page-support'

type BlankItemFactory = () => AnyRecord

export function quoteFormWithPatchedItem(
	form: AnyRecord,
	index: number,
	patch: AnyRecord,
) {
	const items = [...(form.items ?? [])]
	items[index] = { ...items[index], ...patch }
	return { ...form, items }
}

export function quoteFormWithAddedItem(
	form: AnyRecord,
	blankItem: BlankItemFactory,
) {
	return {
		...form,
		items: [...(form.items ?? []), blankItem()],
	}
}

export function quoteFormWithRemovedItem(
	form: AnyRecord,
	index: number,
	blankItem: BlankItemFactory,
) {
	const items = (form.items ?? []).filter(
		(_: AnyRecord, itemIndex: number) => itemIndex !== index,
	)
	return {
		...form,
		items: items.length ? items : [blankItem()],
	}
}

export function reservationFormWithPatchedItem(
	form: AnyRecord,
	index: number,
	patch: AnyRecord,
) {
	const items = [...(form.items ?? [])]
	items[index] = { ...items[index], ...patch }
	return {
		...form,
		service:
			index === 0 && patch.service !== undefined
				? patch.service
				: form.service,
		items,
	}
}

export function reservationFormWithAddedItem(
	form: AnyRecord,
	blankItem: BlankItemFactory,
) {
	return {
		...form,
		items: [...(form.items ?? []), blankItem()],
	}
}

export function reservationFormWithRemovedItem(
	form: AnyRecord,
	index: number,
	blankItem: BlankItemFactory,
) {
	const items = (form.items ?? []).filter(
		(_: AnyRecord, itemIndex: number) => itemIndex !== index,
	)
	const nextItems = items.length ? items : [blankItem()]
	return {
		...form,
		service: nextItems[0]?.service ?? '',
		items: nextItems,
	}
}
