import assert from 'node:assert/strict'
import { test } from 'vitest'

import { serviceDisplayName } from './service-display'

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
