import { ensureGroupVehicleLines } from './quote-groups'
import { quoteCode, quoteHasReservation, quoteLaneStatus } from './quote-display'

type QuoteRecord = Record<string, any>

type QuoteVehicleOption = {
	value: string
	label: string
	meta?: string
}

export function quoteDetailViewModel(
	data: QuoteRecord,
	quoteStatusLabels: Record<string, string>,
	vehicles: QuoteRecord[],
	vehicleOptions: QuoteVehicleOption[],
) {
	const code = quoteCode(data)
	const quoteStatusLabel =
		data.status_label ??
		quoteStatusLabels[String(data.status ?? '')] ??
		String(data.status ?? '')
	const hasReservation = quoteHasReservation(data)
	const groupLines = data.is_group ? ensureGroupVehicleLines(data) : []
	const groupCanEdit =
		Boolean(data.is_group) &&
		quoteLaneStatus(data) === 'draft' &&
		!hasReservation
	const groupVehicleOptions = data.customer
		? vehicles
				.filter((vehicle) => String(vehicle.customer) === String(data.customer))
				.map((item) => ({
					value: String(item.id),
					label: item.label,
					meta: item.customer_name,
				}))
		: vehicleOptions

	return {
		code,
		quoteStatusLabel,
		hasReservation,
		groupLines,
		groupCanEdit,
		groupVehicleOptions,
	}
}
