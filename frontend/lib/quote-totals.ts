import { ensureGroupVehicleLines, groupVehicleLinesSubtotal } from './quote-groups'
import { serviceLinesTotal } from './service-lines'

type QuoteFormRecord = Record<string, any>

export function quoteTotalsForForm(quoteForm: QuoteFormRecord) {
	const subtotal = quoteForm.is_group
		? groupVehicleLinesSubtotal(ensureGroupVehicleLines(quoteForm))
		: serviceLinesTotal(quoteForm.items ?? [])
	const discountRate = Number(quoteForm.discount_rate || 0)
	const taxRate = Number(quoteForm.tax_rate || 0)
	const discountAmount = (subtotal * Math.max(discountRate, 0)) / 100
	const taxableAmount = Math.max(subtotal - discountAmount, 0)
	const taxAmount = (taxableAmount * Math.max(taxRate, 0)) / 100
	return {
		subtotal,
		discountAmount,
		taxableAmount,
		taxAmount,
		total: taxableAmount + taxAmount,
	}
}
