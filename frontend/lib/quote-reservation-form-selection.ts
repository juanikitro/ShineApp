import { type AnyRecord } from './page-support'
import { ensureGroupVehicleLines, repriceGroupVehicleLines } from './quote-groups'
import {
	repriceItemsForVehicle,
	vehicleTypeForId,
} from './service-pricing'
import { singleVehicleIdForCustomer } from './vehicle-options'

type CustomerSelectionResult = {
	form: AnyRecord
	vehicle: string
}

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
