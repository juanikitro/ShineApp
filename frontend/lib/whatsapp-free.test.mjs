import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	FREE_EVENT_VARIABLES,
	buildFreeVariables,
	buildFreeWhatsappHref,
	freeTemplateBody,
	freeVariablesForEvent,
	isFreeEventEnabled,
	isFreeWhatsappMode,
	renderFreeTemplate,
} from './whatsapp-free'

test('FREE_EVENT_VARIABLES declara los modulos esperados', () => {
	assert.deepEqual(Object.keys(FREE_EVENT_VARIABLES).sort(), [
		'manual',
		'quote_sent',
		'reservation_confirmed',
		'work_ready',
	])
	assert.deepEqual(
		freeVariablesForEvent('quote_sent').map((v) => v.name),
		['cliente', 'vehiculo', 'codigo', 'total', 'validez', 'negocio'],
	)
	assert.deepEqual(freeVariablesForEvent('desconocido'), [])
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

test('isFreeEventEnabled respeta la regla del evento', () => {
	const rules = [
		{ event: 'reservation_confirmed', enabled: true },
		{ event: 'work_ready', enabled: false },
	]
	assert.equal(isFreeEventEnabled(rules, 'reservation_confirmed'), true)
	assert.equal(isFreeEventEnabled(rules, 'work_ready'), false)
	assert.equal(isFreeEventEnabled(rules, 'quote_sent'), false)
	assert.equal(isFreeEventEnabled(null, 'reservation_confirmed'), false)
})
