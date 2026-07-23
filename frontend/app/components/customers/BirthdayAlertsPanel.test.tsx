import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { BirthdayAlertsPanel, BirthdayBadge } from './BirthdayAlertsPanel'

afterEach(cleanup)

function renderAlerts(overrides = {}) {
	const props = {
		alerts: [
			{
				id: 7,
				name: 'Ana Perez',
				phone: '',
				birthday_label: '21/07',
				days_until_birthday: 0,
				has_birthday_alert: true,
			},
		],
		alertDays: 3,
		recordClass: (_kind: string, id: string | number) =>
			`record customer-${id}`,
		detailRecordProps: () => ({ 'data-detail': 'customer' }),
		...overrides,
	} as Parameters<typeof BirthdayAlertsPanel>[0]

	return render(<BirthdayAlertsPanel {...props} />)
}

test('BirthdayAlertsPanel preserves alert card text, classes and detail props', () => {
	const { container } = renderAlerts()
	const badge = container.querySelector<HTMLElement>('.birthday-badge')
	const card = container.querySelector<HTMLElement>('.record')

	assert.ok(screen.getByRole('heading', { name: 'Cumpleanos proximos' }))
	assert.ok(screen.getByText('3 dias'))
	assert.ok(screen.getByText('Ana Perez'))
	assert.ok(screen.getByText('Sin telefono'))
	assert.ok(screen.getByText('Cumple hoy (21/07)'))
	assert.ok(badge?.classList.contains('birthday-badge--alert'))
	assert.equal(card?.getAttribute('data-detail'), 'customer')
})

test('BirthdayAlertsPanel preserves the empty birthday message', () => {
	renderAlerts({ alerts: [], alertDays: 5 })

	assert.ok(screen.getByText('5 dias'))
	assert.ok(screen.getByText('Sin cumpleanos en los proximos dias.'))
	assert.ok(
		screen.getByText(
				'La alerta vuelve a aparecer aca cuando un cliente entre en la ventana configurada.',
			),
	)
})

test('BirthdayBadge stays absent without a birthday label', () => {
	const { container } = render(<BirthdayBadge customer={{ name: 'Ana' }} />)

	assert.equal(container.innerHTML, '')
})
