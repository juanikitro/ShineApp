import { blankQuoteForm, toIsoDate, type AnyRecord } from '@/lib/page-support'

export function blankQuoteFormWithBusinessDefaults(
	businessProfile: AnyRecord,
	reservationDay = '',
	now = new Date(),
) {
	const validityDays = Number(businessProfile.default_quote_validity_days ?? 7)
	const validUntil = new Date(now)
	validUntil.setDate(
		validUntil.getDate() + (Number.isFinite(validityDays) ? validityDays : 7),
	)
	return {
		...blankQuoteForm(reservationDay),
		valid_until: toIsoDate(validUntil),
		tax_rate: String(businessProfile.default_quote_tax_rate ?? '0'),
		discount_rate: String(businessProfile.default_quote_discount_rate ?? '0'),
		terms: String(businessProfile.default_quote_terms ?? ''),
		payment_instructions: String(
			businessProfile.default_quote_payment_instructions ?? '',
		),
	}
}
