import { type AnyRecord } from './page-support'
import {
	ensureGroupVehicleLines,
	groupVehicleLinePayload,
} from './quote-groups'
import { serviceDetailPayloadFields } from './service-detail-payload'
import { serviceLinePayload } from './service-lines'

type DetailPayloadSources = {
	services: AnyRecord[]
	vehicles: AnyRecord[]
}

export function cleanDetailPayload(
	kind: string,
	data: AnyRecord,
	{ services, vehicles }: DetailPayloadSources,
) {
	const allowed: Record<string, string[]> = {
		customer: [
			'name',
			'phone',
			'email',
			'birthday_month',
			'birthday_day',
			'notes',
		],
		vehicle: [
			'customer',
			'license_plate',
			'brand',
			'model',
			'color',
			'vehicle_type',
			'notes',
		],
		service: serviceDetailPayloadFields,
		reservation: [
			'customer',
			'vehicle',
			'service',
			'items',
			'day',
			'exit_day',
			'start_time',
			'exit_time',
			'status',
			'notes',
		],
		workorder: [
			'customer',
			'vehicle',
			'service',
			'status',
			'total_amount',
			'internal_notes',
			'estimated_delivery_at',
		],
		material: ['name', 'unit', 'stock_quantity', 'notes', 'is_active'],
		supplier: [
			'name',
			'legal_name',
			'category',
			'tax_condition',
			'website',
			'contact_name',
			'phone',
			'email',
			'tax_id',
			'address',
			'notes',
			'is_active',
		],
		tool: [
			'name',
			'quantity',
			'status',
			'unit_value',
			'purchased_at',
			'notes',
			'is_active',
		],
		'material-purchase': [
			'material',
			'purchased_at',
			'quantity',
			'total_cost',
			'affects_cash',
			'observations',
		],
		'material-consumption': [
			'work_order',
			'material',
			'consumed_at',
			'quantity',
			'observations',
		],
		quote: [
			'public_code',
			'status',
			'is_group',
			'vehicle_lines',
			'observations',
			'valid_until',
			'tax_rate',
			'discount_rate',
			'terms',
			'payment_instructions',
		],
		'cash-movement': [
			'movement_type',
			'category',
			'subcategory',
			'amount',
			'occurred_at',
			'adjusts_closed_day',
			'description',
		],
		debt: [
			'concept',
			'creditor',
			'supplier',
			'principal_amount',
			'origin_date',
			'due_date',
			'expense_category',
			'expense_subcategory',
			'notes',
		],
		'debt-payment': ['debt', 'amount', 'paid_at', 'method', 'notes'],
	}
	const payload = Object.fromEntries(
		(allowed[kind] ?? [])
			.filter((key) => key in data)
			.map((key) => [key, data[key]]),
	)
	if (kind === 'reservation') {
		payload.start_time = payload.start_time || null
		payload.exit_day = payload.exit_day || null
		payload.exit_time = payload.exit_time || null
		payload.items = serviceLinePayload(payload.items ?? [], services)
		payload.service = payload.items[0]?.service ?? payload.service
	}
	if (kind === 'quote') {
		payload.valid_until = payload.valid_until || null
		payload.tax_rate = payload.tax_rate || '0'
		payload.discount_rate = payload.discount_rate || '0'
		if (payload.is_group) {
			payload.vehicle_lines = groupVehicleLinePayload(
				ensureGroupVehicleLines(data),
				services,
				vehicles,
			)
		} else {
			delete payload.is_group
			delete payload.vehicle_lines
		}
	}
	if (kind === 'customer') {
		payload.birthday_month = payload.birthday_month
			? Number(payload.birthday_month)
			: null
		payload.birthday_day = payload.birthday_day
			? Number(payload.birthday_day)
			: null
	}
	if (kind === 'service') {
		payload.estimated_material_cost =
			String(payload.estimated_material_cost ?? '').trim() === ''
				? null
				: payload.estimated_material_cost
	}
	if (kind === 'workorder') {
		payload.estimated_delivery_at = payload.estimated_delivery_at || null
	}
	if (kind === 'tool') {
		payload.purchased_at = payload.purchased_at || null
	}
	if (kind === 'debt') {
		payload.due_date = payload.due_date || null
		payload.supplier = payload.supplier || null
	}
	return payload
}

export function normalizedDetailPayload(
	kind: string,
	data: AnyRecord,
	sources: DetailPayloadSources,
) {
	return Object.fromEntries(
		Object.entries(cleanDetailPayload(kind, data, sources)).map(
			([key, value]) => {
				if (value === null || value === undefined) return [key, '']
				if (key === 'items' || key === 'vehicle_lines') {
					return [key, JSON.stringify(value)]
				}
				if (key === 'start_time' || key === 'exit_time') {
					return [key, String(value).slice(0, 5)]
				}
				if (key === 'estimated_delivery_at') {
					return [key, String(value).slice(0, 16)]
				}
				if (key === 'occurred_at') return [key, String(value).slice(0, 16)]
				return [key, String(value)]
			},
		),
	)
}

export function createDetailPayloadHelpers(sources: DetailPayloadSources) {
	return {
		cleanDetailPayload: (kind: string, data: AnyRecord) =>
			cleanDetailPayload(kind, data, sources),
		normalizedDetailPayload: (kind: string, data: AnyRecord) =>
			normalizedDetailPayload(kind, data, sources),
	}
}
