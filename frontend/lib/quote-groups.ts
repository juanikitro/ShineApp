import {
	repriceItemsForVehicle,
	servicePriceForVehicleType,
	vehicleTypeForId,
} from './service-pricing'

export type AnyGroupRecord = Record<string, any>

export const MAX_GROUP_VEHICLE_LINES = 25

export function blankGroupVehicleItem() {
	return { service: '', quantity: '1', unit_price: '' }
}

export function blankGroupVehicleLine(seed: AnyGroupRecord = {}) {
	return {
		vehicle: '',
		use_new_vehicle: false,
		new_vehicle: {
			license_plate: '',
			brand: '',
			model: '',
			color: '',
			vehicle_type: 'auto',
			notes: '',
		},
		reservation_day: '',
		reservation_exit_day: '',
		reservation_start_time: '',
		reservation_exit_time: '',
		notes: '',
		items: [blankGroupVehicleItem()],
		...seed,
	}
}

export function ensureGroupVehicleLines(form: AnyGroupRecord) {
	const lines = Array.isArray(form.vehicle_lines) ? form.vehicle_lines : []
	return lines.length ? lines : [blankGroupVehicleLine()]
}

export function groupVehicleLineTotal(line: AnyGroupRecord) {
	return (line.items ?? []).reduce(
		(total: number, item: AnyGroupRecord) =>
			total + Number(item.quantity || 0) * Number(item.unit_price || 0),
		0,
	)
}

export function groupVehicleLinesSubtotal(lines: AnyGroupRecord[]) {
	return (lines ?? []).reduce(
		(total, line) => total + groupVehicleLineTotal(line),
		0,
	)
}

export function groupReservationMode(lines: AnyGroupRecord[]) {
	const usable = (lines ?? []).filter((line) => groupLineHasVehicleInput(line))
	if (!usable.length) return 'quote'
	const withDay = usable.filter((line) => Boolean(line.reservation_day))
	if (withDay.length === 0) return 'quote'
	if (withDay.length === usable.length) return 'reservation'
	return 'mixed'
}

export function groupLineHasVehicleInput(line: AnyGroupRecord) {
	if (line?.use_new_vehicle) {
		const vehicle = line.new_vehicle ?? {}
		return Boolean(
			String(vehicle.license_plate ?? '').trim() ||
				String(vehicle.brand ?? '').trim() ||
				String(vehicle.model ?? '').trim(),
		)
	}
	return Boolean(line?.vehicle)
}

export function groupLineVehicleType(
	line: AnyGroupRecord,
	vehicles: AnyGroupRecord[],
) {
	if (line?.use_new_vehicle) {
		return String(line.new_vehicle?.vehicle_type ?? '')
	}
	return vehicleTypeForId(vehicles, line?.vehicle)
}

export function repriceGroupVehicleLine(
	line: AnyGroupRecord,
	vehicles: AnyGroupRecord[],
	services: AnyGroupRecord[],
) {
	return {
		...line,
		items: repriceItemsForVehicle(
			line.items ?? [],
			groupLineVehicleType(line, vehicles),
			services,
		),
	}
}

export function repriceGroupVehicleLines(
	lines: AnyGroupRecord[],
	vehicles: AnyGroupRecord[],
	services: AnyGroupRecord[],
) {
	return (lines ?? []).map((line) =>
		repriceGroupVehicleLine(line, vehicles, services),
	)
}

export function serviceLinePayload(
	items: AnyGroupRecord[],
	services: AnyGroupRecord[],
	vehicleType = '',
) {
	return (items ?? [])
		.filter((item) => item.service)
		.map((item) => {
			const service = (services ?? []).find(
				(candidate) => String(candidate?.id) === String(item.service),
			)
			return {
				service: item.service,
				description: item.description || service?.name || 'Servicio',
				quantity: item.quantity || '1',
				unit_price:
					item.unit_price ||
					servicePriceForVehicleType(service, vehicleType) ||
					service?.base_price ||
					'0',
			}
		})
}

function cleanNewVehiclePayload(line: AnyGroupRecord) {
	const vehicle = line.new_vehicle ?? {}
	return {
		license_plate: String(vehicle.license_plate ?? '').trim(),
		brand: String(vehicle.brand ?? '').trim(),
		model: String(vehicle.model ?? '').trim(),
		color: String(vehicle.color ?? '').trim(),
		vehicle_type: String(vehicle.vehicle_type ?? 'auto'),
		notes: String(vehicle.notes ?? '').trim(),
	}
}

export function groupVehicleLinePayload(
	lines: AnyGroupRecord[],
	services: AnyGroupRecord[],
	vehicles: AnyGroupRecord[],
) {
	return (lines ?? [])
		.filter((line) => groupLineHasVehicleInput(line))
		.map((line) => {
			const vehicleType = groupLineVehicleType(line, vehicles)
			const payload: AnyGroupRecord = {
				reservation_day: line.reservation_day || null,
				reservation_exit_day: line.reservation_exit_day || null,
				reservation_start_time: line.reservation_start_time || null,
				reservation_exit_time: line.reservation_exit_time || null,
				notes: line.notes || '',
				items: serviceLinePayload(line.items ?? [], services, vehicleType),
			}
			if (line.use_new_vehicle) {
				payload.new_vehicle = cleanNewVehiclePayload(line)
			} else {
				payload.vehicle = line.vehicle
			}
			return payload
		})
}

export function validateGroupVehicleLines(lines: AnyGroupRecord[]) {
	const errors: { path: string; label: string; message: string }[] = []
	const indexedLines = (lines ?? [])
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => {
			const hasService = (line.items ?? []).some(
				(item: AnyGroupRecord) => item.service,
			)
			return (
				line?.use_new_vehicle ||
				groupLineHasVehicleInput(line) ||
				hasService ||
				Boolean(line?.reservation_day)
			)
		})
	if (!indexedLines.length) {
		errors.push({
			path: 'vehicle_lines',
			label: 'Autos',
			message: 'Agrega al menos un auto al grupo.',
		})
	}
	if ((lines ?? []).length > MAX_GROUP_VEHICLE_LINES) {
		errors.push({
			path: 'vehicle_lines',
			label: 'Autos',
			message: `El maximo por grupo es ${MAX_GROUP_VEHICLE_LINES} autos.`,
		})
	}
	if (groupReservationMode(indexedLines.map(({ line }) => line)) === 'mixed') {
		errors.push({
			path: 'vehicle_lines',
			label: 'Autos',
			message: 'Todos los autos deben tener fecha o ninguno debe tenerla.',
		})
	}
	indexedLines.forEach(({ line, index }) => {
		const label = `Auto ${index + 1}`
		if (line.use_new_vehicle) {
			const vehicle = cleanNewVehiclePayload(line)
			if (!vehicle.vehicle_type) {
				errors.push({
					path: `vehicle_lines.${index}.new_vehicle.vehicle_type`,
					label,
					message: 'Indica el tipo de vehiculo.',
				})
			}
			if (!vehicle.license_plate && !(vehicle.brand && vehicle.model)) {
				errors.push({
					path: `vehicle_lines.${index}.new_vehicle`,
					label,
					message: 'Carga patente o marca y modelo.',
				})
			}
		}
		const items = (line.items ?? []).filter((item: AnyGroupRecord) => item.service)
		if (!items.length) {
			errors.push({
				path: `vehicle_lines.${index}.items`,
				label,
				message: 'Agrega al menos un servicio.',
			})
		}
	})
	return errors
}
