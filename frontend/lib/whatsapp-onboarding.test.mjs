import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	buildWhatsAppAutomationRuleUpdates,
	buildWhatsAppDemoBootstrapPlan,
	buildWhatsAppOnboardingReadiness,
	whatsappDemoTemplates,
	whatsAppConfigIssues,
	whatsAppTemplateIssues,
	whatsAppRuleIssues,
} from './whatsapp-onboarding'

const automationRules = whatsappDemoTemplates.map((template, index) => ({
	id: index + 1,
	event: template.key,
	dispatch: 'manual',
	template: null,
}))

test('builds a demo bootstrap plan for an empty WhatsApp setup', () => {
	const plan = buildWhatsAppDemoBootstrapPlan({
		config: {},
		templates: [],
		automationRules,
	})

	assert.deepEqual(plan.configPatch, {
		mode: 'paid',
		provider: 'fake',
		is_enabled: true,
		phone_number_display: '+54 9 11 5555-0100',
		default_country_code: '+54',
	})
	assert.deepEqual(
		plan.templatesToCreate.map((template) => template.key),
		['reservation_confirmed', 'work_ready', 'work_delivered', 'quote_sent'],
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
		plan.templatesToCreate.some((template) => template.key === 'reservation_confirmed'),
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
			{ id: 1, event: 'reservation_confirmed', dispatch: 'manual', template: 99 },
			{ id: 2, event: 'work_ready', dispatch: 'manual', template: null },
			{ id: 3, event: 'work_delivered', dispatch: 'manual', template: null },
		],
	})

	assert.deepEqual(updates, [
		{ id: 1, patch: { dispatch: 'automatic' } },
		{ id: 2, patch: { dispatch: 'automatic', template: 21 } },
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
		dispatch: template.key === 'quote_sent' ? 'manual' : 'automatic',
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
	assert.equal(readiness.totalCount, 3)
	assert.equal(readiness.historyReady, false)
})

test('demo bootstrap explicitly leaves free mode without credentials', () => {
	const plan = buildWhatsAppDemoBootstrapPlan({ config: { mode: 'free' } })
	assert.equal(plan.configPatch.mode, 'paid')
	assert.equal(plan.configPatch.provider, 'fake')
	assert.equal('access_token' in plan.configPatch, false)
})

test('config checks distinguish free, fake, Meta fallback uncertainty and Twilio', () => {
	assert.deepEqual(whatsAppConfigIssues({ mode: 'free' }), [])
	assert.deepEqual(whatsAppConfigIssues({ provider: 'fake', is_enabled: true }), [])
	assert.equal(whatsAppConfigIssues({ provider: 'fake' }).length, 1)
	assert.equal(whatsAppConfigIssues({ provider: 'unknown' }).length, 2)
	assert.match(whatsAppConfigIssues({ provider: 'meta', is_enabled: true })[0], /global de Meta/)
	assert.deepEqual(
		whatsAppConfigIssues({
			provider: 'meta',
			is_enabled: 'true',
			phone_number_id: '123',
			has_access_token: true,
		}),
		[],
	)
	assert.equal(whatsAppConfigIssues({ provider: 'twilio', is_enabled: 1 }).length, 3)
	assert.deepEqual(
		whatsAppConfigIssues({
			provider: 'twilio',
			is_enabled: true,
			business_account_id: 'AC_TEST',
			phone_number_id: '+15555550100',
			access_token: 'synthetic-token',
		}),
		[],
	)
	assert.equal(
		whatsAppConfigIssues({
			provider: 'twilio',
			is_enabled: true,
			business_account_id: ' ',
			phone_number_id: null,
			access_token: '',
			has_access_token: false,
		}).length,
		3,
	)
})

test('free readiness ignores API credentials and bindings, labels history by mode', () => {
	const readiness = buildWhatsAppOnboardingReadiness({
		config: { mode: 'free', provider: 'fake', is_enabled: false },
		templates: whatsappDemoTemplates,
		messages: [
			{ provider: 'fake', status: 'sent' },
			{ provider: 'wame', status: 'failed' },
		],
	})
	assert.equal(readiness.ready, true)
	assert.equal(readiness.percent, 100)
	assert.equal(readiness.isDemoMode, false)
	assert.equal(readiness.modeLabel, 'Gratis (wa.me)')
	assert.equal(readiness.historyReady, false)
	assert.equal(
		buildWhatsAppOnboardingReadiness({
			config: { mode: 'free' },
			messages: [{ provider: 'wame', status: 'sent' }],
		}).historyReady,
		true,
	)
})

test('readiness handles absent arrays, disabled/deleted messages and failed history', () => {
	assert.equal(buildWhatsAppOnboardingReadiness({}).ready, false)
	assert.equal(
		buildWhatsAppOnboardingReadiness({
			config: null,
			templates: null,
			automationRules: null,
			messages: null,
		}).percent,
		0,
	)
	const readiness = buildWhatsAppOnboardingReadiness({
		config: { provider: 'twilio', is_enabled: true },
		templates: whatsappDemoTemplates.map((item) => ({ ...item, is_active: false })),
		messages: [
			{ provider: 'meta', status: 'read' },
			{ provider: 'twilio', status: 'failed' },
		],
	})
	assert.equal(readiness.modeLabel, 'API Twilio')
	assert.equal(readiness.templatesReady, false)
	assert.equal(readiness.historyReady, false)
	assert.equal(
		buildWhatsAppOnboardingReadiness({
			config: { mode: 'free' },
			templates: whatsappDemoTemplates.map((item) => ({ ...item, deleted_at: 'date' })),
		}).templatesReady,
		false,
	)
})

test('templates validate missing fields, variables and custom manual schemas', () => {
	assert.equal(whatsAppTemplateIssues({}, {}).length, 2)
	const template = { ...whatsappDemoTemplates[0] }
	assert.deepEqual(whatsAppTemplateIssues(template, { mode: 'free' }), [])
	assert.equal(
		whatsAppTemplateIssues(
			{ ...template, variables_schema: 'cliente, cliente, desconocida' },
			{ mode: 'free' },
		).length,
		1,
	)
	assert.equal(whatsAppTemplateIssues({ ...template, variables_schema: [0] }, {}).length, 1)
	assert.equal(
		whatsAppTemplateIssues({ ...template, body_preview: '{desconocida}' }, { mode: 'free' }).length,
		1,
	)
	assert.deepEqual(
		whatsAppTemplateIssues(
			{ ...template, key: 'work_ready', body_preview: '{estado}', variables_schema: ['estado'] },
			{ mode: 'paid' },
		),
		[],
	)
	assert.equal(
		whatsAppTemplateIssues(
			{ ...template, key: 'work_ready', body_preview: '{estado}', variables_schema: ['estado'] },
			{ mode: 'free' },
		).length,
		2,
	)
	assert.deepEqual(
		whatsAppTemplateIssues(
			{ ...template, key: 'manual', body_preview: '{custom}', variables_schema: ['custom'] },
			{ mode: 'paid' },
		),
		[],
	)
	assert.equal(
		whatsAppTemplateIssues(
			{ ...template, key: 'manual', body_preview: '{custom}', variables_schema: null },
			{},
		).length,
		0,
	)
})

test('rules reject missing inactive mismatched or invalid templates and automatic quotes', () => {
	const template = { ...whatsappDemoTemplates[0], id: 1 }
	const rule = { event: template.key, template: 1, dispatch: 'automatic' }
	assert.deepEqual(whatsAppRuleIssues(rule, [template], {}), [])
	assert.deepEqual(whatsAppRuleIssues(rule, [], { mode: 'free' }), [])
	for (const candidates of [
		[],
		[{ ...template, is_active: false }],
		[{ ...template, key: 'quote_sent' }],
		[{ ...template, language: '' }],
	]) {
		assert.equal(whatsAppRuleIssues(rule, candidates, {}).length, 1)
	}
	assert.match(
		whatsAppRuleIssues({ event: 'quote_sent', dispatch: 'automatic' }, [], {})[1],
		/manual/,
	)
	const readiness = buildWhatsAppOnboardingReadiness({
		config: { provider: 'meta' },
		templates: [template],
		automationRules: [rule],
	})
	assert.equal(readiness.modeLabel, 'API Meta')
	assert.equal(readiness.ruleIssues.length, 3)
})

test('paid templates retain arbitrary provider variables and optional preview for every event', () => {
	for (const template of whatsappDemoTemplates) {
		assert.deepEqual(
			whatsAppTemplateIssues(
				{
					...template,
					body_preview: '',
					variables_schema: ['provider_custom', 'estado', 'vehiculo'],
				},
				{ mode: 'paid' },
			),
			[],
		)
	}
})
