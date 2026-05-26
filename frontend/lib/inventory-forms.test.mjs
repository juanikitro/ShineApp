import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	blankSupplierForm,
	blankStockMovementLine,
	blankStockMovementForm,
} from './inventory-forms'

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
