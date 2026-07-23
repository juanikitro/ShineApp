import { customerListInsights } from './customer-display'
import { type AnyRecord } from './page-support'

export type CustomerCardFilter =
	| 'all'
	| 'with_reservation'
	| 'birthday_soon'
	| 'no_upcoming'
	| 'with_balance'

export function filterCustomersForList(
	customers: AnyRecord[],
	filter: CustomerCardFilter,
	search: string,
	customerVehicleSearchTextById: ReadonlyMap<string, string[]>,
) {
	const term = search.trim().toLowerCase()
	return customers.filter((item) => {
		const insights = customerListInsights(item)
		if (
			filter === 'with_reservation' &&
			!insights.has_upcoming_reservation
		) {
			return false
		}
		if (filter === 'birthday_soon' && !item.has_birthday_alert) {
			return false
		}
		if (filter === 'no_upcoming' && insights.has_upcoming_reservation) {
			return false
		}
		if (filter === 'with_balance' && !insights.has_balance_due) {
			return false
		}
		if (!term) return true
		const vehicleTerms =
			customerVehicleSearchTextById.get(String(item.id)) ?? []
		return [
			item.name,
			item.phone,
			item.email,
			...vehicleTerms,
			insights.last_vehicle_label,
			insights.last_service_name,
		].some((value) =>
			String(value ?? '')
				.toLowerCase()
				.includes(term),
		)
	})
}
