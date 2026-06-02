import { VEHICLE_TYPE_PRICE_FIELDS } from './service-pricing'

export const serviceDetailPayloadFields = [
	'name',
	'icon',
	'service_type',
	'base_price',
	...VEHICLE_TYPE_PRICE_FIELDS,
	'estimated_duration_minutes',
	'notes',
	'is_active',
]
