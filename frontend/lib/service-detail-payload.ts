import { VEHICLE_TYPE_PRICE_FIELDS } from './service-pricing'
import { asPayload, type AnyRecord } from './page-support'

export const serviceDetailPayloadFields = [
	'name',
	'icon',
	'service_type',
	'base_price',
	...VEHICLE_TYPE_PRICE_FIELDS,
	'estimated_duration_minutes',
	'estimated_material_cost',
	'notes',
	'is_active',
]

export function serviceCreatePayload(form: AnyRecord) {
	const payload = asPayload(form)
	delete payload.templateId
	payload.estimated_material_cost =
		String(payload.estimated_material_cost ?? '').trim() === ''
			? null
			: payload.estimated_material_cost
	return payload
}
