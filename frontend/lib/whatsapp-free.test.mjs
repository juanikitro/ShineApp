import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

import {
	FREE_EVENT_VARIABLES,
	FREE_EVENT_KEYS,
	buildFreeVariables,
	buildFreeWhatsappHref,
	createFreeWhatsappLauncher,
	dispatchForEvent,
	freeWhatsappActionAvailability,
	freeTemplateBody,
	freeVariablesForEvent,
	isFreeWhatsappMode,
	hasActiveWhatsappTemplate,
	renderFreeTemplate,
	whatsappEventButtonVisible,
	whatsappAlreadySent,
} from './whatsapp-free'

test('FREE_EVENT_VARIABLES declara los modulos esperados', () => {
	assert.deepEqual(Object.keys(FREE_EVENT_VARIABLES).sort(), [
		'manual',
		'quote_sent',
		'reservation_confirmed',
		'work_delivered',
		'work_ready',
	])
	assert.deepEqual(
		freeVariablesForEvent('quote_sent').map((v) => v.name),
		['cliente', 'vehiculo', 'codigo', 'total', 'validez', 'negocio'],
	)
	assert.deepEqual(freeVariablesForEvent('desconocido'), [])
	assert.equal(FREE_EVENT_KEYS.includes('work_delivered'), true)
})

test('buildFreeVariables solo incluye las variables del evento', () => {
	const vars = buildFreeVariables('reservation_confirmed', {
		cliente: 'Juan',
		fecha_turno: '25/06/2026',
		hora_turno: '10:30',
		vehiculo: 'AA123BB',
		servicios: 'Lavado',
		negocio: 'ShineApp',
		total: '9999', // no pertenece al evento => se ignora
	})
	assert.deepEqual(vars, {
		cliente: 'Juan',
		fecha_turno: '25/06/2026',
		hora_turno: '10:30',
		vehiculo: 'AA123BB',
		servicios: 'Lavado',
		negocio: 'ShineApp',
	})
	assert.equal('total' in vars, false)
})

test('buildFreeVariables completa vacio cuando falta el dato', () => {
	const vars = buildFreeVariables('manual', { cliente: null })
	assert.deepEqual(vars, { cliente: '', negocio: '' })
})

test('renderFreeTemplate sustituye variables conocidas', () => {
	const body = 'Hola {cliente}, tu {vehiculo} para {servicios}.'
	assert.equal(
		renderFreeTemplate(body, { cliente: 'Juan', vehiculo: 'Fiesta', servicios: 'Lavado' }),
		'Hola Juan, tu Fiesta para Lavado.',
	)
})

test('renderFreeTemplate limpia placeholders sin resolver', () => {
	const body = 'Hola {cliente}, faltan {servicios} el {fecha_turno}.'
	// Solo pasamos cliente: los otros placeholders deben quedar vacios, sin llaves.
	assert.equal(
		renderFreeTemplate(body, { cliente: 'Ana' }),
		'Hola Ana, faltan  el .',
	)
	assert.equal(renderFreeTemplate('', {}), '')
	assert.equal(renderFreeTemplate(null, {}), '')
})

test('freeTemplateBody devuelve el body del template activo del evento', () => {
	const templates = [
		{ key: 'reservation_confirmed', body_preview: 'Turno {cliente}', is_active: true },
		{ key: 'quote_sent', body_preview: 'Cotizacion vieja', is_active: false },
		{ key: 'quote_sent', body_preview: 'Cotizacion {codigo}', is_active: true },
	]
	assert.equal(freeTemplateBody(templates, 'reservation_confirmed'), 'Turno {cliente}')
	assert.equal(freeTemplateBody(templates, 'quote_sent'), 'Cotizacion {codigo}')
	assert.equal(freeTemplateBody(templates, 'work_ready'), '')
	assert.equal(freeTemplateBody(null, 'manual'), '')
})

test('hasActiveWhatsappTemplate y whatsappEventButtonVisible aplican el contrato del canal', () => {
	const templates = [
		{ key: 'reservation_confirmed', is_active: true },
		{ key: 'work_ready', is_active: false },
	]
	assert.equal(hasActiveWhatsappTemplate(templates, 'reservation_confirmed'), true)
	assert.equal(hasActiveWhatsappTemplate(templates, 'work_ready'), false)
	assert.equal(
		whatsappEventButtonVisible({
			config: { mode: 'free', is_enabled: false },
			templates,
			event: 'reservation_confirmed',
			phone: '11 2233-4455',
		}),
		true,
	)
	assert.equal(
		whatsappEventButtonVisible({
			config: { mode: 'paid', is_enabled: true },
			templates,
			event: 'reservation_confirmed',
			phone: '   ',
		}),
		false,
	)
	assert.equal(
		whatsappEventButtonVisible({
			config: { mode: 'paid', is_enabled: false },
			templates,
			event: 'reservation_confirmed',
			phone: '11 2233-4455',
		}),
		false,
	)
})

test('freeWhatsappActionAvailability explica requisitos faltantes de wa.me', () => {
	const templates = [{ key: 'reservation_confirmed', is_active: true, body_preview: 'Hola {cliente}' }]
	assert.deepEqual(
		freeWhatsappActionAvailability({
			config: { mode: 'paid', is_enabled: true },
			templates,
			event: 'reservation_confirmed',
			phone: '11 2233-4455',
		}),
		{ visible: true, enabled: true, unavailableReason: null },
	)
	assert.deepEqual(
		freeWhatsappActionAvailability({
			config: { mode: 'free' },
			templates,
			event: 'reservation_confirmed',
			phone: '',
		}),
		{
			visible: true,
			enabled: false,
			unavailableReason: 'El cliente no tiene telefono cargado.',
		},
	)
	assert.deepEqual(
		freeWhatsappActionAvailability({
			config: { mode: 'free' },
			templates,
			event: 'work_ready',
			phone: '11 2233-4455',
		}),
		{
			visible: true,
			enabled: false,
			unavailableReason:
				'Falta configurar el mensaje de este modulo en Configuracion > WhatsApp.',
		},
	)
	assert.deepEqual(
		freeWhatsappActionAvailability({
			config: { mode: 'free' },
			templates,
			event: 'reservation_confirmed',
			phone: '11 2233-4455',
		}),
		{ visible: true, enabled: true, unavailableReason: null },
	)
})

test.each(FREE_EVENT_KEYS)('wa.me valida telefono y cuerpo para %s sin alterar el modo pago', (event) => {
	const availability = (phone, templates) => freeWhatsappActionAvailability({
		config: { mode: 'free' }, templates, event, phone,
	})
	const templates = [{ key: event, is_active: true, body_preview: 'Hola' }]
	for (const phone of [null, undefined, '', '   ']) {
		assert.equal(availability(phone, templates).enabled, false)
	}
	assert.match(availability('sin telefono', templates).unavailableReason, /no contiene numeros/)
	for (const body_preview of [null, undefined, '', '   ']) {
		assert.equal(availability('11 2233-4455', [{ key: event, body_preview }]).enabled, false)
	}
	assert.equal(availability('11 2233-4455', [{ ...templates[0], is_active: false }]).enabled, false)
	assert.deepEqual(availability('11 2233-4455', templates), {
		visible: true, enabled: true, unavailableReason: null,
	})
	assert.deepEqual(freeWhatsappActionAvailability({
		config: { mode: 'paid', is_enabled: false }, templates, event, phone: '11 2233-4455',
	}), { visible: false, enabled: false, unavailableReason: null })
})

test('launcher abre desde el gesto y no duplica apertura ni log mientras registra', async () => {
	let finishLog
	const logged = new Promise((resolve) => { finishLog = resolve })
	const popup = { opener: {} }
	const openWindow = vi.fn(() => popup)
	const log = vi.fn(() => logged)
	const onLogError = vi.fn()
	const launch = createFreeWhatsappLauncher()
	const action = { key: 'quote:8', href: 'https://wa.me/541122334455?text=Hola', openWindow, log, onLogError }
	assert.equal(launch(action), 'opened')
	assert.equal(openWindow.mock.calls.length, 1) // sin await antes de window.open
	assert.equal(popup.opener, null)
	assert.equal(launch(action), 'pending')
	assert.equal(openWindow.mock.calls.length, 1)
	await vi.waitFor(() => assert.equal(log.mock.calls.length, 1))
	assert.equal(launch(action), 'pending')
	finishLog()
	await vi.waitFor(() => assert.equal(launch(action), 'opened'))
	await vi.waitFor(() => assert.equal(log.mock.calls.length, 2))
	assert.equal(onLogError.mock.calls.length, 0)
})

test.each(['null', 'throw'])('launcher no registra popup bloqueado: %s', (failure) => {
	const log = vi.fn()
	const onLogError = vi.fn()
	const launch = createFreeWhatsappLauncher()
	const openWindow = vi.fn(() => {
		if (failure === 'throw') throw new Error('Blocked')
		return null
	})
	const action = { key: 'manual:1', href: 'https://wa.me/541122334455', openWindow, log, onLogError }
	assert.equal(launch(action), 'blocked')
	assert.equal(launch(action), 'blocked') // no deja la accion bloqueada
	assert.equal(log.mock.calls.length, 0)
	assert.equal(onLogError.mock.calls.length, 0)
})

test.each(['reject', 'throw'])('launcher informa error de log una vez y permite otras acciones: %s', async (failure) => {
	const launch = createFreeWhatsappLauncher()
	const onLogError = vi.fn()
	const log = vi.fn(() => {
		if (failure === 'throw') throw new Error('Offline')
		return Promise.reject(new Error('Offline'))
	})
	const action = { key: 'work:1', href: 'https://wa.me/541122334455', openWindow: () => ({ opener: null }), log, onLogError }
	assert.equal(launch(action), 'opened')
	assert.equal(launch(action), 'pending')
	assert.equal(launch({ ...action, key: 'work:2', log: () => Promise.resolve() }), 'opened')
	await vi.waitFor(() => assert.equal(onLogError.mock.calls.length, 1))
	assert.equal(log.mock.calls.length, 1)
})

test('launcher registra aunque el navegador no permita limpiar opener', async () => {
	const popup = Object.defineProperty({}, 'opener', { set() { throw new Error('Denied') } })
	const log = vi.fn(() => Promise.resolve())
	const launch = createFreeWhatsappLauncher()
	assert.equal(launch({ key: 'manual:1', href: 'https://wa.me/541122334455', openWindow: () => popup, log, onLogError: vi.fn() }), 'opened')
	await vi.waitFor(() => assert.equal(log.mock.calls.length, 1))
})

test('buildFreeWhatsappHref arma el link o null', () => {
	assert.equal(
		buildFreeWhatsappHref('11 2233-4455', 'Hola Juan'),
		'https://wa.me/541122334455?text=Hola%20Juan',
	)
	assert.equal(buildFreeWhatsappHref('', 'Hola'), null)
	assert.equal(buildFreeWhatsappHref('11 2233-4455', '   '), null)
	assert.equal(buildFreeWhatsappHref(null, 'Hola'), null)
})

test('isFreeWhatsappMode detecta el modo gratis', () => {
	assert.equal(isFreeWhatsappMode({ mode: 'free' }), true)
	assert.equal(isFreeWhatsappMode({ mode: 'paid' }), false)
	assert.equal(isFreeWhatsappMode(null), false)
	assert.equal(isFreeWhatsappMode({}), false)
})

test('dispatchForEvent solo habilita politicas proactivas validas', () => {
	const rules = [
		{ event: 'reservation_confirmed', dispatch: 'automatic' },
		{ event: 'work_ready', dispatch: 'notify' },
		{ event: 'quote_sent', dispatch: 'automatic' },
	]
	assert.equal(dispatchForEvent(rules, 'reservation_confirmed'), 'automatic')
	assert.equal(dispatchForEvent(rules, 'work_ready'), 'notify')
	assert.equal(dispatchForEvent(rules, 'work_delivered'), 'manual')
	assert.equal(dispatchForEvent(rules, 'quote_sent'), 'manual')
})

test('whatsappAlreadySent exige el evento, fuente y un estado entregable', () => {
	const messages = [
		{ event: 'work_ready', work_order: 12, status: 'sent' },
		{ event: 'quote_sent', quote: 8, status: 'queued' },
	]
	assert.equal(whatsappAlreadySent(messages, 'work_ready', 'workOrder', 12), true)
	assert.equal(whatsappAlreadySent(messages, 'work_ready', 'workOrder', 13), false)
	assert.equal(whatsappAlreadySent(messages, 'quote_sent', 'quote', 8), false)
})
