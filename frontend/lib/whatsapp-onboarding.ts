import { type AnyRecord } from '@/lib/page-support'
import { FREE_EVENT_VARIABLES } from '@/lib/whatsapp-free'

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
		dispatch?: 'manual' | 'notify' | 'automatic'
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
	modeLabel: string
	configIssues: string[]
	templateIssues: string[]
	ruleIssues: string[]
}

export const whatsappDemoPhoneDisplay = '+54 9 11 5555-0100'

export const whatsappDemoTemplates: WhatsAppTemplateSeed[] = [
	{
		key: 'reservation_confirmed',
		provider_template_name: 'shine_turno_confirmado_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, {negocio} confirma tu turno para {servicios} el {fecha_turno} a las {hora_turno}.',
		variables_schema: ['negocio', 'cliente', 'fecha_turno', 'hora_turno', 'vehiculo', 'servicios'],
		is_active: true,
	},
	{
		key: 'work_ready',
		provider_template_name: 'shine_trabajo_listo_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, {negocio} te avisa que tu {vehiculo} ya esta listo. Servicios realizados: {servicios}.',
		variables_schema: ['negocio', 'cliente', 'vehiculo', 'servicios'],
		is_active: true,
	},
	{
		key: 'work_delivered',
		provider_template_name: 'shine_trabajo_entregado_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, {negocio} registro la entrega de {vehiculo}. Servicios realizados: {servicios}.',
		variables_schema: ['negocio', 'cliente', 'vehiculo', 'servicios'],
		is_active: true,
	},
	{
		key: 'quote_sent',
		provider_template_name: 'shine_cotizacion_enviada_demo',
		language: 'es_AR',
		category: 'utility',
		body_preview:
			'Hola {cliente}, {negocio} te envio la cotizacion {codigo} para {vehiculo} por {total}. Validez: {validez}.',
		variables_schema: ['negocio', 'cliente', 'vehiculo', 'codigo', 'total', 'validez'],
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
		const dispatch =
			event === 'quote_sent' ? 'manual' : 'automatic'
		if (String(rule.dispatch ?? 'manual') !== dispatch) {
			patch.dispatch = dispatch
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
			mode: 'paid',
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

// Local checks only: the current API cannot verify credentials, approval or delivery.
export function whatsAppConfigIssues(config: AnyRecord): string[] {
	if (config.mode === 'free') return []
	const issues: string[] = []
	if (!truthyFlag(config.is_enabled)) issues.push('Habilita el canal para usar la API.')
	if (config.provider === 'fake') return issues
	if (!['meta', 'twilio'].includes(String(config.provider))) {
		return [...issues, 'Selecciona un provider: fake, Meta o Twilio.']
	}
	const tokenPresent = hasText(config.access_token) || truthyFlag(config.has_access_token)
	if (config.provider === 'meta') {
		if (!hasText(config.phone_number_id) || !tokenPresent) {
			issues.push(
				'Completa Phone number ID y Token, o solicita al administrador verificar la configuracion global de Meta; esta pantalla no puede comprobarla.',
			)
		}
	} else {
		if (!hasText(config.business_account_id)) issues.push('Completa Account SID de Twilio.')
		if (!hasText(config.phone_number_id)) issues.push('Completa Numero emisor de Twilio.')
		if (!tokenPresent) issues.push('Carga Auth Token de Twilio; no se usa el token global de Meta.')
	}
	return issues
}

export function whatsAppTemplateIssues(template: AnyRecord, config: AnyRecord): string[] {
	const issues: string[] = []
	if (!hasText(template.provider_template_name)) issues.push('Completa el nombre del template.')
	if (!hasText(template.language)) issues.push('Completa el idioma del template.')
	const variables = Array.isArray(template.variables_schema)
		? template.variables_schema
		: String(template.variables_schema ?? '')
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
	if (variables.some((variable) => typeof variable !== 'string')) {
		issues.push('Las variables deben ser nombres de texto.')
	}
	// Paid API allows custom schemas and an empty audit preview. Do not narrow that contract.
	if (config.mode !== 'free') return issues
	if (!hasText(template.body_preview)) issues.push('Escribe el mensaje de texto libre.')
	const allowed = (FREE_EVENT_VARIABLES[String(template.key)] ?? []).map((item) => item.name)
	if (
		variables.some((variable) => !allowed.includes(variable)) ||
		new Set(variables).size !== variables.length
	) {
		issues.push('Usa variables disponibles para el evento, sin repetir nombres.')
	}
	const placeholders = [
		...String(template.body_preview ?? '').matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g),
	].map((match) => match[1])
	if (placeholders.some((variable) => !allowed.includes(variable))) {
		issues.push('Reemplaza las variables desconocidas del mensaje por variables del evento.')
	}
	return issues
}

export function whatsAppRuleIssues(
	rule: AnyRecord,
	templates: AnyRecord[],
	config: AnyRecord,
): string[] {
	if (config.mode === 'free') return [] // wa.me selects text by event, not rule.template.
	const issues: string[] = []
	const template = templates.find((item) => String(item.id) === String(rule.template))
	if (!template || !isActiveTemplate(template) || String(template.key) !== String(rule.event)) {
		issues.push('Asigna un template activo del mismo evento.')
	} else if (whatsAppTemplateIssues(template, config).length) {
		issues.push('Corrige el mensaje y las variables del template asignado.')
	}
	if (rule.event === 'quote_sent' && rule.dispatch !== 'manual')
		issues.push('Las cotizaciones siempre deben tener despacho manual.')
	return issues
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
	const isFreeMode = config.mode === 'free'
	const configIssues = whatsAppConfigIssues(config)
	const configReady = configIssues.length === 0
	const templateIssues = whatsappDemoTemplates.flatMap((seed) => {
		const template = templates.find((item) => item.key === seed.key && isActiveTemplate(item))
		return template && !whatsAppTemplateIssues(template, config).length
			? []
			: [`${seed.key}: crea o corrige un mensaje activo en Mensajes.`]
	})
	const templatesReady = templateIssues.length === 0
	const ruleIssues = isFreeMode
		? []
		: whatsappDemoTemplates.flatMap((seed) => {
				const rule = automationRules.find((item) => item.event === seed.key)
				return rule
					? whatsAppRuleIssues(rule, templates, config).map((issue) => `${seed.key}: ${issue}`)
					: [`${seed.key}: configura la regla en Eventos de WhatsApp.`]
			})
	const automationReady = ruleIssues.length === 0
	const historyReady = messages.some(
		(message) =>
			message.provider === (isFreeMode ? 'wame' : config.provider) &&
			['sent', 'delivered', 'read'].includes(String(message.status)),
	)
	const checks = [configReady, templatesReady, automationReady]
	const completedCount = checks.filter(Boolean).length
	const totalCount = checks.length

	return {
		completedCount,
		totalCount,
		percent: Math.round((completedCount / totalCount) * 100),
		ready: configReady && templatesReady && automationReady,
		isDemoMode: !isFreeMode && config.provider === 'fake',
		modeLabel: isFreeMode
			? 'Gratis (wa.me)'
			: ((
					{ fake: 'Demo/local (fake)', meta: 'API Meta', twilio: 'API Twilio' } as Record<
						string,
						string
					>
				)[String(config.provider)] ?? 'Sin provider'),
		configIssues,
		templateIssues,
		ruleIssues,
		configReady,
		templatesReady,
		automationReady,
		historyReady,
	}
}
