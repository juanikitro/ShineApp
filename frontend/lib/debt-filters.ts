import {
	type AnyRecord,
	debtStatusLabels,
	numberValue,
} from '@/lib/page-support'
import type { DebtFilterState } from '@/app/components/debts/DebtPanel'
import { normalizedCashText } from '@/lib/cash-entry'

export function debtMatchesFilters(
	item: AnyRecord,
	filters: DebtFilterState,
	query: string,
) {
	if (filters.status && String(item.status ?? '') !== filters.status) {
		return false
	}
	const balanceDue = numberValue(item.balance_due)
	if (filters.balance === 'open' && balanceDue <= 0) return false
	if (filters.balance === 'settled' && balanceDue > 0) return false

	const term = normalizedCashText(query)
	if (!term) return true
	const haystack = normalizedCashText(
		[
			item.concept,
			item.creditor,
			item.supplier_name,
			debtStatusLabels[item.status],
			item.status,
			item.expense_category,
			item.expense_subcategory,
			item.notes,
			item.principal_amount,
			item.total_paid,
			item.balance_due,
		].join(' '),
	)
	return haystack.includes(term)
}

export function hasDebtFilters(filters: DebtFilterState) {
	return Object.values(filters).some((value) => String(value ?? '').trim())
}
