import { type AnyRecord } from './page-support'
import {
	blankGroupVehicleItem,
	ensureGroupVehicleLines,
	repriceGroupVehicleLine,
	repriceGroupVehicleLines,
} from './quote-groups'
import {
	repriceItemsForVehicle,
	vehicleTypeForId,
} from './service-pricing'
import { singleVehicleIdForCustomer } from './vehicle-options'

type CustomerSelectionResult = {
	form: AnyRecord
	vehicle: string
}

type GroupQuickTargetOwner = 'quote' | 'reservation' | 'detail.quote'

export type GroupQuickTarget =
	| { field: 'vehicle'; lineIndex: number }
	| { field: 'service'; lineIndex: number; itemIndex: number }

export function formForCustomerSelection(
	form: AnyRecord,
	customer: string,
	vehicles: AnyRecord[],
	services: AnyRecord[],
): CustomerSelectionResult {
	if (form.is_group) {
		return {
			form: {
				...form,
				customer,
				vehicle_lines: repriceGroupVehicleLines(
					ensureGroupVehicleLines(form).map((line) =>
						line.use_new_vehicle ? line : { ...line, vehicle: '' },
					),
					vehicles,
					services,
				),
			},
			vehicle: '',
		}
	}

	const vehicle = singleVehicleIdForCustomer(vehicles, customer)
	return {
		form: {
			...form,
			customer,
			vehicle,
			items: repriceItemsForVehicle(
				form.items ?? [],
				vehicleTypeForId(vehicles, vehicle),
				services,
			),
		},
		vehicle,
	}
}

export function formForVehicleSelection(
	form: AnyRecord,
	vehicle: string,
	vehicles: AnyRecord[],
	services: AnyRecord[],
) {
	return {
		...form,
		vehicle,
		items: repriceItemsForVehicle(
			form.items ?? [],
			vehicleTypeForId(vehicles, vehicle),
			services,
		),
	}
}

export function groupQuickTargetForOwner(
	target: string,
	owner: GroupQuickTargetOwner,
): GroupQuickTarget | null {
	const ownerPattern = owner.replace('.', '\\.')
	const vehicleMatch = target.match(
		new RegExp(`^${ownerPattern}\\.vehicle_lines\\.(\\d+)\\.vehicle$`),
	)
	if (vehicleMatch) {
		return { field: 'vehicle', lineIndex: Number(vehicleMatch[1]) }
	}

	const serviceMatch = target.match(
		new RegExp(
			`^${ownerPattern}\\.vehicle_lines\\.(\\d+)\\.service\\.(\\d+)$`,
		),
	)
	return serviceMatch
		? {
				field: 'service',
				lineIndex: Number(serviceMatch[1]),
				itemIndex: Number(serviceMatch[2]),
			}
		: null
}

export function formForGroupVehicleLineSelection(
	form: AnyRecord,
	lineIndex: number,
	vehicle: string,
	vehicles: AnyRecord[],
	services: AnyRecord[],
) {
	return {
		...form,
		vehicle_lines: repriceGroupVehicleLines(
			ensureGroupVehicleLines(form).map((line, index) =>
				index === lineIndex ? { ...line, vehicle } : line,
			),
			vehicles,
			services,
		),
	}
}

export function formForGroupServiceLineSelection(
	form: AnyRecord,
	lineIndex: number,
	itemIndex: number,
	service: string,
	vehicles: AnyRecord[],
	services: AnyRecord[],
) {
	return {
		...form,
		vehicle_lines: ensureGroupVehicleLines(form).map((line, index) => {
			if (index !== lineIndex) return line
			const items = line.items?.length
				? line.items
				: [blankGroupVehicleItem()]
			return repriceGroupVehicleLine(
				{
					...line,
					items: items.map((item: AnyRecord, index: number) =>
						index === itemIndex ? { ...item, service } : item,
					),
				},
				vehicles,
				services,
			)
		}),
	}
}
