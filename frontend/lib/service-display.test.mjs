import assert from 'node:assert/strict'
import { test } from 'vitest'

import { serviceDisplayName, serviceSelectOptions } from './service-display'
import { money } from './page-support'

test('prefixes service names with a manual icon when present', () => {
	assert.equal(
		serviceDisplayName({ service_icon: '🧽', service_name: 'Lavado premium' }),
		'🧽 Lavado premium',
	)
	assert.equal(
		serviceDisplayName({ icon: '✨', name: 'Sellado ceramico' }),
		'✨ Sellado ceramico',
	)
})

test('keeps service names clean when icon is blank', () => {
	assert.equal(serviceDisplayName({ service_name: 'Lavado premium' }), 'Lavado premium')
	assert.equal(serviceDisplayName({ icon: '', name: 'Combo interior' }), 'Combo interior')
	assert.equal(serviceDisplayName({}, 'Servicio'), 'Servicio')
})

test('falls back through name, description and custom fallback for incomplete records', () => {
	assert.equal(serviceDisplayName({ name: '  Pulido  ' }), 'Pulido')
	assert.equal(serviceDisplayName({ description: ' Interior completo ' }), 'Interior completo')
	assert.equal(serviceDisplayName(null, 'Sin servicio'), 'Sin servicio')
	assert.equal(serviceDisplayName({ icon: '✨', service_name: '   ' }, 'Premium'), '✨ Premium')
})

test('serviceSelectOptions preserves economy-sensitive metadata', () => {
	const services = [
		{ id: 0, service_icon: '🧽', name: 'Lavado', service_type: 'wash', base_price: 500 },
		{ id: 2, name: 'Pulido', service_type: 'detail', base_price: 0 },
	]
	const labels = { wash: 'Lavado', detail: 'Detailing' }

	assert.deepEqual(serviceSelectOptions(services, false, labels), [
		{ value: '0', label: '🧽 Lavado', meta: 'Lavado' },
		{ value: '2', label: 'Pulido', meta: 'Detailing' },
	])
	assert.deepEqual(serviceSelectOptions(services, true, labels), [
		{ value: '0', label: '🧽 Lavado', meta: `Lavado - ${money(500)}` },
		{ value: '2', label: 'Pulido', meta: `Detailing - ${money(0)}` },
	])
})
