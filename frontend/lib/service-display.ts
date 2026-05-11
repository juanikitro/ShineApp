type ServiceDisplayRecord = Record<string, any> | null | undefined

function cleanText(value: any) {
	return String(value ?? '').trim()
}

export function serviceDisplayName(
	record: ServiceDisplayRecord,
	fallback = 'Servicio',
) {
	const icon = cleanText(record?.service_icon ?? record?.icon)
	const name =
		cleanText(record?.service_name ?? record?.name ?? record?.description) ||
		fallback
	return icon ? `${icon} ${name}` : name
}
