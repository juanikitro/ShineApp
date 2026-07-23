import { type AnyRecord } from './page-support'

export function customerForRecord(
	record: AnyRecord | null | undefined,
	customers: AnyRecord[],
) {
	const customerId =
		record?.customer ?? record?.customer_id ?? record?.customerId ?? null
	if (customerId === null || customerId === undefined || customerId === '') {
		return null
	}
	return (
		customers.find((customer) => String(customer.id) === String(customerId)) ??
		null
	)
}

export function vehicleForRecord(
	record: AnyRecord | null | undefined,
	vehicles: AnyRecord[],
) {
	const vehicleId =
		record?.vehicle ?? record?.vehicle_id ?? record?.vehicleId ?? null
	if (vehicleId === null || vehicleId === undefined || vehicleId === '') {
		return null
	}
	return (
		vehicles.find((vehicle) => String(vehicle.id) === String(vehicleId)) ??
		null
	)
}

export function createRecordRelationLookups(
	customers: AnyRecord[],
	vehicles: AnyRecord[],
) {
	return {
		customerForRecord: (record: AnyRecord | null | undefined) =>
			customerForRecord(record, customers),
		vehicleForRecord: (record: AnyRecord | null | undefined) =>
			vehicleForRecord(record, vehicles),
	}
}
