import {
	normalizeExpenseCategoryTree,
	normalizeIncomeCategoryTree,
	type AnyRecord,
} from './page-support'

type BusinessProfilePayloadOptions = {
	includeLogo?: boolean
}

export function businessProfilePayload(
	currentBusinessForm: AnyRecord,
	options: BusinessProfilePayloadOptions = {},
	businessLogoFile?: File | null,
) {
	const payload = new FormData()
	payload.append('name', String(currentBusinessForm.name ?? '').trim())
	payload.append('cuit', String(currentBusinessForm.cuit ?? ''))
	payload.append(
		'vat_condition',
		String(currentBusinessForm.vat_condition ?? ''),
	)
	payload.append(
		'business_type',
		String(currentBusinessForm.business_type ?? ''),
	)
	payload.append(
		'contact_phone',
		String(currentBusinessForm.contact_phone ?? ''),
	)
	payload.append(
		'contact_email',
		String(currentBusinessForm.contact_email ?? ''),
	)
	payload.append('address', String(currentBusinessForm.address ?? ''))
	payload.append('maps_url', String(currentBusinessForm.maps_url ?? ''))
	payload.append(
		'default_quote_validity_days',
		String(currentBusinessForm.default_quote_validity_days ?? '7'),
	)
	payload.append(
		'default_quote_tax_rate',
		String(currentBusinessForm.default_quote_tax_rate ?? '0'),
	)
	payload.append(
		'default_quote_discount_rate',
		String(currentBusinessForm.default_quote_discount_rate ?? '0'),
	)
	payload.append(
		'default_quote_terms',
		String(currentBusinessForm.default_quote_terms ?? ''),
	)
	payload.append(
		'default_quote_payment_instructions',
		String(currentBusinessForm.default_quote_payment_instructions ?? ''),
	)
	payload.append(
		'use_reservation_times',
		String(currentBusinessForm.use_reservation_times !== false),
	)
	payload.append(
		'show_stay_days_in_agenda',
		String(currentBusinessForm.show_stay_days_in_agenda !== false),
	)
	payload.append(
		'allow_overlapping_reservations',
		String(currentBusinessForm.allow_overlapping_reservations === true),
	)
	payload.append(
		'enforce_capacity_limit',
		String(currentBusinessForm.enforce_capacity_limit !== false),
	)
	payload.append(
		'default_capacity_wash',
		String(currentBusinessForm.default_capacity_wash ?? '8'),
	)
	payload.append(
		'default_capacity_detailing',
		String(currentBusinessForm.default_capacity_detailing ?? '4'),
	)
	payload.append(
		'reservation_use_pending',
		String(currentBusinessForm.reservation_use_pending !== false),
	)
	payload.append(
		'reservation_use_in_progress',
		String(currentBusinessForm.reservation_use_in_progress !== false),
	)
	payload.append(
		'reservation_use_ready',
		String(currentBusinessForm.reservation_use_ready !== false),
	)
	payload.append(
		'reservation_use_canceled',
		String(currentBusinessForm.reservation_use_canceled !== false),
	)
	payload.append(
		'reservation_auto_charge_on_delivery',
		String(currentBusinessForm.reservation_auto_charge_on_delivery === true),
	)
	payload.append(
		'public_landing_enabled',
		String(currentBusinessForm.public_landing_enabled !== false),
	)
	payload.append(
		'public_landing_intro',
		String(currentBusinessForm.public_landing_intro ?? ''),
	)
	payload.append(
		'allow_public_booking_requests',
		String(currentBusinessForm.allow_public_booking_requests !== false),
	)
	payload.append(
		'allow_public_quote_requests',
		String(currentBusinessForm.allow_public_quote_requests !== false),
	)
	payload.append(
		'public_hidden_service_ids',
		JSON.stringify(
			Array.isArray(currentBusinessForm.public_hidden_service_ids)
				? currentBusinessForm.public_hidden_service_ids
						.map((value: unknown) => Number(value))
						.filter(
							(value: number) => Number.isFinite(value) && value > 0,
						)
				: [],
		),
	)
	payload.append(
		'onboarding_dismissed_step_ids',
		JSON.stringify(
			Array.isArray(currentBusinessForm.onboarding_dismissed_step_ids)
				? currentBusinessForm.onboarding_dismissed_step_ids.map(
							(value: unknown) => String(value),
						)
				: [],
		),
	)
	payload.append(
		'public_show_service_description',
		String(currentBusinessForm.public_show_service_description !== false),
	)
	payload.append(
		'public_show_service_price',
		String(currentBusinessForm.public_show_service_price === true),
	)
	payload.append(
		'opening_time',
		currentBusinessForm.opening_time
			? String(currentBusinessForm.opening_time)
			: '',
	)
	payload.append(
		'closing_time',
		currentBusinessForm.closing_time
			? String(currentBusinessForm.closing_time)
			: '',
	)
	payload.append(
		'income_category_tree',
		JSON.stringify(
			normalizeIncomeCategoryTree(currentBusinessForm.income_category_tree),
		),
	)
	payload.append(
		'expense_category_tree',
		JSON.stringify(
			normalizeExpenseCategoryTree(currentBusinessForm.expense_category_tree),
		),
	)
	if (options.includeLogo && businessLogoFile) {
		payload.append('logo', businessLogoFile)
	}
	return payload
}
