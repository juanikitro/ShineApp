import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	ApiResponseError,
	createValidationNotice,
	formatApiError,
	normalizeApiErrorPayload,
} from './api-errors'

test('normalizes DRF field arrays into a readable notice with affected fields', () => {
	const notice = normalizeApiErrorPayload({
		items: ['Agrega al menos un servicio.'],
	})

	assert.equal(notice.title, 'Revisa los datos ingresados')
	assert.equal(
		notice.description,
		'Hay campos que necesitan correccion antes de guardar.',
	)
	assert.deepEqual(notice.fields, [
		{
			path: 'items',
			label: 'Servicios',
			message: 'Agrega al menos un servicio.',
		},
	])
})

test('normalizes nested DRF arrays and objects without exposing raw JSON', () => {
	const notice = normalizeApiErrorPayload({
		items: [
			{
				service: ['Este campo es obligatorio.'],
				unit_price: ['Asegurate de ingresar un importe valido.'],
			},
		],
		customer: {
			email: ['Ingresa un email valido.'],
		},
	})

	assert.equal(notice.title, 'Revisa los datos ingresados')
	assert.deepEqual(notice.fields, [
		{
			path: 'items[1].service',
			label: 'Servicios 1 - Servicio',
			message: 'Este campo es obligatorio.',
		},
		{
			path: 'items[1].unit_price',
			label: 'Servicios 1 - Precio unitario',
			message: 'Asegurate de ingresar un importe valido.',
		},
		{
			path: 'customer.email',
			label: 'Cliente - Email',
			message: 'Ingresa un email valido.',
		},
	])
})

test('uses detail as the main description when DRF returns a detail message', () => {
	const notice = normalizeApiErrorPayload(
		{ detail: 'No tenes permisos para realizar esta accion.' },
		{ status: 403 },
	)

	assert.equal(notice.title, 'Acceso no permitido')
	assert.equal(notice.description, 'No tenes permisos para realizar esta accion.')
	assert.deepEqual(notice.fields, [])
})

test('formats legacy JSON error messages into the same readable notice', () => {
	const notice = formatApiError(
		new Error('{"items":["Agrega al menos un servicio."]}'),
	)

	assert.equal(notice.title, 'Revisa los datos ingresados')
	assert.equal(notice.fields[0].label, 'Servicios')
	assert.equal(notice.fields[0].message, 'Agrega al menos un servicio.')
})

test('keeps structured notices attached to ApiResponseError', () => {
	const notice = normalizeApiErrorPayload({ amount: ['Debe ser mayor a cero.'] })
	const error = new ApiResponseError(notice, {
		status: 400,
		payload: { amount: ['Debe ser mayor a cero.'] },
	})

	assert.equal(formatApiError(error), notice)
	assert.equal(error.message, 'Hay campos que necesitan correccion antes de guardar.')
})

test('creates local validation notices for client-side checks', () => {
	const notice = createValidationNotice(
		'Falta un servicio',
		'Agrega un servicio para poder guardar la reserva.',
		[{ path: 'items', label: 'Servicios', message: 'Selecciona al menos un servicio.' }],
	)

	assert.equal(notice.title, 'Falta un servicio')
	assert.equal(notice.fields[0].path, 'items')
})

test('formats network errors and existing notice-like objects without losing copy', () => {
	const network = formatApiError(new TypeError('fetch failed'))
	assert.equal(network.title, 'No pudimos conectar con el servidor')
	assert.match(network.description, /conexion/)

	const existing = createValidationNotice('Manual', 'Mensaje local')
	assert.equal(formatApiError({ notice: existing }), existing)
})

test('maps auth, missing-record, server and html detail responses to safe descriptions', () => {
	assert.equal(
		normalizeApiErrorPayload({ detail: 'Invalid token.' }, { status: 401 })
			.description,
		'Volve a iniciar sesion para continuar.',
	)
	assert.equal(
		normalizeApiErrorPayload({ detail: 'Object not found.' }, { status: 404 })
			.description,
		'El registro solicitado ya no esta disponible.',
	)
	assert.equal(
		normalizeApiErrorPayload('<!doctype html><html>Error</html>', {
			status: 500,
		}).title,
		'Problema del servidor',
	)
	assert.equal(
		normalizeApiErrorPayload('<!doctype html><html>Error</html>', {
			status: 500,
		}).description,
		'Intenta nuevamente. Si el problema continua, revisa los datos cargados.',
	)
})

test('normalizes array details, root array fields and unknown field labels', () => {
	assert.equal(
		normalizeApiErrorPayload({
			detail: ['Primero', '', { ignored: true }, 'Segundo'],
		}).description,
		'Primero Segundo',
	)

	const notice = normalizeApiErrorPayload({
		items: [
			{ custom_field: 'Mensaje custom' },
			{ license_plate: ['Patente requerida'] },
		],
	})

	assert.deepEqual(notice.fields, [
		{
			path: 'items[1].custom_field',
			label: 'Servicios 1 - Custom Field',
			message: 'Mensaje custom',
		},
		{
			path: 'items[2].license_plate',
			label: 'Servicios 2 - Patente',
			message: 'Patente requerida',
		},
	])
})

test('uses fallback title and description when no structured detail is available', () => {
	const notice = normalizeApiErrorPayload('', {
		fallbackTitle: 'Titulo manual',
		fallbackDescription: 'Descripcion manual',
	})

	assert.deepEqual(notice, {
		title: 'Titulo manual',
		description: 'Descripcion manual',
		fields: [],
	})
	assert.equal(formatApiError('texto plano').description, 'texto plano')
	assert.equal(formatApiError({ unexpected: true }).title, 'No se pudo completar la accion')
})
