import assert from 'node:assert/strict'
import { test } from 'vitest'

import { groupValidationNotice } from './group-validation'

test('groupValidationNotice returns the original validation notice for missing group lines', () => {
	const notice = groupValidationNotice('Revisa el grupo', 'Faltan datos.', [])

	assert.deepEqual(notice, {
		title: 'Revisa el grupo',
		description: 'Faltan datos.',
		fields: [
			{
				path: 'vehicle_lines',
				label: 'Autos',
				message: 'Agrega al menos un auto al grupo.',
			},
		],
	})
})

test('groupValidationNotice remains empty for a valid vehicle line', () => {
	assert.equal(
		groupValidationNotice('Revisa el grupo', 'Faltan datos.', [
			{
				vehicle: '7',
				items: [{ service: '3' }],
			},
		]),
		null,
	)
})
