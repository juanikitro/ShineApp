import {
	type AnyRecord,
	formatDateTimeLabel,
	numberValue,
} from '@/lib/page-support'
import type {
	CashFilterState,
	CashFlowSummary,
	CashSummaryGroup,
	CashSummaryLine,
	CashSummaryMode,
} from '@/app/components/cash/CashPanel'

const cashSummaryGroupDefinitions = [
	{ key: 'charges', label: 'Cobros' },
	{ key: 'payments', label: 'Pagos' },
	{ key: 'partner_contributions', label: 'Aportes' },
	{ key: 'investments', label: 'Inversiones' },
	{ key: 'partner_withdrawals', label: 'Retiros' },
	{ key: 'adjustments', label: 'Ajustes' },
] as const

const cashSourceKindLabels: Record<string, string> = {
	adjustment: 'Ajuste',
	debt_origin: 'Deuda original',
	debt_payment: 'Pago de deuda',
	manual: 'Manual',
	material_purchase: 'Compra',
	payment: 'Cobro',
	stock_purchase: 'Compra stock',
	stock_sale: 'Venta stock',
}

const cashCounterpartyKindLabels: Record<string, string> = {
	customer: 'Cliente',
	supplier: 'Proveedor',
	creditor: 'Acreedor',
	internal: 'Interno',
}

export type CashSortKey =
	| 'occurred_desc'
	| 'occurred_asc'
	| 'amount_desc'
	| 'amount_asc'
	| 'category_asc'

export const cashSortOptions: Array<{ value: CashSortKey; label: string }> = [
	{ value: 'occurred_desc', label: 'Mas reciente' },
	{ value: 'occurred_asc', label: 'Mas antiguo' },
	{ value: 'amount_desc', label: 'Mayor monto' },
	{ value: 'amount_asc', label: 'Menor monto' },
	{ value: 'category_asc', label: 'Categoria A-Z' },
]

export type CashQuickFilter =
	| 'all'
	| 'income'
	| 'expense'
	| 'cashflow'
	| 'economic_only'

export const cashQuickFilterOptions: Array<{
	value: CashQuickFilter
	label: string
}> = [
	{ value: 'all', label: 'Todos' },
	{ value: 'income', label: 'Ingresos' },
	{ value: 'expense', label: 'Egresos' },
	{ value: 'cashflow', label: 'Solo caja' },
	{ value: 'economic_only', label: 'Solo resultado' },
]

export function normalizedCashText(value: any) {
	return String(value ?? '')
		.trim()
		.toLocaleLowerCase('es-AR')
}

export function cashSourceKindLabel(kind: any, fallback?: any) {
	const key = String(kind ?? '').trim()
	return cashSourceKindLabels[key] || String((fallback ?? key) || 'Origen')
}

export function cashEntryTitleText(item: AnyRecord) {
	if (item.source_kind === 'debt_origin') {
		return `Deuda original: ${item.debt_concept || item.category}`
	}
	if (item.source_kind === 'debt_payment') {
		return `Pago de deuda: ${item.debt_concept || item.description}`
	}
	return item.source_label || item.category || 'Movimiento de caja'
}

export function cashCounterpartyKindLabel(kind: any) {
	const key = String(kind ?? '').trim()
	return cashCounterpartyKindLabels[key] || ''
}

export type CashCounterparty = {
	kind: string
	label: string
	direction: 'from' | 'to' | 'about' | 'none'
	short: string
}

export function cashEntryCounterparty(item: AnyRecord): CashCounterparty {
	const kind = String(item.counterparty_kind ?? '').trim()
	const label = String(item.counterparty_label ?? '').trim()
	const isIncome = item.movement_type === 'income'
	const direction: CashCounterparty['direction'] =
		kind === 'customer'
			? 'from'
			: kind === 'supplier' || kind === 'creditor'
				? 'to'
				: kind === 'internal'
					? 'about'
					: 'none'
	const short = label
		? `${cashCounterpartyKindLabel(kind) || (isIncome ? 'De' : 'Para')}: ${label}`
		: ''
	return { kind, label, direction, short }
}

export function cashEntryReferenceLabel(item: AnyRecord) {
	const reference = String(item.reference_label ?? '').trim()
	if (reference) return reference
	if (item.source_kind === 'debt_origin' || item.source_kind === 'debt_payment') {
		return String(item.debt_concept ?? '').trim()
	}
	return ''
}

export function cashEntryPaymentMethod(item: AnyRecord) {
	return String(item.payment_method ?? '').trim()
}

export function cashEntryClassificationLabel(item: AnyRecord) {
	const category = String(item.category ?? '').trim()
	const subcategory = String(item.subcategory ?? '').trim()
	if (category && subcategory) return `${category} / ${subcategory}`
	return category || subcategory || 'Sin categoria'
}

export function cashEntryOccurredTime(item: AnyRecord) {
	if (!item.occurred_at) return ''
	const date = new Date(item.occurred_at)
	if (Number.isNaN(date.getTime())) return ''
	return date.toLocaleTimeString('es-AR', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function cashEntryDescriptionText(item: AnyRecord) {
	const dateLabel = item.occurred_at
		? formatDateTimeLabel(item.occurred_at)
		: 'Sin fecha'
	const classification = [item.category, item.subcategory]
		.filter(Boolean)
		.join(' / ')
	const detail = [classification, item.description]
		.filter(Boolean)
		.join(' - ')
	const audit = item.created_by_username
		? `Registrado por ${item.created_by_username}`
		: ''
	return [detail, dateLabel, audit].filter(Boolean).join(' - ')
}

export function compareExpenseClassificationPair(
	a: { category: string; subcategory: string },
	b: { category: string; subcategory: string },
) {
	const categoryOrder = a.category.localeCompare(b.category, 'es-AR', {
		sensitivity: 'base',
	})
	if (categoryOrder !== 0) return categoryOrder
	return a.subcategory.localeCompare(b.subcategory, 'es-AR', {
		sensitivity: 'base',
	})
}

export function cashEntryIncludedInSummary(item: AnyRecord, mode: CashSummaryMode) {
	if (mode === 'cashflow') {
		return item.cashflow_effect !== false && item.source_kind !== 'debt_origin'
	}
	return item.economic_effect !== false && item.source_kind !== 'debt_payment'
}

export function cashEntrySignedAmount(item: AnyRecord) {
	const amount = numberValue(item.amount)
	return item.movement_type === 'expense' ? -amount : amount
}

export function cashSummaryLineLabel(item: AnyRecord) {
	return (
		String(item.subcategory ?? '').trim() ||
		String(item.category ?? '').trim() ||
		cashSourceKindLabel(item.source_kind, item.source_label)
	)
}

export function cashSummaryGroupKey(item: AnyRecord) {
	const category = normalizedCashText(item.category)
	const subcategory = normalizedCashText(item.subcategory)
	const sourceKind = normalizedCashText(item.source_kind)
	const searchText = `${category} ${subcategory} ${sourceKind}`
	if (sourceKind === 'adjustment' || category === 'ajustes') {
		return 'adjustments'
	}
	if (item.movement_type === 'income') {
		if (
			searchText.includes('aporte') ||
			searchText.includes('socio') ||
			category === 'inversion' ||
			category === 'prestamo'
		) {
			return 'partner_contributions'
		}
		return 'charges'
	}
	if (searchText.includes('retiro')) {
		return 'partner_withdrawals'
	}
	if (category === 'inversion') {
		return 'investments'
	}
	return 'payments'
}

export function buildCashFlowSummary(
	entries: AnyRecord[],
	mode: CashSummaryMode,
): CashFlowSummary {
	const groupsByKey = Object.fromEntries(
		cashSummaryGroupDefinitions.map((group) => [
			group.key,
			{
				key: group.key,
				label: group.label,
				count: 0,
				amount: 0,
				lines: [] as CashSummaryLine[],
			},
		]),
	) as Record<string, CashSummaryGroup>

	entries
		.filter((item) => cashEntryIncludedInSummary(item, mode))
		.forEach((item) => {
			const groupKey = cashSummaryGroupKey(item)
			const group = groupsByKey[groupKey] ?? groupsByKey.payments
			const amount = cashEntrySignedAmount(item)
			const label = cashSummaryLineLabel(item)
			const lineKey = normalizedCashText(label)
			let line = group.lines.find((current) => current.key === lineKey)
			if (!line) {
				line = { key: lineKey, label, count: 0, amount: 0, percent: 0 }
				group.lines.push(line)
			}
			group.count += 1
			group.amount += amount
			line.count += 1
			line.amount += amount
		})

	Object.values(groupsByKey).forEach((group) => {
		const absoluteTotal = group.lines.reduce(
			(total, line) => total + Math.abs(line.amount),
			0,
		)
		group.lines = group.lines
			.map((line) => ({
				...line,
				percent: absoluteTotal ? Math.abs(line.amount) / absoluteTotal : 0,
			}))
			.sort((a, b) => {
				const amountOrder = Math.abs(b.amount) - Math.abs(a.amount)
				if (amountOrder !== 0) return amountOrder
				return a.label.localeCompare(b.label, 'es-AR', {
					sensitivity: 'base',
				})
			})
	})

	const charges = groupsByKey.charges.amount
	const payments = groupsByKey.payments.amount
	const partnerContributions = groupsByKey.partner_contributions.amount
	const investments = groupsByKey.investments.amount
	const partnerWithdrawals = groupsByKey.partner_withdrawals.amount
	const adjustments = groupsByKey.adjustments.amount
	const commercialBalance = charges + payments
	const financialBalance =
		partnerContributions + investments + partnerWithdrawals
	const netFlow = commercialBalance + financialBalance + adjustments

	return {
		groups: cashSummaryGroupDefinitions.map((group) => groupsByKey[group.key]),
		commercialBalance,
		financialBalance,
		netFlow,
	}
}

export function normalizedCashFilterAmount(value: any) {
	const rawValue = String(value ?? '').trim()
	if (!rawValue) return null
	const amount = Number(rawValue.replace(',', '.'))
	return Number.isFinite(amount) ? amount : null
}

export function cashEntryMatchesFilters(item: AnyRecord, filters: CashFilterState) {
	if (
		filters.movementType &&
		String(item.movement_type ?? '') !== filters.movementType
	) {
		return false
	}
	if (filters.sourceKind && String(item.source_kind ?? '') !== filters.sourceKind) {
		return false
	}
	if (filters.category && String(item.category ?? '') !== filters.category) {
		return false
	}
	if (
		filters.subcategory &&
		String(item.subcategory ?? '') !== filters.subcategory
	) {
		return false
	}
	if (filters.effect === 'cashflow' && item.cashflow_effect === false) {
		return false
	}
	if (filters.effect === 'economic_only' && item.cashflow_effect !== false) {
		return false
	}

	const amount = Math.abs(numberValue(item.amount))
	const amountMin = normalizedCashFilterAmount(filters.amountMin)
	const amountMax = normalizedCashFilterAmount(filters.amountMax)
	if (amountMin !== null && amount < amountMin) return false
	if (amountMax !== null && amount > amountMax) return false

	const query = normalizedCashText(filters.query)
	if (!query) return true
	const haystack = normalizedCashText(
		[
			cashEntryTitleText(item),
			cashEntryDescriptionText(item),
			item.source_label,
			item.source_kind,
			item.category,
			item.subcategory,
			item.amount,
			item.signed_amount,
			item.counterparty_label,
			item.reference_label,
			item.payment_method,
		].join(' '),
	)
	return haystack.includes(query)
}

export function hasCashFilters(filters: CashFilterState) {
	return Object.values(filters).some((value) => String(value ?? '').trim())
}

export function cashEntryMatchesQuickFilter(
	item: AnyRecord,
	quick: CashQuickFilter,
) {
	switch (quick) {
		case 'income':
			return item.movement_type === 'income'
		case 'expense':
			return item.movement_type === 'expense'
		case 'cashflow':
			return item.cashflow_effect !== false
		case 'economic_only':
			return item.cashflow_effect === false
		default:
			return true
	}
}

export function sortCashEntries(entries: AnyRecord[], sort: CashSortKey) {
	const items = [...entries]
	const compareOccurred = (a: AnyRecord, b: AnyRecord) =>
		String(a.occurred_at ?? '').localeCompare(String(b.occurred_at ?? ''))
	const compareAmount = (a: AnyRecord, b: AnyRecord) =>
		numberValue(a.amount) - numberValue(b.amount)
	const compareCategory = (a: AnyRecord, b: AnyRecord) =>
		cashEntryClassificationLabel(a).localeCompare(
			cashEntryClassificationLabel(b),
			'es-AR',
			{ sensitivity: 'base' },
		)
	switch (sort) {
		case 'occurred_asc':
			return items.sort(
				(a, b) => compareOccurred(a, b) || compareAmount(b, a),
			)
		case 'amount_desc':
			return items.sort(
				(a, b) => compareAmount(b, a) || compareOccurred(b, a),
			)
		case 'amount_asc':
			return items.sort(
				(a, b) => compareAmount(a, b) || compareOccurred(b, a),
			)
		case 'category_asc':
			return items.sort(
				(a, b) => compareCategory(a, b) || compareOccurred(b, a),
			)
		case 'occurred_desc':
		default:
			return items.sort(
				(a, b) => compareOccurred(b, a) || compareAmount(b, a),
			)
	}
}
