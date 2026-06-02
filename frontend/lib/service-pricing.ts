// Espejo en frontend de catalog.models.Service.price_for: precio por tipo de
// vehiculo con fallback a base_price. Mantener el mismo orden y semantica que el
// backend (un precio por tipo de 0 es valido y NO cae a base).

type PriceRecord = Record<string, any> | null | undefined

export const VEHICLE_TYPES = [
	{ value: 'moto', label: 'Moto', priceField: 'price_moto' },
	{ value: 'auto', label: 'Auto', priceField: 'price_auto' },
	{ value: 'camioneta', label: 'Camioneta', priceField: 'price_camioneta' },
	{ value: 'combi', label: 'Combi', priceField: 'price_combi' },
	{ value: 'camion', label: 'Camion', priceField: 'price_camion' },
] as const

export const VEHICLE_TYPE_OPTIONS = VEHICLE_TYPES.map(({ value, label }) => ({
	value,
	label,
}))

export const VEHICLE_TYPE_PRICE_FIELDS = VEHICLE_TYPES.map(
	(type) => type.priceField,
)

const PRICE_FIELD_BY_TYPE: Record<string, string> = Object.fromEntries(
	VEHICLE_TYPES.map((type) => [type.value, type.priceField]),
)

function hasValue(value: any) {
	return value !== null && value !== undefined && String(value).trim() !== ''
}

export function servicePriceForVehicleType(
	service: PriceRecord,
	vehicleType?: string | null,
) {
	const field = vehicleType ? PRICE_FIELD_BY_TYPE[vehicleType] : undefined
	const typed = field ? service?.[field] : undefined
	if (hasValue(typed)) {
		return String(typed)
	}
	const base = service?.base_price
	return hasValue(base) ? String(base) : ''
}

export function vehicleTypeForId(
	vehicles: PriceRecord[] | null | undefined,
	vehicleId: any,
) {
	if (!vehicleId) {
		return ''
	}
	const match = (vehicles ?? []).find(
		(vehicle) => String(vehicle?.id) === String(vehicleId),
	)
	return String(match?.vehicle_type ?? '')
}

// Copia el precio base a los tipos que siguen vacios o que todavia replicaban el
// base anterior; respeta los que el usuario edito individualmente.
export function applyBasePriceToTypes(
	form: Record<string, any>,
	nextBase: any,
) {
	const previousBase = String(form?.base_price ?? '')
	const next: Record<string, any> = { ...form, base_price: nextBase }
	for (const field of VEHICLE_TYPE_PRICE_FIELDS) {
		const current = String(form?.[field] ?? '')
		if (current === '' || current === previousBase) {
			next[field] = nextBase
		}
	}
	return next
}

// Re-resuelve unit_price de las lineas con servicio para el tipo del vehiculo.
export function repriceItemsForVehicle(
	items: Record<string, any>[] | null | undefined,
	vehicleType: string | null | undefined,
	services: PriceRecord[] | null | undefined,
) {
	return (items ?? []).map((item) => {
		if (!item?.service) {
			return item
		}
		const service = (services ?? []).find(
			(candidate) => String(candidate?.id) === String(item.service),
		)
		if (!service) {
			return item
		}
		return {
			...item,
			unit_price: servicePriceForVehicleType(service, vehicleType),
		}
	})
}
