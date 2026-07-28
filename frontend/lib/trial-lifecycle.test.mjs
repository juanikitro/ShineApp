import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildTrialContinuationMessage,
	buildTrialLifecycleState,
} from './trial-lifecycle'

test('buildTrialLifecycleState hides premium accounts', () => {
	assert.equal(buildTrialLifecycleState({ subscription_type: 'premium' }), null)
})

test('buildTrialLifecycleState returns active copy with remaining days', () => {
	const state = buildTrialLifecycleState({
		subscription_type: 'trial',
		trial_days_remaining: 12,
		trial_ends_at: '2026-07-17',
	})

	assert.equal(state?.tone, 'active')
	assert.equal(state?.badge, 'Prueba activa')
	assert.equal(state?.daysRemaining, 12)
	assert.equal(state?.remainingPercent, 86)
	assert.ok(state?.title.includes('12 dias'))
	assert.equal(
		state?.detail,
		'Usa este periodo para completar el alta guiada, cargar el primer turno y validar caja con datos reales del negocio.',
	)
})

test('buildTrialLifecycleState warns when the trial is ending soon', () => {
	const state = buildTrialLifecycleState({
		subscription_type: 'trial',
		trial_days_remaining: 1,
		trial_ends_at: '2026-07-06',
	})

	assert.equal(state?.tone, 'warning')
	assert.equal(state?.badge, 'Por vencer')
	assert.ok(state?.title.includes('1 dia'))
})

test('buildTrialLifecycleState marks expired trials from backend flag', () => {
	const state = buildTrialLifecycleState({
		subscription_type: 'trial',
		trial_expired: true,
		trial_days_remaining: 0,
	})

	assert.equal(state?.tone, 'expired')
	assert.equal(state?.badge, 'Prueba vencida')
	assert.equal(state?.remainingPercent, 0)
})

test('buildTrialLifecycleState can compute remaining days from trial_ends_at', () => {
	const state = buildTrialLifecycleState(
		{
			subscription_type: 'trial',
			trial_ends_at: '2026-07-08T12:00:00Z',
		},
		new Date('2026-07-05T12:00:00Z'),
	)

	assert.equal(state?.daysRemaining, 3)
	assert.equal(state?.tone, 'warning')
})

test('buildTrialContinuationMessage includes business and non-sensitive contact data', () => {
	const state = buildTrialLifecycleState({
		subscription_type: 'trial',
		trial_days_remaining: 2,
		trial_ends_at: '2026-07-07',
	})

	assert.ok(state)
	const message = buildTrialContinuationMessage(
		{
			username: 'owner',
			email: 'owner@example.com',
			business: { name: 'QA Detailing' },
		},
		state,
	)

	assert.ok(message.includes('QA Detailing'))
	assert.ok(message.includes('Por vencer'))
	assert.ok(message.includes('owner@example.com'))
	assert.ok(!message.toLowerCase().includes('password'))
})
