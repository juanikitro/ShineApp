import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadApiModule() {
	const apiErrorsSourcePath = resolve('lib/api-errors.ts')
	const apiErrorsSource = readFileSync(apiErrorsSourcePath, 'utf8')
	const compiledApiErrors = ts.transpileModule(apiErrorsSource, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const apiErrorsModule = { exports: {} }
	const apiErrorsLoader = new Function(
		'exports',
		'module',
		compiledApiErrors,
	)
	apiErrorsLoader(apiErrorsModule.exports, apiErrorsModule)

	const apiSourcePath = resolve('lib/api.ts')
	const apiSource = readFileSync(apiSourcePath, 'utf8')
	const compiledApi = ts.transpileModule(apiSource, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const apiModule = { exports: {} }
	const apiLoader = new Function('exports', 'module', 'require', compiledApi)
	apiLoader(apiModule.exports, apiModule, (request) => {
		if (request === './api-errors') return apiErrorsModule.exports
		throw new Error(`Unsupported dependency: ${request}`)
	})
	return { ...apiErrorsModule.exports, ...apiModule.exports }
}

const { ApiResponseError, apiFetch } = loadApiModule()

test('apiFetch normalizes non-JSON error bodies without reading the stream twice', async () => {
	let consumed = false
	global.window = {
		localStorage: {
			getItem: () => null,
		},
	}
	global.fetch = async () => ({
		ok: false,
		status: 404,
		json: async () => {
			consumed = true
			throw new SyntaxError('Unexpected token < in JSON')
		},
		text: async () => {
			if (consumed) {
				throw new TypeError("Failed to execute 'text' on 'Response': body stream already read")
			}
			consumed = true
			return '<html>not found</html>'
		},
	})

	await assert.rejects(
		() => apiFetch('/services/1/history/'),
		(error) => {
			assert.ok(error instanceof ApiResponseError)
			assert.equal(error.status, 404)
			assert.equal(error.notice.title, 'Registro no encontrado')
			assert.equal(
				error.notice.description,
				'El registro solicitado ya no esta disponible.',
			)
			return true
		},
	)
})
