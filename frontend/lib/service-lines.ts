export type ServiceLineRecord = Record<string, any>

export function serviceForLine(
	item: ServiceLineRecord,
	services: ServiceLineRecord[],
) {
	return services.find(
		(serviceItem) => String(serviceItem.id) === String(item.service),
	)
}

export function serviceNotesForLine(
	item: ServiceLineRecord,
	services: ServiceLineRecord[],
) {
	return item.service_notes ?? serviceForLine(item, services)?.notes ?? ''
}

export function createServiceNotesForLine(services: ServiceLineRecord[]) {
	return (item: ServiceLineRecord) => serviceNotesForLine(item, services)
}

export function serviceLinePayload(
	items: ServiceLineRecord[],
	services: ServiceLineRecord[],
) {
	return items.map((item) => {
		const service = serviceForLine(item, services)
		return {
			service: item.service,
			description: item.description || service?.name || 'Servicio',
			quantity: item.quantity || '1',
			unit_price: item.unit_price || service?.base_price || '0',
		}
	})
}

export function serviceLinesTotal(items: ServiceLineRecord[]) {
	return items.reduce(
		(total: number, item: ServiceLineRecord) =>
			total + Number(item.quantity || 0) * Number(item.unit_price || 0),
		0,
	)
}
