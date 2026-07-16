// Logica del modo WhatsApp "gratis" (wa.me): renderizado de templates de texto
// libre con variables y armado del enlace wa.me. No hace envio server-side; el
// operador abre WhatsApp desde su propia sesion. Ver docs/deployment/whatsapp.md.

import { type AnyRecord } from '@/lib/page-support'
import { whatsappUrl } from '@/lib/contact-links'

export type FreeVariableDef = { name: string; label: string }

// Variables disponibles por evento/modulo. Se muestran como ayuda en el editor
// de template (Configuracion > WhatsApp) y son las unicas que se sustituyen.
export const FREE_EVENT_VARIABLES: Record<string, FreeVariableDef[]> = {
	reservation_confirmed: [
		{ name: 'cliente', label: 'Nombre del cliente' },
		{ name: 'fecha_turno', label: 'Fecha del turno' },
		{ name: 'hora_turno', label: 'Hora del turno' },
		{ name: 'vehiculo', label: 'Vehiculo' },
		{ name: 'servicios', label: 'Servicios' },
		{ name: 'negocio', label: 'Nombre del negocio' },
	],
	work_ready: [
		{ name: 'cliente', label: 'Nombre del cliente' },
		{ name: 'vehiculo', label: 'Vehiculo' },
		{ name: 'servicios', label: 'Servicios' },
		{ name: 'negocio', label: 'Nombre del negocio' },
	],
	work_delivered: [
		{ name: 'cliente', label: 'Nombre del cliente' },
		{ name: 'vehiculo', label: 'Vehiculo' },
		{ name: 'servicios', label: 'Servicios' },
		{ name: 'negocio', label: 'Nombre del negocio' },
	],
	quote_sent: [
		{ name: 'cliente', label: 'Nombre del cliente' },
		{ name: 'vehiculo', label: 'Vehiculo' },
		{ name: 'codigo', label: 'Codigo de cotizacion' },
		{ name: 'total', label: 'Total' },
		{ name: 'validez', label: 'Validez' },
		{ name: 'negocio', label: 'Nombre del negocio' },
	],
	manual: [
		{ name: 'cliente', label: 'Nombre del cliente' },
		{ name: 'negocio', label: 'Nombre del negocio' },
	],
}

export const FREE_EVENT_KEYS = [
	'reservation_confirmed',
	'work_ready',
	'work_delivered',
	'quote_sent',
	'manual',
]

export function freeVariablesForEvent(event: string): FreeVariableDef[] {
	return FREE_EVENT_VARIABLES[event] ?? []
}

export type FreeVariableContext = {
	cliente?: string | null
	vehiculo?: string | null
	servicios?: string | null
	fecha_turno?: string | null
	hora_turno?: string | null
	codigo?: string | null
	total?: string | null
	validez?: string | null
	negocio?: string | null
}

// Arma el mapa de variables para el evento a partir del contexto ya resuelto por
// el caller (usa los helpers de display existentes). Solo incluye las variables
// declaradas para ese evento; cadena vacia si falta el dato.
export function buildFreeVariables(
	event: string,
	ctx: FreeVariableContext,
): Record<string, string> {
	const defs = freeVariablesForEvent(event)
	const result: Record<string, string> = {}
	for (const def of defs) {
		const raw = (ctx as Record<string, unknown>)[def.name]
		result[def.name] = raw == null ? '' : String(raw)
	}
	return result
}

// Sustituye {variable} en el cuerpo y limpia cualquier placeholder {palabra} que
// haya quedado sin resolver (para no mandar llaves crudas al cliente).
export function renderFreeTemplate(
	body: string | null | undefined,
	variables: Record<string, string>,
): string {
	let rendered = String(body ?? '')
	for (const [key, value] of Object.entries(variables ?? {})) {
		rendered = rendered.split('{' + key + '}').join(value)
	}
	// Elimina placeholders no resueltos: {palabra_simple} sin espacios internos.
	rendered = rendered.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, '')
	return rendered.trim()
}

// Devuelve el body_preview del template activo para el evento, o cadena vacia.
export function freeTemplateBody(
	templates: AnyRecord[] | null | undefined,
	event: string,
): string {
	const match = (templates ?? []).find(
		(template) =>
			String(template.key ?? '') === event && template.is_active !== false,
	)
	return match ? String(match.body_preview ?? '') : ''
}

export function hasActiveWhatsappTemplate(
	templates: AnyRecord[] | null | undefined,
	event: string,
): boolean {
	return (templates ?? []).some(
		(template) =>
			String(template.key ?? '') === event && template.is_active !== false,
	)
}

// Arma el enlace wa.me con el mensaje prellenado. Null si falta telefono o cuerpo.
export function buildFreeWhatsappHref(
	phone: string | null | undefined,
	body: string | null | undefined,
): string | null {
	const message = String(body ?? '').trim()
	if (!message) return null
	return whatsappUrl(phone, message)
}

// True si el negocio esta en modo gratis (wa.me).
export function isFreeWhatsappMode(config: AnyRecord | null | undefined): boolean {
	return String(config?.mode ?? '') === 'free'
}

export function whatsappEventButtonVisible({
	config,
	templates,
	event,
	phone,
}: {
	config: AnyRecord | null | undefined
	templates: AnyRecord[] | null | undefined
	event: string
	phone: string | null | undefined
}): boolean {
	const channelUsable = isFreeWhatsappMode(config)
		? String(config?.mode ?? '') === 'free'
		: config?.is_enabled === true
	return (
		channelUsable &&
		hasActiveWhatsappTemplate(templates, event) &&
		Boolean(String(phone ?? '').trim())
	)
}

export type WhatsappDispatch = 'manual' | 'notify' | 'automatic'

const PROACTIVE_EVENT_KEYS = new Set([
	'reservation_confirmed',
	'work_ready',
	'work_delivered',
])

export function dispatchForEvent(
	automationRules: AnyRecord[] | null | undefined,
	event: string,
): WhatsappDispatch {
	if (!PROACTIVE_EVENT_KEYS.has(event)) return 'manual'
	const dispatch = String(
		(automationRules ?? []).find(
			(rule) => String(rule.event ?? '') === event,
		)?.dispatch ?? 'manual',
	)
	return dispatch === 'notify' || dispatch === 'automatic' ? dispatch : 'manual'
}

export function whatsappAlreadySent(
	messages: AnyRecord[] | null | undefined,
	event: string,
	source: 'reservation' | 'workOrder' | 'quote',
	sourceId: number | string,
): boolean {
	const sourceField =
		source === 'workOrder' ? 'work_order' : source
	return (messages ?? []).some(
		(message) =>
			String(message.event ?? '') === event &&
			String(message[sourceField] ?? '') === String(sourceId) &&
			['sent', 'delivered', 'read'].includes(
				String(message.status ?? '').toLowerCase(),
			),
	)
}
