import { validVehicleModelForBrand } from './vehicle-options'
import { type AnyRecord } from './page-support'

export function vehicleFormWithCustomer(form: AnyRecord, customer: string) {
	return { ...form, customer }
}

export function vehicleFormWithBrand(
	form: AnyRecord,
	brand: string,
	vehicles: AnyRecord[],
) {
	return {
		...form,
		brand,
		model: validVehicleModelForBrand(brand, form.model, vehicles),
	}
}

export function detailVehiclePatchForBrand(
	editData: AnyRecord | null | undefined,
	brand: string,
	vehicles: AnyRecord[],
) {
	return {
		brand,
		model: validVehicleModelForBrand(brand, editData?.model, vehicles),
	}
}
