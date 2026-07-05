import assert from 'node:assert/strict'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { TrialLifecycleBanner } from './TrialLifecycleBanner'

afterEach(() => {
	cleanup()
	vi.unstubAllEnvs()
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

test('TrialLifecycleBanner shows ending-soon state and opens configured upgrade URL', async () => {
	const user = userEvent.setup()
	const onOpenUpgrade = vi.fn()
	vi.stubEnv('NEXT_PUBLIC_TRIAL_UPGRADE_URL', 'https://wa.me/5491111111111')

	render(<TrialLifecycleBanner currentUser={trialUser()} onOpenUpgrade={onOpenUpgrade} />)

	assert.ok(screen.getByText('Por vencer'))
	assert.ok(screen.getByText('La prueba vence en 2 dias'))

	await user.click(screen.getByRole('button', { name: /Coordinar continuidad/ }))
	assert.deepEqual(onOpenUpgrade.mock.calls[0], ['https://wa.me/5491111111111'])
})

test('TrialLifecycleBanner copies a manual continuation message without upgrade URL', async () => {
	const user = userEvent.setup()
	const writeText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText },
		configurable: true,
	})

	render(<TrialLifecycleBanner currentUser={trialUser()} />)

	await user.click(screen.getByRole('button', { name: /Copiar pedido/ }))

	await waitFor(() => {
		assert.equal(writeText.mock.calls.length, 1)
	})
	assert.ok(writeText.mock.calls[0][0].includes('QA Detailing'))
	assert.ok(screen.getByText('Mensaje copiado'))
})

test('TrialLifecycleBanner does not render for premium users', () => {
	const { container } = render(
		<TrialLifecycleBanner currentUser={trialUser({ subscription_type: 'premium' })} />,
	)

	assert.equal(container.textContent, '')
})
