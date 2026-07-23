import { joinDisplayParts } from './display-text'
import { money, type AnyRecord } from './page-support'

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

export function serviceSelectOptions(
	services: AnyRecord[],
	canViewEconomy: boolean,
	serviceTypeLabels: Record<string, string>,
) {
	return services.map((item) => ({
		value: String(item.id),
		label: serviceDisplayName(item),
		meta: canViewEconomy
			? joinDisplayParts([
					serviceTypeLabels[item.service_type] ?? item.service_type,
					money(item.base_price),
				])
			: serviceTypeLabels[item.service_type] ?? item.service_type,
	}))
}
