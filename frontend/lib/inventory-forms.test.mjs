import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	blankSupplierForm,
	buildStockMovementPayload,
	blankStockMovementLine,
	blankStockMovementForm,
	consumptionFormWithMode,
	stockDocumentTypeOptions,
	stockMovementTypeLabels,
	stockMovementTypeOptions,
	stockPaymentMethodOptions,
	stockMovementFormWithAddedLine,
	stockMovementFormWithPatchedLine,
	stockMovementFormWithRemovedLine,
	stockMovementLinesTotal,
} from './inventory-forms'

test('stock movement option constants preserve labels and their derived lookup', () => {
	assert.deepEqual(stockMovementTypeOptions, [
		{ value: 'purchase', label: 'Compra' },
		{ value: 'initial_stock', label: 'Stock inicial' },
		{ value: 'consumption', label: 'Consumo' },
		{ value: 'sale', label: 'Venta' },
	])
	assert.deepEqual(stockMovementTypeLabels, {
		purchase: 'Compra',
		initial_stock: 'Stock inicial',
		consumption: 'Consumo',
		sale: 'Venta',
	})
	assert.equal(stockDocumentTypeOptions[0].label, 'Sin comprobante')
	assert.equal(stockDocumentTypeOptions.at(-1)?.value, 'otro')
	assert.equal(stockPaymentMethodOptions[0].label, 'Efectivo')
	assert.equal(stockPaymentMethodOptions.at(-1)?.value, 'other')
})

// blankSupplierForm
test('blankSupplierForm returns object with all fields as empty strings', () => {
	const form = blankSupplierForm()
	assert.equal(form.name, '')
	assert.equal(form.legal_name, '')
	assert.equal(form.category, '')
	assert.equal(form.tax_condition, '')
	assert.equal(form.website, '')
	assert.equal(form.contact_name, '')
	assert.equal(form.phone, '')
	assert.equal(form.email, '')
	assert.equal(form.tax_id, '')
	assert.equal(form.address, '')
	assert.equal(form.notes, '')
})

test('blankSupplierForm returns a new object each call', () => {
	const a = blankSupplierForm()
	const b = blankSupplierForm()
	a.name = 'modified'
	assert.equal(b.name, '')
})

// blankStockMovementLine
test('blankStockMovementLine returns blank line object', () => {
	const line = blankStockMovementLine()
	assert.equal(line.material, '')
	assert.equal(line.quantity, '')
	assert.equal(line.unit_price, '')
})

// blankStockMovementForm
test('blankStockMovementForm returns default form structure', () => {
	const form = blankStockMovementForm()
	assert.equal(form.movement_type, 'purchase')
	assert.equal(form.supplier, '')
	assert.equal(form.customer, '')
	assert.equal(form.affects_cash, true)
	assert.equal(form.products_received, false)
	assert.equal(form.payment_method, 'cash')
	assert.equal(form.notes, '')
	assert.equal(form.lines.length, 1)
	assert.equal(form.lines[0].material, '')
})

test('blankStockMovementForm uses provided day', () => {
	const form = blankStockMovementForm('2025-03-15')
	assert.equal(form.occurred_on, '2025-03-15')
})

test('stock movement line updates preserve immutable patches and additions', () => {
	const form = {
		movement_type: 'purchase',
		lines: [{ material: '1', quantity: '1', unit_price: '2' }],
	}

	assert.deepEqual(stockMovementFormWithPatchedLine(form, 0, { quantity: 0 }), {
		movement_type: 'purchase',
		lines: [{ material: '1', quantity: 0, unit_price: '2' }],
	})
	assert.deepEqual(stockMovementFormWithAddedLine(form).lines, [
		{ material: '1', quantity: '1', unit_price: '2' },
		{ material: '', quantity: '', unit_price: '' },
	])
	assert.deepEqual(stockMovementFormWithPatchedLine({}, 0, { material: '2' }), {
		lines: [{ material: '2' }],
	})
})

test('stock movement line removal retains a blank row for empty and invalid line sets', () => {
	assert.deepEqual(
		stockMovementFormWithRemovedLine(
			{ lines: [{ material: '1' }, { material: '2' }] },
			0,
		).lines,
		[{ material: '2' }],
	)
	assert.deepEqual(
		stockMovementFormWithRemovedLine({ lines: [{ material: '1' }] }, 0).lines,
		[{ material: '', quantity: '', unit_price: '' }],
	)
	assert.deepEqual(stockMovementFormWithRemovedLine({}, 0).lines, [
		{ material: '', quantity: '', unit_price: '' },
	])
})

test('stockMovementLinesTotal preserves decimal, zero and missing line values', () => {
	assert.equal(
		stockMovementLinesTotal([
			{ quantity: '2', unit_price: '3.5' },
			{ quantity: '', unit_price: '8' },
		]),
		7,
	)
	assert.equal(stockMovementLinesTotal([]), 0)
	assert.equal(stockMovementLinesTotal(null), 0)
})

test('consumptionFormWithMode resets only fields that depend on consumption mode', () => {
	const form = {
		mode: 'direct',
		work_order: 'order-1',
		material: 'material-1',
		open_unit: 'unit-1',
		quantity: '2',
		consumed_at: '2026-07-23',
		observations: 'nota',
	}

	assert.deepEqual(consumptionFormWithMode(form, 'open_unit'), {
		mode: 'open_unit',
		work_order: 'order-1',
		material: '',
		open_unit: '',
		quantity: '',
		consumed_at: '2026-07-23',
		observations: 'nota',
	})
	assert.equal(form.mode, 'direct')
})

test('buildStockMovementPayload preserves purchase fields and valid lines', () => {
	const form = {
		movement_type: 'purchase',
		supplier: '3',
		customer: 'ignored',
		reservation: 'ignored',
		document_type: 'invoice',
		document_number: 'A-1',
		affects_cash: false,
		products_received: false,
		payment_method: 'transfer',
		lines: [
			{ material: '1', quantity: '2', unit_price: '50' },
			{ material: '', quantity: '2', unit_price: '50' },
			{ material: '2', quantity: '0', unit_price: '30' },
		],
	}

	assert.deepEqual(
		buildStockMovementPayload(form, {
			requiresSupplier: true,
			requiresCustomer: false,
			requiresReservation: false,
		}),
		{
			...form,
			supplier: '3',
			customer: null,
			reservation: null,
			document_type: 'invoice',
			document_number: 'A-1',
			affects_cash: false,
			products_received: false,
			payment_method: 'transfer',
			lines: [{ material: '1', quantity: '2', unit_price: '50' }],
		},
	)
})

test('buildStockMovementPayload preserves consumption form-data serialization', () => {
	const documentFile = new File(['document'], 'invoice.pdf', {
		type: 'application/pdf',
	})
	const payload = buildStockMovementPayload(
		{
			movement_type: 'consumption',
			supplier: 'ignored',
			customer: '4',
			reservation: '5',
			document_type: 'ignored',
			document_number: 'ignored',
			lines: [{ material: '1', quantity: '2', unit_price: '' }],
		},
		{
			requiresSupplier: false,
			requiresCustomer: true,
			requiresReservation: true,
			documentFile,
		},
	)

	assert.ok(payload instanceof FormData)
	assert.equal(payload.get('supplier'), null)
	assert.equal(payload.get('customer'), '4')
	assert.equal(payload.get('reservation'), '5')
	assert.equal(payload.get('affects_cash'), 'false')
	assert.equal(payload.get('products_received'), 'true')
	assert.equal(payload.get('payment_method'), 'cash')
	assert.equal(
		payload.get('lines'),
		JSON.stringify([{ material: '1', quantity: '2', unit_price: '0' }]),
	)
	assert.ok(payload.get('document_file'))
})

test('buildStockMovementPayload keeps sale cash effect without a document', () => {
	const payload = buildStockMovementPayload(
		{ movement_type: 'sale', lines: [], affects_cash: false, products_received: false },
		{
			requiresSupplier: false,
			requiresCustomer: false,
			requiresReservation: false,
		},
	)

	assert.equal(payload.affects_cash, true)
	assert.equal(payload.products_received, true)
	assert.equal(payload.payment_method, 'cash')
})
