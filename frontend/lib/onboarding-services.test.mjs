import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildStarterServicesPlan,
	starterServiceTemplates,
} from './onboarding-services'

const coreSectors = [
	{ id: 1, key: 'lavadero', name: 'Lavadero', is_active: true },
	{ id: 2, key: 'detailing', name: 'Detailing', is_active: true },
	{ id: 3, key: 'lubricentro', name: 'Lubricentro', is_active: true },
]

test('builds starter service drafts for the three vehicle sectors', () => {
	const plan = buildStarterServicesPlan({ services: [], sectors: coreSectors })

	assert.equal(plan.templates.length, starterServiceTemplates.length)
	assert.equal(plan.missingTemplates.length, 3)
	assert.equal(plan.existingTemplates.length, 0)
	assert.equal(plan.blockedTemplates.length, 0)
	assert.deepEqual(
		plan.drafts.map((draft) => draft.name),
		[
			'Lavado exterior express',
			'Detailing interior',
			'Cambio de aceite y filtro',
		],
	)
	assert.deepEqual(
		plan.drafts.map((draft) => draft.sector),
		['1', '2', '3'],
	)
})

test('skips existing starter services by normalized name', () => {
	const plan = buildStarterServicesPlan({
		sectors: coreSectors,
		services: [
			{ id: 10, name: ' lavado   exterior express ' },
			{ id: 11, name: 'DETAILING INTERIOR' },
		],
	})

	assert.deepEqual(
		plan.existingTemplates.map((template) => template.id),
		['lavado-exterior', 'detailing-interior'],
	)
	assert.deepEqual(
		plan.drafts.map((draft) => draft.templateId),
		['cambio-aceite'],
	)
})

test('blocks drafts when the required sector is not available', () => {
	const plan = buildStarterServicesPlan({
		services: [],
		sectors: coreSectors.filter((sector) => sector.key !== 'lubricentro'),
	})

	assert.deepEqual(
		plan.blockedTemplates.map((template) => template.id),
		['cambio-aceite'],
	)
	assert.deepEqual(
		plan.drafts.map((draft) => draft.templateId),
		['lavado-exterior', 'detailing-interior'],
	)
})
