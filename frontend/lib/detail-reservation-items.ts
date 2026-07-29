import {
	reservationFormWithAddedItem,
	reservationFormWithPatchedItem,
	reservationFormWithRemovedItem,
} from './quote-reservation-line-items'
import { type AnyRecord } from './page-support'

type BlankItemFactory = () => AnyRecord

export function detailReservationItems(
	data: AnyRecord,
	services: AnyRecord[],
) {
	return data.items?.length
		? data.items
		: [
				{
					service: data.service ?? '',
					quantity: '1',
					unit_price:
						services.find(
							(item) => String(item.id) === String(data.service),
						)?.base_price ?? '',
				},
		]
}

export function createDetailReservationItems(services: AnyRecord[]) {
	return (data: AnyRecord) => detailReservationItems(data, services)
}

function detailReservationForm(data: AnyRecord, services: AnyRecord[]) {
	return { ...data, items: detailReservationItems(data, services) }
}

export function detailReservationDataWithPatchedItem(
	data: AnyRecord,
	index: number,
	patch: AnyRecord,
	services: AnyRecord[],
) {
	return reservationFormWithPatchedItem(
		detailReservationForm(data, services),
		index,
		patch,
	)
}

export function detailReservationDataWithAddedItem(
	data: AnyRecord,
	services: AnyRecord[],
	blankItem: BlankItemFactory,
) {
	return reservationFormWithAddedItem(
		detailReservationForm(data, services),
		blankItem,
	)
}

export function detailReservationDataWithRemovedItem(
	data: AnyRecord,
	index: number,
	services: AnyRecord[],
	blankItem: BlankItemFactory,
) {
	return reservationFormWithRemovedItem(
		detailReservationForm(data, services),
		index,
		blankItem,
	)
}
