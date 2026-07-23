import assert from 'node:assert/strict'
import { cleanup, render } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import type { AgendaReservationAction } from '@/lib/reservation-actions'

import { AgendaQuickActionIcon } from './AgendaQuickActionIcon'

afterEach(cleanup)

function renderedIcon(action: AgendaReservationAction) {
	const { container } = render(<AgendaQuickActionIcon action={action} />)
	return container.querySelector('svg')
}

test('AgendaQuickActionIcon preserves the charge icon', () => {
	const icon = renderedIcon({
		kind: 'work-order-charge',
		label: 'Cobrar',
		priority: 'high',
		variant: 'filled',
	})

	assert.ok(icon?.classList.contains('lucide-credit-card'))
	assert.equal(icon?.getAttribute('width'), '15')
})

test('AgendaQuickActionIcon preserves the destructive reservation icon', () => {
	const icon = renderedIcon({
		action: 'cancel',
		kind: 'reservation',
		label: 'Cancelar',
		priority: 'low',
		variant: 'icon-danger',
	})

	assert.ok(icon?.classList.contains('lucide-trash2'))
	assert.equal(icon?.getAttribute('height'), '15')
})

test('AgendaQuickActionIcon preserves the default progress icon', () => {
	const icon = renderedIcon({
		kind: 'work-order-status',
		label: 'Marcar listo',
		priority: 'high',
		status: 'ready',
		variant: 'filled',
	})

	assert.ok(icon?.classList.contains('lucide-circle-check'))
})
