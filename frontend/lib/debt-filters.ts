import {
	type AnyRecord,
	debtStatusLabels,
	money,
	numberValue,
} from '@/lib/page-support'
import type { DebtFilterState } from '@/app/components/debts/DebtPanel'
import { normalizedCashText } from '@/lib/cash-entry'

export const DEBT_FILTER_DEFAULTS: DebtFilterState = {
	status: '',
	balance: '',
}

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

export function debtSelectOptions(debts: AnyRecord[]) {
	const allDebtOptions = debts.map((item) => ({
		value: String(item.id),
		label: item.concept,
		meta: `${debtStatusLabels[item.status] ?? item.status} - saldo ${money(item.balance_due)}`,
	}))
	const debtOptions = allDebtOptions.filter((option) => {
		const debt = debts.find((item) => String(item.id) === option.value)
		return numberValue(debt?.balance_due) > 0
	})
	return { allDebtOptions, debtOptions }
}
