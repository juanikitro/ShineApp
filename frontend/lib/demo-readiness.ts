import {
	type AnyRecord,
	type Section,
	numberValue,
} from '@/lib/page-support'

export type DemoReadinessSettingsSection =
	| 'business'
	| 'turnera'
	| 'whatsapp'
	| 'cash'
	| 'agenda'

export type DemoReadinessTarget =
	| { kind: 'section'; section: Section }
	| { kind: 'settings'; section: DemoReadinessSettingsSection }

export type DemoReadinessStepId =
	| 'business'
	| 'services'
	| 'turnera'
	| 'whatsapp'
	| 'agenda'
	| 'cash-dashboard'

export type DemoReadinessStep = {
	id: DemoReadinessStepId
	title: string
	description: string
	actionLabel: string
	done: boolean
	target: DemoReadinessTarget
}

export type DemoReadiness = {
	completedCount: number
	totalCount: number
	percent: number
	ready: boolean
	firstPendingStep: DemoReadinessStep | null
	steps: DemoReadinessStep[]
	channelHint: string
}

export type DemoReadinessInput = {
	businessForm?: AnyRecord | null
	businessProfile?: AnyRecord | null
	businessSlug?: string | null
	dashboard?: AnyRecord | null
	payments?: AnyRecord[]
	publicRequests?: AnyRecord[]
	reservations?: AnyRecord[]
	sectors?: AnyRecord[]
	services?: AnyRecord[]
	whatsappAutomationRules?: AnyRecord[]
	whatsappConfig?: AnyRecord | null
	whatsappTemplates?: AnyRecord[]
	workOrders?: AnyRecord[]
}

function hasText(value: unknown) {
	return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function isActiveRecord(record: AnyRecord) {
	return record?.is_active !== false && !record?.deleted_at
}

function truthyFlag(value: unknown) {
	return value === true || value === 'true' || value === 1 || value === '1'
}

export function buildDemoReadiness(input: DemoReadinessInput): DemoReadiness {
	const profile = input.businessProfile ?? input.businessForm ?? {}
	const activeServices = (input.services ?? []).filter(isActiveRecord)
	const activeSectors = (input.sectors ?? []).filter(isActiveRecord)
	const reservationsCount = (input.reservations ?? []).filter(isActiveRecord).length
	const workOrdersCount = (input.workOrders ?? []).filter(isActiveRecord).length
	const paymentsCount = (input.payments ?? []).filter(isActiveRecord).length
	const publicRequestsCount = (input.publicRequests ?? []).length
	const whatsappConfig = input.whatsappConfig ?? {}
	const whatsappTemplatesCount = (input.whatsappTemplates ?? []).filter(
		isActiveRecord,
	).length
	const whatsappRulesCount = (input.whatsappAutomationRules ?? []).filter(
		isActiveRecord,
	).length
	const collectedTotal = numberValue(
		input.dashboard?.collected_total ??
			input.dashboard?.cashflow_income_total ??
			input.dashboard?.today_income,
	)
	const sectorKeys = new Set(activeSectors.map((sector) => String(sector.key ?? '')))
	const hasCoreVehicleSectors =
		sectorKeys.has('lavadero') &&
		sectorKeys.has('detailing') &&
		sectorKeys.has('lubricentro')
	const businessDone =
		hasText(profile.name) &&
		hasText(input.businessSlug) &&
		(hasText(profile.contact_phone) || hasText(profile.contact_email))
	const servicesDone = activeServices.length >= 3 && hasCoreVehicleSectors
	const turneraDone =
		truthyFlag(profile.public_landing_enabled) &&
		hasText(input.businessSlug) &&
		activeServices.length > 0 &&
		(truthyFlag(profile.allow_public_booking_requests) ||
			truthyFlag(profile.allow_public_quote_requests))
	const whatsappDone =
		truthyFlag(whatsappConfig.is_enabled) &&
		(hasText(whatsappConfig.phone_number_display) ||
			hasText(whatsappConfig.display_phone_number) ||
			hasText(whatsappConfig.phone_number) ||
			hasText(profile.contact_phone) ||
			whatsappTemplatesCount > 0 ||
			whatsappRulesCount > 0)
	const agendaDone =
		reservationsCount > 0 || workOrdersCount > 0 || publicRequestsCount > 0
	const cashDone = paymentsCount > 0 || collectedTotal > 0

	const steps: DemoReadinessStep[] = [
		{
			id: 'business',
			title: 'Negocio listo',
			description: 'Nombre, contacto publico y slug para vender desde el link.',
			actionLabel: 'Configurar negocio',
			done: businessDone,
			target: { kind: 'settings', section: 'business' },
		},
		{
			id: 'services',
			title: 'Servicios vehiculares',
			description: 'Lavadero, detailing y lubricentro con servicios activos.',
			actionLabel: 'Cargar servicios',
			done: servicesDone,
			target: { kind: 'section', section: 'services' },
		},
		{
			id: 'turnera',
			title: 'Turnera publica',
			description: 'Landing publica activa para Instagram, referidos y reservas.',
			actionLabel: 'Abrir turnera',
			done: turneraDone,
			target: { kind: 'settings', section: 'turnera' },
		},
		{
			id: 'whatsapp',
			title: 'WhatsApp operativo',
			description: 'Canal activo para confirmar turnos y responder consultas.',
			actionLabel: 'Configurar WhatsApp',
			done: whatsappDone,
			target: { kind: 'settings', section: 'whatsapp' },
		},
		{
			id: 'agenda',
			title: 'Primer turno o trabajo',
			description: 'La agenda muestra demanda real o datos demo para vender el flujo.',
			actionLabel: 'Ver agenda',
			done: agendaDone,
			target: { kind: 'section', section: 'agenda' },
		},
		{
			id: 'cash-dashboard',
			title: 'Caja y dashboard',
			description: 'Pagos registrados para mostrar caja diaria e indicadores.',
			actionLabel: 'Ver caja',
			done: cashDone,
			target: { kind: 'section', section: 'cash' },
		},
	]
	const completedCount = steps.filter((step) => step.done).length
	const totalCount = steps.length
	const percent = Math.round((completedCount / totalCount) * 100)

	return {
		completedCount,
		totalCount,
		percent,
		ready: completedCount === totalCount,
		firstPendingStep: steps.find((step) => !step.done) ?? null,
		steps,
		channelHint:
			'Canales de venta: link publico para Instagram y referidos; WhatsApp para confirmar y recuperar consultas.',
	}
}
