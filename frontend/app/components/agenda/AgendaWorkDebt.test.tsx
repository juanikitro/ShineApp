import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import type { AnyRecord } from '@/lib/page-support'

import {
	AgendaWorkDebt,
	createAgendaWorkDebtRenderer,
} from './AgendaWorkDebt'

afterEach(cleanup)

function renderDebt(overrides = {}) {
	const props = {
		workOrder: { balance_due: 6000 } as AnyRecord,
		materialUsage: { label: 'Lija: 2 u', extra: ' +1' },
		...overrides,
	} as Parameters<typeof AgendaWorkDebt>[0]

	return render(<AgendaWorkDebt {...props} />)
}

test('AgendaWorkDebt preserves debt and material-usage presentation', () => {
	const { container } = renderDebt()
	const debt = container.querySelector<HTMLElement>(
		'.agenda-work-debt-main strong',
	)
	const materials = screen.getByText('Lija: 2 u +1')

	assert.ok(container.querySelector('.agenda-work-debt'))
	assert.ok(debt?.classList.contains('debt'))
	assert.equal(materials.getAttribute('title'), 'Lija: 2 u +1')
	assert.ok(materials.classList.contains('agenda-work-materials'))
})

test('AgendaWorkDebt keeps zero debt and absent material usage unadorned', () => {
	const { container } = renderDebt({
		workOrder: { balance_due: 0 },
		materialUsage: null,
	})
	const debt = container.querySelector<HTMLElement>(
		'.agenda-work-debt-main strong',
	)

	assert.equal(debt?.classList.contains('debt'), false)
	assert.equal(container.querySelector('.agenda-work-materials'), null)
})

test('createAgendaWorkDebtRenderer preserves the economy guard before resolving material usage', () => {
	let materialUsageCalls = 0
	const withoutEconomy = createAgendaWorkDebtRenderer({
		canViewEconomy: false,
		materialUsageForWorkOrder: () => {
			materialUsageCalls += 1
			return { label: 'No debe verse', extra: '' }
		},
	})

	assert.equal(withoutEconomy({ balance_due: 10 }), null)
	assert.equal(materialUsageCalls, 0)

	const withEconomy = createAgendaWorkDebtRenderer({
		canViewEconomy: true,
		materialUsageForWorkOrder: () => {
			materialUsageCalls += 1
			return { label: 'Paño: 1 u', extra: '' }
		},
	})
	render(withEconomy({ balance_due: 10 }))

	assert.equal(materialUsageCalls, 1)
	assert.ok(screen.getByText('Paño: 1 u'))
})
