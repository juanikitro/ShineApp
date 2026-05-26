import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	normalizedCashText,
	cashSourceKindLabel,
	cashEntryTitleText,
	cashEntryDescriptionText,
	compareExpenseClassificationPair,
	cashEntryIncludedInSummary,
	cashEntrySignedAmount,
	cashSummaryLineLabel,
	cashSummaryGroupKey,
	buildCashFlowSummary,
	normalizedCashFilterAmount,
	cashEntryMatchesFilters,
	hasCashFilters,
} from './cash-entry'

// normalizedCashText
test('normalizedCashText trims and lowercases', () => {
	assert.equal(normalizedCashText('  Hola Mundo  '), 'hola mundo')
})

test('normalizedCashText handles null and undefined', () => {
	assert.equal(normalizedCashText(null), '')
	assert.equal(normalizedCashText(undefined), '')
})

// cashSourceKindLabel
test('cashSourceKindLabel returns mapped label for known kind', () => {
	assert.equal(cashSourceKindLabel('payment'), 'Cobro')
	assert.equal(cashSourceKindLabel('adjustment'), 'Ajuste')
	assert.equal(cashSourceKindLabel('manual'), 'Manual')
	assert.equal(cashSourceKindLabel('debt_origin'), 'Deuda original')
	assert.equal(cashSourceKindLabel('debt_payment'), 'Pago de deuda')
	assert.equal(cashSourceKindLabel('material_purchase'), 'Compra')
})

test('cashSourceKindLabel uses fallback for unknown kind', () => {
	assert.equal(cashSourceKindLabel('unknown_kind', 'Otro'), 'Otro')
})

test('cashSourceKindLabel uses kind as fallback when fallback not provided', () => {
	assert.equal(cashSourceKindLabel('my_kind'), 'my_kind')
})

test('cashSourceKindLabel returns Origen when kind and fallback are empty', () => {
	assert.equal(cashSourceKindLabel(null), 'Origen')
	assert.equal(cashSourceKindLabel(''), 'Origen')
})

// cashEntryTitleText
test('cashEntryTitleText returns debt_origin title', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'debt_origin', debt_concept: 'Alquiler', category: 'gastos' }),
		'Deuda original: Alquiler',
	)
})

test('cashEntryTitleText falls back to category when debt_concept is missing', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'debt_origin', category: 'gastos' }),
		'Deuda original: gastos',
	)
})

test('cashEntryTitleText returns debt_payment title', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'debt_payment', debt_concept: 'Alquiler', description: 'Pago' }),
		'Pago de deuda: Alquiler',
	)
})

test('cashEntryTitleText falls back to description when debt_concept is missing for debt_payment', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'debt_payment', description: 'Pago parcial' }),
		'Pago de deuda: Pago parcial',
	)
})

test('cashEntryTitleText returns source_label for regular entries', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'payment', source_label: 'Cobro servicios', category: 'ingresos' }),
		'Cobro servicios',
	)
})

test('cashEntryTitleText falls back to category when source_label is missing', () => {
	assert.equal(
		cashEntryTitleText({ source_kind: 'payment', category: 'ingresos' }),
		'ingresos',
	)
})

test('cashEntryTitleText returns default when no label or category', () => {
	assert.equal(cashEntryTitleText({}), 'Movimiento de caja')
})

// cashEntryDescriptionText
test('cashEntryDescriptionText builds full description', () => {
	const item = {
		occurred_at: '2025-01-15T10:30:00Z',
		category: 'ingresos',
		subcategory: 'servicios',
		description: 'Lavado premium',
		created_by_username: 'admin',
	}
	const text = cashEntryDescriptionText(item)
	assert.ok(text.includes('ingresos / servicios'))
	assert.ok(text.includes('Lavado premium'))
	assert.ok(text.includes('Registrado por admin'))
})

test('cashEntryDescriptionText uses Sin fecha when occurred_at is missing', () => {
	const text = cashEntryDescriptionText({ category: 'gastos' })
	assert.ok(text.includes('Sin fecha'))
})

test('cashEntryDescriptionText omits audit when created_by_username missing', () => {
	const text = cashEntryDescriptionText({ category: 'gastos', occurred_at: '2025-01-15T10:30:00Z' })
	assert.ok(!text.includes('Registrado por'))
})

test('cashEntryDescriptionText handles items with only description', () => {
	const text = cashEntryDescriptionText({ description: 'nota suelta' })
	assert.ok(text.includes('nota suelta'))
})

// compareExpenseClassificationPair
test('compareExpenseClassificationPair sorts by category first', () => {
	const a = { category: 'Gastos', subcategory: 'B' }
	const b = { category: 'Ingresos', subcategory: 'A' }
	assert.ok(compareExpenseClassificationPair(a, b) < 0)
})

test('compareExpenseClassificationPair sorts by subcategory when categories match', () => {
	const a = { category: 'Gastos', subcategory: 'A' }
	const b = { category: 'Gastos', subcategory: 'Z' }
	assert.ok(compareExpenseClassificationPair(a, b) < 0)
})

test('compareExpenseClassificationPair returns 0 for identical pairs', () => {
	const a = { category: 'Gastos', subcategory: 'Otros' }
	assert.equal(compareExpenseClassificationPair(a, { ...a }), 0)
})

// cashEntryIncludedInSummary
test('cashEntryIncludedInSummary includes normal item in cashflow mode', () => {
	assert.equal(cashEntryIncludedInSummary({ cashflow_effect: true }, 'cashflow'), true)
})

test('cashEntryIncludedInSummary excludes item with cashflow_effect false', () => {
	assert.equal(cashEntryIncludedInSummary({ cashflow_effect: false }, 'cashflow'), false)
})

test('cashEntryIncludedInSummary excludes debt_origin in cashflow mode', () => {
	assert.equal(cashEntryIncludedInSummary({ source_kind: 'debt_origin' }, 'cashflow'), false)
})

test('cashEntryIncludedInSummary includes normal item in economic mode', () => {
	assert.equal(cashEntryIncludedInSummary({ economic_effect: true }, 'economic'), true)
})

test('cashEntryIncludedInSummary excludes item with economic_effect false', () => {
	assert.equal(cashEntryIncludedInSummary({ economic_effect: false }, 'economic'), false)
})

test('cashEntryIncludedInSummary excludes debt_payment in economic mode', () => {
	assert.equal(cashEntryIncludedInSummary({ source_kind: 'debt_payment' }, 'economic'), false)
})

// cashEntrySignedAmount
test('cashEntrySignedAmount returns positive amount for income', () => {
	assert.equal(cashEntrySignedAmount({ movement_type: 'income', amount: '100' }), 100)
})

test('cashEntrySignedAmount returns negative amount for expense', () => {
	assert.equal(cashEntrySignedAmount({ movement_type: 'expense', amount: '100' }), -100)
})

// cashSummaryLineLabel
test('cashSummaryLineLabel returns subcategory when present', () => {
	assert.equal(cashSummaryLineLabel({ subcategory: 'Sueldos', category: 'Gastos' }), 'Sueldos')
})

test('cashSummaryLineLabel falls back to category', () => {
	assert.equal(cashSummaryLineLabel({ subcategory: '', category: 'Gastos' }), 'Gastos')
})

test('cashSummaryLineLabel falls back to source kind label', () => {
	assert.equal(cashSummaryLineLabel({ subcategory: '', category: '', source_kind: 'payment' }), 'Cobro')
})

// cashSummaryGroupKey
test('cashSummaryGroupKey returns adjustments for adjustment source_kind', () => {
	assert.equal(cashSummaryGroupKey({ source_kind: 'adjustment', movement_type: 'expense' }), 'adjustments')
})

test('cashSummaryGroupKey returns adjustments for ajustes category', () => {
	assert.equal(cashSummaryGroupKey({ category: 'Ajustes', movement_type: 'expense' }), 'adjustments')
})

test('cashSummaryGroupKey returns charges for regular income', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'income', category: 'servicios' }), 'charges')
})

test('cashSummaryGroupKey returns partner_contributions for income with aporte keyword', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'income', category: 'aporte socio' }), 'partner_contributions')
})

test('cashSummaryGroupKey returns partner_contributions for inversion income', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'income', category: 'inversion' }), 'partner_contributions')
})

test('cashSummaryGroupKey returns partner_contributions for prestamo income', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'income', category: 'prestamo' }), 'partner_contributions')
})

test('cashSummaryGroupKey returns partner_withdrawals for retiro expense', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'expense', category: 'retiro', subcategory: '' }), 'partner_withdrawals')
})

test('cashSummaryGroupKey returns investments for inversion expense', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'expense', category: 'inversion', subcategory: '' }), 'investments')
})

test('cashSummaryGroupKey returns payments as default for expense', () => {
	assert.equal(cashSummaryGroupKey({ movement_type: 'expense', category: 'compras', subcategory: '' }), 'payments')
})

// buildCashFlowSummary
test('buildCashFlowSummary returns correct structure for empty list', () => {
	const summary = buildCashFlowSummary([], 'cashflow')
	assert.equal(summary.groups.length, 6)
	assert.equal(summary.commercialBalance, 0)
	assert.equal(summary.financialBalance, 0)
	assert.equal(summary.netFlow, 0)
})

test('buildCashFlowSummary accumulates income entries correctly', () => {
	const entries = [
		{ movement_type: 'income', category: 'servicios', subcategory: 'lavado', amount: '500', cashflow_effect: true },
		{ movement_type: 'income', category: 'servicios', subcategory: 'lavado', amount: '300', cashflow_effect: true },
	]
	const summary = buildCashFlowSummary(entries, 'cashflow')
	const charges = summary.groups.find(g => g.key === 'charges')
	assert.equal(charges.amount, 800)
	assert.equal(charges.count, 2)
})

test('buildCashFlowSummary excludes entries not in cashflow', () => {
	const entries = [
		{ movement_type: 'income', category: 'servicios', amount: '500', cashflow_effect: false },
	]
	const summary = buildCashFlowSummary(entries, 'cashflow')
	assert.equal(summary.netFlow, 0)
})

test('buildCashFlowSummary computes net flow correctly', () => {
	const entries = [
		{ movement_type: 'income', category: 'servicios', amount: '1000', cashflow_effect: true },
		{ movement_type: 'expense', category: 'compras', amount: '400', cashflow_effect: true },
	]
	const summary = buildCashFlowSummary(entries, 'cashflow')
	assert.equal(summary.netFlow, 600)
})

test('buildCashFlowSummary groups lines by subcategory and computes percent', () => {
	const entries = [
		{ movement_type: 'income', category: 'servicios', subcategory: 'lavado', amount: '600', cashflow_effect: true },
		{ movement_type: 'income', category: 'servicios', subcategory: 'pulido', amount: '400', cashflow_effect: true },
	]
	const summary = buildCashFlowSummary(entries, 'cashflow')
	const charges = summary.groups.find(g => g.key === 'charges')
	assert.equal(charges.lines.length, 2)
	const lavado = charges.lines.find(l => l.label === 'lavado')
	assert.ok(Math.abs(lavado.percent - 0.6) < 0.001)
})

// normalizedCashFilterAmount
test('normalizedCashFilterAmount returns null for empty string', () => {
	assert.equal(normalizedCashFilterAmount(''), null)
	assert.equal(normalizedCashFilterAmount(null), null)
})

test('normalizedCashFilterAmount parses integer', () => {
	assert.equal(normalizedCashFilterAmount('500'), 500)
})

test('normalizedCashFilterAmount parses amount with comma', () => {
	assert.equal(normalizedCashFilterAmount('1,5'), 1.5)
})

test('normalizedCashFilterAmount returns null for non-numeric string', () => {
	assert.equal(normalizedCashFilterAmount('abc'), null)
})

// cashEntryMatchesFilters
test('cashEntryMatchesFilters returns true for empty filters', () => {
	const item = { movement_type: 'income', amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, {}), true)
})

test('cashEntryMatchesFilters filters by movementType', () => {
	const item = { movement_type: 'income', amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { movementType: 'expense' }), false)
	assert.equal(cashEntryMatchesFilters(item, { movementType: 'income' }), true)
})

test('cashEntryMatchesFilters filters by sourceKind', () => {
	const item = { source_kind: 'payment', amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { sourceKind: 'manual' }), false)
	assert.equal(cashEntryMatchesFilters(item, { sourceKind: 'payment' }), true)
})

test('cashEntryMatchesFilters filters by category', () => {
	const item = { category: 'servicios', amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { category: 'otros' }), false)
	assert.equal(cashEntryMatchesFilters(item, { category: 'servicios' }), true)
})

test('cashEntryMatchesFilters filters by subcategory', () => {
	const item = { subcategory: 'lavado', amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { subcategory: 'pulido' }), false)
	assert.equal(cashEntryMatchesFilters(item, { subcategory: 'lavado' }), true)
})

test('cashEntryMatchesFilters filters by cashflow effect', () => {
	const item = { cashflow_effect: false, amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { effect: 'cashflow' }), false)
})

test('cashEntryMatchesFilters filters economic_only effect', () => {
	const item = { cashflow_effect: true, amount: '100' }
	assert.equal(cashEntryMatchesFilters(item, { effect: 'economic_only' }), false)
})

test('cashEntryMatchesFilters filters by amountMin', () => {
	const item = { amount: '50' }
	assert.equal(cashEntryMatchesFilters(item, { amountMin: '100' }), false)
	assert.equal(cashEntryMatchesFilters(item, { amountMin: '30' }), true)
})

test('cashEntryMatchesFilters filters by amountMax', () => {
	const item = { amount: '200' }
	assert.equal(cashEntryMatchesFilters(item, { amountMax: '100' }), false)
	assert.equal(cashEntryMatchesFilters(item, { amountMax: '300' }), true)
})

test('cashEntryMatchesFilters matches text query against title and description', () => {
	const item = {
		source_kind: 'payment',
		source_label: 'Cobro lavado premium',
		category: 'ingresos',
		amount: '500',
	}
	assert.equal(cashEntryMatchesFilters(item, { query: 'lavado' }), true)
	assert.equal(cashEntryMatchesFilters(item, { query: 'XYZ_NO_MATCH' }), false)
})

// hasCashFilters
test('hasCashFilters returns false for empty filters', () => {
	assert.equal(hasCashFilters({}), false)
	assert.equal(hasCashFilters({ movementType: '', category: '' }), false)
})

test('hasCashFilters returns true when any filter has a value', () => {
	assert.equal(hasCashFilters({ movementType: 'income' }), true)
})
