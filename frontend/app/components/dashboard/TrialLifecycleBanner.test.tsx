import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { TrialLifecycleBanner } from './TrialLifecycleBanner'

afterEach(() => {
	cleanup()
})

function trialUser(overrides = {}) {
	return {
		username: 'owner',
		email: 'owner@example.com',
		subscription_type: 'trial',
		trial_days_remaining: 2,
		trial_ends_at: '2026-07-07',
		business: { name: 'QA Detailing' },
		...overrides,
	}
}

test('TrialLifecycleBanner links to WhatsApp with the encoded continuation message', () => {
	render(<TrialLifecycleBanner currentUser={trialUser()} />)

	assert.ok(screen.getByText('Por vencer'))
	assert.ok(screen.getByText('La prueba vence en 2 dias'))
	const link = screen.getByRole('link', { name: 'Contratar ShineApp' })
	const href = link.getAttribute('href')

	assert.ok(href?.startsWith('https://wa.me/2345455007?text='))
	assert.ok(href?.includes(encodeURIComponent('QA Detailing')))
	assert.equal(link.getAttribute('target'), '_blank')
	assert.equal(link.getAttribute('rel'), 'noopener noreferrer')
	assert.equal(screen.queryByRole('button', { name: /Copiar pedido|Coordinar continuidad/ }), null)
})

test('TrialLifecycleBanner does not render for premium users', () => {
	const { container } = render(
		<TrialLifecycleBanner currentUser={trialUser({ subscription_type: 'premium' })} />,
	)

	assert.equal(container.textContent, '')
})
