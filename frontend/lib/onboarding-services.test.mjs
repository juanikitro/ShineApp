import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildStarterServicesPlan,
	starterServicesForBusinessType,
} from './onboarding-services'

const coreSectors = [
	{ id: 1, key: 'lavadero', name: 'Lavadero', is_active: true },
	{ id: 2, key: 'detailing', name: 'Detailing', is_active: true },
	{ id: 3, key: 'lubricentro', name: 'Lubricentro', is_active: true },
]

test.each([
	[
		'lavadero',
		['Lavado exterior express', 'Lavado completo', 'Lavado premium'],
		['1', '1', '1'],
	],
	[
		'detailing',
		['Detailing interior', 'Pulido one step', 'Tratamiento cerámico'],
		['2', '2', '2'],
	],
	[
		'lubricentro',
		[
			'Cambio de aceite y filtro',
			'Cambio de aceite sintético',
			'Revisión de fluidos',
		],
		['3', '3', '3'],
	],
])('builds only the three %s drafts in its selected sector', (businessType, names, sectors) => {
	const plan = buildStarterServicesPlan({
		businessType,
		services: [],
		sectors: coreSectors,
	})

	assert.equal(plan.requiresBusinessType, false)
	assert.equal(plan.templates.length, 3)
	assert.deepEqual(plan.drafts.map((draft) => draft.name), names)
	assert.deepEqual(plan.drafts.map((draft) => draft.sector), sectors)
})

test('does not offer starter drafts without a selected business type', () => {
	const plan = buildStarterServicesPlan({ services: [], sectors: coreSectors })

	assert.equal(plan.requiresBusinessType, true)
	assert.deepEqual(plan.templates, [])
	assert.deepEqual(plan.drafts, [])
})

test('skips existing starter services by normalized name within the selected pack', () => {
	const plan = buildStarterServicesPlan({
		businessType: 'detailing',
		sectors: coreSectors,
		services: [{ id: 10, name: ' pulido   one step ' }],
	})

	assert.deepEqual(
		plan.existingTemplates.map((template) => template.id),
		['pulido-one-step'],
	)
	assert.deepEqual(
		plan.drafts.map((draft) => draft.templateId),
		['detailing-interior', 'tratamiento-ceramico'],
	)
})

test('blocks the selected pack when its sector is not available', () => {
	const plan = buildStarterServicesPlan({
		businessType: 'lubricentro',
		services: [],
		sectors: coreSectors.filter((sector) => sector.key !== 'lubricentro'),
	})

	assert.deepEqual(
		plan.blockedTemplates.map((template) => template.id),
		starterServicesForBusinessType('lubricentro').map((template) => template.id),
	)
	assert.deepEqual(plan.drafts, [])
})
