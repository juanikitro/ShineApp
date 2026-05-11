import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadApiErrorsModule() {
	const sourcePath = resolve('lib/api-errors.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const {
	ApiResponseError,
	createValidationNotice,
	formatApiError,
	normalizeApiErrorPayload,
} = loadApiErrorsModule()

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
