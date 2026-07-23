type DetailRecord = {
	customer?: unknown
}

type VehicleOption = {
	value: unknown
}

type VehicleRecord = {
	id?: unknown
	customer?: unknown
}

export function vehicleOptionsForDetail<T extends VehicleOption>(
	kind: string,
	data: DetailRecord,
	vehicleOptions: T[],
	vehicles: VehicleRecord[],
) {
	if (kind !== 'reservation' && kind !== 'workorder') {
		return vehicleOptions
	}

	return vehicleOptions.filter(
		(option) =>
			!data.customer ||
			String(
				vehicles.find((item) => String(item.id) === option.value)?.customer,
			) === String(data.customer),
	)
}
