import { type AnyRecord } from '@/lib/page-support'

export type WhatsAppTemplateSeed = {
	key: string
	provider_template_name: string
	language: string
	category: string
	body_preview: string
	variables_schema: string[]
	is_active: boolean
}

export type WhatsAppRuleUpdate = {
	id: number | string
	patch: {
		enabled?: boolean
		template?: number | string
	}
}

export type WhatsAppBootstrapPlan = {
	configPatch: AnyRecord
	existingTemplates: AnyRecord[]
	templatesToCreate: WhatsAppTemplateSeed[]
	ruleUpdates: WhatsAppRuleUpdate[]
}

export type WhatsAppOnboardingReadiness = {
	completedCount: number
	totalCount: number
	percent: number
	ready: boolean
	isDemoMode: boolean
	configReady: boolean
	templatesReady: boolean
	automationReady: boolean
	historyReady: boolean
}

export const whatsappDemoPhoneDisplay = '+54 9 11 5555-0100'

export const whatsappDemoTemplates: WhatsAppTemplateSeed[] = [
	{
		key: 'reservation_confirmed',
		provider_template_name: 'shine_turno_confirmado_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, tu turno para {servicios} queda confirmado para {fecha_turno} a las {hora_turno}.',
		variables_schema: [
			'cliente',
			'servicios',
			'fecha_turno',
			'hora_turno',
			'vehiculo',
		],
		is_active: true,
	},
	{
		key: 'work_ready',
		provider_template_name: 'shine_trabajo_listo_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, tu {vehiculo} ya esta listo. Servicios realizados: {servicios}.',
		variables_schema: ['cliente', 'vehiculo', 'servicios', 'estado'],
		is_active: true,
	},
	{
		key: 'work_delivered',
		provider_template_name: 'shine_trabajo_entregado_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, registramos la entrega de {vehiculo}. Gracias por elegirnos.',
		variables_schema: ['cliente', 'vehiculo', 'servicios', 'estado'],
		is_active: true,
	},
	{
		key: 'quote_sent',
		provider_template_name: 'shine_cotizacion_enviada_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, te enviamos la cotizacion {codigo} por {total}. Validez: {validez}.',
		variables_schema: ['cliente', 'codigo', 'total', 'validez'],
		is_active: true,
	},
]

function hasText(value: unknown) {
	return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function truthyFlag(value: unknown) {
	return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizedText(value: unknown) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
}

function isActiveTemplate(template: AnyRecord) {
	return template?.is_active !== false && !template?.deleted_at
}

function matchesSeed(template: AnyRecord, seed: WhatsAppTemplateSeed) {
	return (
		String(template.key ?? '') === seed.key &&
		String(template.language ?? '') === seed.language &&
		normalizedText(template.provider_template_name) ===
			normalizedText(seed.provider_template_name)
	)
}

function templateForEvent(templates: AnyRecord[], event: string) {
	const seed = whatsappDemoTemplates.find((item) => item.key === event)
	if (!seed) return null
	return (
		templates.find((template) => matchesSeed(template, seed)) ??
		templates.find(
			(template) =>
				String(template.key ?? '') === event &&
				String(template.language ?? '') === seed.language &&
				isActiveTemplate(template),
		) ??
		null
	)
}

export function buildWhatsAppAutomationRuleUpdates(input: {
	automationRules?: AnyRecord[] | null
	templates?: AnyRecord[] | null
}): WhatsAppRuleUpdate[] {
	const templates = input.templates ?? []
	return (input.automationRules ?? []).flatMap((rule) => {
		if (rule?.id == null) return []
		const event = String(rule.event ?? '')
		const template = templateForEvent(templates, event)
		if (!template || template.id == null) return []

		const patch: WhatsAppRuleUpdate['patch'] = {}
		if (!truthyFlag(rule.enabled)) {
			patch.enabled = true
		}
		if (!hasText(rule.template)) {
			patch.template = template.id
		}
		if (!Object.keys(patch).length) return []
		return [{ id: rule.id, patch }]
	})
}

export function buildWhatsAppDemoBootstrapPlan(input: {
	config?: AnyRecord | null
	templates?: AnyRecord[] | null
	automationRules?: AnyRecord[] | null
}): WhatsAppBootstrapPlan {
	const config = input.config ?? {}
	const templates = input.templates ?? []
	const existingTemplates = whatsappDemoTemplates.flatMap((seed) => {
		const match = templateForEvent(templates, seed.key)
		return match ? [match] : []
	})
	const templatesToCreate = whatsappDemoTemplates.filter(
		(seed) => !templateForEvent(templates, seed.key),
	)
	const phoneDisplay = hasText(config.phone_number_display)
		? String(config.phone_number_display)
		: whatsappDemoPhoneDisplay
	const defaultCountryCode = hasText(config.default_country_code)
		? String(config.default_country_code)
		: '+54'

	return {
		configPatch: {
			provider: 'fake',
			is_enabled: true,
			phone_number_display: phoneDisplay,
			default_country_code: defaultCountryCode,
		},
		existingTemplates,
		templatesToCreate,
		ruleUpdates: buildWhatsAppAutomationRuleUpdates({
			automationRules: input.automationRules,
			templates,
		}),
	}
}

export function buildWhatsAppOnboardingReadiness(input: {
	config?: AnyRecord | null
	templates?: AnyRecord[] | null
	automationRules?: AnyRecord[] | null
	messages?: AnyRecord[] | null
}): WhatsAppOnboardingReadiness {
	const config = input.config ?? {}
	const templates = input.templates ?? []
	const automationRules = input.automationRules ?? []
	const messages = input.messages ?? []
	const configReady =
		truthyFlag(config.is_enabled) &&
		hasText(config.provider) &&
		hasText(config.phone_number_display)
	const templatesReady = whatsappDemoTemplates.every((seed) =>
		Boolean(templateForEvent(templates.filter(isActiveTemplate), seed.key)),
	)
	const automationReady = whatsappDemoTemplates.every((seed) => {
		const rule = automationRules.find((item) => String(item.event ?? '') === seed.key)
		return Boolean(rule && truthyFlag(rule.enabled) && hasText(rule.template))
	})
	const historyReady = messages.length > 0
	const checks = [configReady, templatesReady, automationReady, historyReady]
	const completedCount = checks.filter(Boolean).length
	const totalCount = checks.length

	return {
		completedCount,
		totalCount,
		percent: Math.round((completedCount / totalCount) * 100),
		ready: configReady && templatesReady && automationReady,
		isDemoMode: String(config.provider ?? '') === 'fake',
		configReady,
		templatesReady,
		automationReady,
		historyReady,
	}
}
