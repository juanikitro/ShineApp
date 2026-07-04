import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildWhatsAppAutomationRuleUpdates,
	buildWhatsAppDemoBootstrapPlan,
	buildWhatsAppOnboardingReadiness,
	whatsappDemoTemplates,
} from './whatsapp-onboarding'

const automationRules = whatsappDemoTemplates.map((template, index) => ({
	id: index + 1,
	event: template.key,
	enabled: false,
	template: null,
}))

test('builds a demo bootstrap plan for an empty WhatsApp setup', () => {
	const plan = buildWhatsAppDemoBootstrapPlan({
		config: {},
		templates: [],
		automationRules,
	})

	assert.deepEqual(plan.configPatch, {
		provider: 'fake',
		is_enabled: true,
		phone_number_display: '+54 9 11 5555-0100',
		default_country_code: '+54',
	})
	assert.deepEqual(
		plan.templatesToCreate.map((template) => template.key),
		[
			'reservation_confirmed',
			'work_ready',
			'work_delivered',
			'quote_sent',
		],
	)
})

test('reuses active templates for the same event and language', () => {
	const existing = [
		{
			id: 20,
			key: 'reservation_confirmed',
			language: 'es_AR',
			provider_template_name: 'cliente_template_meta',
			is_active: true,
		},
	]
	const plan = buildWhatsAppDemoBootstrapPlan({
		config: { phone_number_display: '+54 9 11 2222-3333' },
		templates: existing,
		automationRules,
	})

	assert.equal(plan.configPatch.phone_number_display, '+54 9 11 2222-3333')
	assert.deepEqual(
		plan.existingTemplates.map((template) => template.id),
		[20],
	)
	assert.equal(
		plan.templatesToCreate.some(
			(template) => template.key === 'reservation_confirmed',
		),
		false,
	)
})

test('builds rule updates without replacing an assigned template', () => {
	const templates = [
		{ id: 20, key: 'reservation_confirmed', language: 'es_AR', is_active: true },
		{ id: 21, key: 'work_ready', language: 'es_AR', is_active: true },
	]

	const updates = buildWhatsAppAutomationRuleUpdates({
		templates,
		automationRules: [
			{ id: 1, event: 'reservation_confirmed', enabled: false, template: 99 },
			{ id: 2, event: 'work_ready', enabled: false, template: null },
			{ id: 3, event: 'work_delivered', enabled: false, template: null },
		],
	})

	assert.deepEqual(updates, [
		{ id: 1, patch: { enabled: true } },
		{ id: 2, patch: { enabled: true, template: 21 } },
	])
})

test('reports WhatsApp onboarding readiness from config templates and rules', () => {
	const templates = whatsappDemoTemplates.map((template, index) => ({
		...template,
		id: index + 10,
	}))
	const rules = templates.map((template, index) => ({
		id: index + 1,
		event: template.key,
		enabled: true,
		template: template.id,
	}))

	const readiness = buildWhatsAppOnboardingReadiness({
		config: {
			provider: 'fake',
			is_enabled: true,
			phone_number_display: '+54 9 11 5555-0100',
		},
		templates,
		automationRules: rules,
		messages: [],
	})

	assert.equal(readiness.ready, true)
	assert.equal(readiness.isDemoMode, true)
	assert.equal(readiness.completedCount, 3)
	assert.equal(readiness.totalCount, 4)
	assert.equal(readiness.historyReady, false)
})
