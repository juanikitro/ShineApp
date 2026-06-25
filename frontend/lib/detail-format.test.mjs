import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildDetailFields,
	detailFieldLabel,
	detailStatusLabel,
	formatDetailValue,
	isHiddenDetailField,
} from './detail-format'

// detailFieldLabel
test('detailFieldLabel uses the spanish dictionary when known', () => {
	assert.equal(detailFieldLabel('payment_method'), 'Metodo de pago')
	assert.equal(detailFieldLabel('occurred_at'), 'Fecha')
})

test('detailFieldLabel humanizes unknown keys and strips _id suffix', () => {
	assert.equal(detailFieldLabel('warranty_months'), 'Warranty months')
	assert.equal(detailFieldLabel('owner_id'), 'Owner')
})

test('detailFieldLabel falls back to the raw key when it cleans to empty', () => {
	assert.equal(detailFieldLabel('_id'), '_id')
})

// isHiddenDetailField
test('isHiddenDetailField hides internal, foreign-key and empty fields', () => {
	assert.equal(isHiddenDetailField('_private', 'x'), true)
	assert.equal(isHiddenDetailField('id', 1), true)
	assert.equal(isHiddenDetailField('customer', 5), true)
	assert.equal(isHiddenDetailField('vehicle_id', 9), true)
	assert.equal(isHiddenDetailField('document_url', 'http://x'), true)
	assert.equal(isHiddenDetailField('notes', ''), true)
	assert.equal(isHiddenDetailField('notes', null), true)
	assert.equal(isHiddenDetailField('notes', undefined), true)
})

test('isHiddenDetailField keeps legible fields', () => {
	assert.equal(isHiddenDetailField('name', 'Ana'), false)
	assert.equal(isHiddenDetailField('amount', 0), false)
})

test('isHiddenDetailField hides the decorative icon and the redundant status label', () => {
	assert.equal(isHiddenDetailField('service_icon', '🚗'), true)
	assert.equal(isHiddenDetailField('status_label', 'Confirmada'), true)
})

// detailStatusLabel
test('detailStatusLabel translates known statuses and falls back to the raw value', () => {
	assert.equal(detailStatusLabel('confirmed'), 'Confirmada')
	assert.equal(detailStatusLabel('IN_PROGRESS'), 'En proceso')
	assert.equal(detailStatusLabel('weird_state'), 'weird_state')
	assert.equal(detailStatusLabel(''), 'Sin dato')
	assert.equal(detailStatusLabel(null), 'Sin dato')
})

// formatDetailValue
test('formatDetailValue handles empty, boolean and array values', () => {
	assert.equal(formatDetailValue('notes', ''), 'Sin dato')
	assert.equal(formatDetailValue('active', true), 'Si')
	assert.equal(formatDetailValue('active', false), 'No')
	assert.equal(formatDetailValue('tags', ['vip']), '1 item')
	assert.equal(formatDetailValue('tags', ['a', 'b']), '2 items')
	assert.equal(formatDetailValue('tags', []), 'Sin items')
})

test('formatDetailValue handles objects with and without a readable name', () => {
	assert.equal(formatDetailValue('owner', { name: 'Ana' }), 'Ana')
	assert.equal(formatDetailValue('owner', { label: 'Equipo' }), 'Equipo')
	assert.equal(formatDetailValue('owner', { visits: 2 }), 'Ver mas')
})

test('formatDetailValue formats money fields with numeric values', () => {
	const formatted = formatDetailValue('total_amount', 1500)
	assert.ok(formatted.includes('1.500'))
	// Una clave de dinero con valor no numerico cae al string crudo.
	assert.equal(formatDetailValue('amount', 'N/A'), 'N/A')
})

test('formatDetailValue formats date and datetime fields', () => {
	const dateTime = formatDetailValue('occurred_at', '2026-06-18T12:30:00')
	assert.notEqual(dateTime, 'Sin dato')
	assert.equal(typeof dateTime, 'string')
	const date = formatDetailValue('due_date', '2026-06-18')
	assert.notEqual(date, 'Sin dato')
})

test('formatDetailValue returns the raw string for plain values', () => {
	assert.equal(formatDetailValue('color', 'Rojo'), 'Rojo')
})

// buildDetailFields
test('buildDetailFields drops noise and formats the remaining fields', () => {
	const fields = buildDetailFields({
		id: 7,
		name: 'Ana',
		customer: 3,
		total_amount: 1500,
		notes: '',
		active: true,
	})
	const keys = fields.map((field) => field.key)
	assert.deepEqual(keys, ['name', 'total_amount', 'active'])
	const byKey = Object.fromEntries(fields.map((f) => [f.key, f.value]))
	assert.equal(byKey.name, 'Ana')
	assert.equal(byKey.active, 'Si')
	assert.ok(byKey.total_amount.includes('1.500'))
})

test('buildDetailFields exposes the raw status and prefers the server status label', () => {
	const [field] = buildDetailFields({ status: 'confirmed' })
	assert.equal(field.key, 'status')
	assert.equal(field.label, 'Estado')
	assert.equal(field.value, 'Confirmada')
	assert.equal(field.status, 'confirmed')

	const [labeled] = buildDetailFields({
		status: 'confirmed',
		status_label: 'Confirmada a mano',
	})
	assert.equal(labeled.value, 'Confirmada a mano')
	assert.equal(labeled.status, 'confirmed')
})
