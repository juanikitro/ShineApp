type VehicleDisplaySource = {
	brand?: unknown
	color?: unknown
	customer_name?: unknown
	label?: unknown
	license_plate?: unknown
	model?: unknown
}

function cleanText(value: unknown) {
	return String(value ?? '').trim()
}

export function vehicleDisplayTitle(vehicle: VehicleDisplaySource) {
	const licensePlate = cleanText(vehicle.license_plate)
	if (licensePlate) return licensePlate
	const label = cleanText(vehicle.label)
	if (label) return label
	const details = [vehicle.brand, vehicle.model]
		.map(cleanText)
		.filter(Boolean)
		.join(' ')
	return details || 'Sin patente'
}

export function vehicleDescriptionText(vehicle: VehicleDisplaySource) {
	const details = [vehicle.brand, vehicle.model]
		.map(cleanText)
		.filter(Boolean)
		.join(' ')
	return [
		details || 'Sin marca/modelo',
		cleanText(vehicle.color) || 'Sin color',
		cleanText(vehicle.customer_name),
	]
		.filter(Boolean)
		.join(' - ')
}

export function vehicleMatchesSearch(vehicle: VehicleDisplaySource, search: string) {
	const term = search.trim().toLowerCase()
	if (!term) return true
	return [
		vehicleDisplayTitle(vehicle),
		vehicleDescriptionText(vehicle),
		vehicle.license_plate,
		vehicle.label,
		vehicle.brand,
		vehicle.model,
		vehicle.color,
		vehicle.customer_name,
	].some((value) => cleanText(value).toLowerCase().includes(term))
}
