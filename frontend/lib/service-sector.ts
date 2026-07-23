export type ServiceSectorRecord = Record<string, any>

export function serviceTypeForSectorId(
	sectorId: string | number,
	sectors: ServiceSectorRecord[],
): string {
	const sector = sectors.find((item) => String(item.id) === String(sectorId))
	return sector?.key === 'detailing' ? 'detailing' : 'wash'
}

export function sectorIdsByServiceId(
	services: ServiceSectorRecord[],
): Record<string, number | null> {
	return services.reduce<Record<string, number | null>>((byId, service) => {
		const id = String(service.id ?? '')
		if (!id) return byId
		const sectorId = Number(service.sector)
		byId[id] = Number.isFinite(sectorId) && sectorId > 0 ? sectorId : null
		return byId
	}, {})
}
