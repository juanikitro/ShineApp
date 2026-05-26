import assert from 'node:assert/strict'
import { beforeEach, test, vi } from 'vitest'

import { ApiResponseError } from './api-errors'
import {
	apiFetch,
	apiList,
	clearStoredToken,
	downloadApiFile,
	getStoredToken,
	publicApiFetch,
	setStoredToken,
} from './api'

const API_BASE_URL = (
	process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api'
).replace(/\/$/, '')

beforeEach(() => {
	window.localStorage.clear()
	window.sessionStorage.clear()
})

test('apiFetch normalizes non-JSON error bodies without reading the stream twice', async () => {
	let consumed = false
	global.fetch = vi.fn(async () => ({
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
	}))

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

test('publicApiFetch does not read localStorage or attach auth headers', async () => {
	let authorizationHeader = null
	const getItem = vi.spyOn(window.localStorage.__proto__, 'getItem')
	setStoredToken('secret-token')
	global.fetch = vi.fn(async (_url, options) => {
		const headers = new Headers(options.headers)
		authorizationHeader = headers.get('Authorization')
		return {
			ok: true,
			status: 200,
			json: async () => ({ ok: true }),
		}
	})

	await publicApiFetch('/public/landing/king-shine/')

	assert.equal(getItem.mock.calls.length, 0)
	assert.equal(authorizationHeader, null)
})

test('stored token helpers use sessionStorage and clear legacy localStorage tokens', () => {
	assert.equal(getStoredToken(), null)

	window.localStorage.setItem('detailingToken', 'legacy-token')
	assert.equal(getStoredToken(), 'legacy-token')
	assert.equal(window.sessionStorage.getItem('detailingToken'), 'legacy-token')
	assert.equal(window.localStorage.getItem('detailingToken'), null)

	setStoredToken('abc123')
	assert.equal(getStoredToken(), 'abc123')
	assert.equal(window.sessionStorage.getItem('detailingToken'), 'abc123')
	assert.equal(window.localStorage.getItem('detailingToken'), null)

	clearStoredToken()
	assert.equal(getStoredToken(), null)
	assert.equal(window.sessionStorage.getItem('detailingToken'), null)
	assert.equal(window.localStorage.getItem('detailingToken'), null)
})

test('apiFetch attaches auth and json headers but leaves FormData content type to the browser', async () => {
	const captured = []
	setStoredToken('token-1')
	global.fetch = vi.fn(async (_url, options) => {
		captured.push(new Headers(options.headers))
		return {
			ok: true,
			status: 200,
			json: async () => ({ ok: true }),
		}
	})

	await apiFetch('/customers/', { method: 'POST', body: JSON.stringify({ name: 'Ana' }) })
	await apiFetch('/uploads/', { method: 'POST', body: new FormData() })
	await apiFetch('/plain/', {
		headers: { 'Content-Type': 'text/plain' },
		body: 'raw',
	})

	assert.equal(captured[0].get('Authorization'), 'Token token-1')
	assert.equal(captured[0].get('Content-Type'), 'application/json')
	assert.equal(captured[1].get('Content-Type'), null)
	assert.equal(captured[2].get('Content-Type'), 'text/plain')
})

test('apiFetch and publicApiFetch return undefined for 204 responses', async () => {
	global.fetch = vi.fn(async () => ({
		ok: true,
		status: 204,
		json: async () => {
			throw new Error('json should not be read for 204')
		},
	}))

	assert.equal(await apiFetch('/customers/1/', { method: 'DELETE' }), undefined)
	assert.equal(await publicApiFetch('/public/ping/'), undefined)
})

test('publicApiFetch normalizes JSON error payloads', async () => {
	global.fetch = vi.fn(async () => ({
		ok: false,
		status: 400,
		text: async () => JSON.stringify({ amount: ['Debe ser mayor a cero.'] }),
	}))

	await assert.rejects(
		() => publicApiFetch('/public/debts/'),
		(error) => {
			assert.ok(error instanceof ApiResponseError)
			assert.equal(error.status, 400)
			assert.equal(error.payload.amount[0], 'Debe ser mayor a cero.')
			return true
		},
	)
})

test('apiList accepts both plain arrays and paginated results', async () => {
	global.fetch = vi.fn(async (_url) => ({
		ok: true,
		status: 200,
		json: async () =>
			String(_url).includes('paginated')
				? { count: 1, next: null, previous: null, results: [{ id: 2 }] }
				: [{ id: 1 }],
	}))

	assert.deepEqual(await apiList('/customers/'), [{ id: 1 }])
	assert.deepEqual(await apiList('/paginated/customers/'), [{ id: 2 }])
})

test('apiList follows every DRF page from relative next links with auth headers', async () => {
	const calls = []
	setStoredToken('page-token')
	global.fetch = vi.fn(async (_url, options) => {
		const url = String(_url)
		calls.push({
			url,
			authorization: new Headers(options.headers).get('Authorization'),
		})
		return {
			ok: true,
			status: 200,
			json: async () =>
				url.includes('page=2')
					? { count: 2, next: null, previous: '/api/customers/', results: [{ id: 2 }] }
					: { count: 2, next: '/api/customers/?page=2', previous: null, results: [{ id: 1 }] },
		}
	})

	assert.deepEqual(await apiList('/customers/'), [{ id: 1 }, { id: 2 }])
	assert.deepEqual(
		calls.map((call) => call.url),
		[
			`${API_BASE_URL}/customers/`,
			`${API_BASE_URL}/customers/?page=2`,
		],
	)
	assert.deepEqual(
		calls.map((call) => call.authorization),
		['Token page-token', 'Token page-token'],
	)
})

test('apiList follows absolute DRF next links without prefixing the API URL twice', async () => {
	const urls = []
	global.fetch = vi.fn(async (_url) => {
		const url = String(_url)
		urls.push(url)
		return {
			ok: true,
			status: 200,
			json: async () =>
				url.includes('page=2')
					? { next: null, results: [{ id: 12 }] }
					: {
							next: 'https://api.shineapp.test/api/customers/?page=2',
							results: [{ id: 11 }],
						},
		}
	})

	assert.deepEqual(await apiList('/customers/'), [{ id: 11 }, { id: 12 }])
	assert.deepEqual(urls, [
		`${API_BASE_URL}/customers/`,
		'https://api.shineapp.test/api/customers/?page=2',
	])
})

test('apiList accepts a plain array returned by a paginated next link', async () => {
	global.fetch = vi.fn(async (_url) => {
		const url = String(_url)
		return {
			ok: true,
			status: 200,
			json: async () =>
				url.includes('page=2')
					? [{ id: 22 }]
					: {
							next: '/api/customers/?page=2',
							results: [{ id: 21 }],
						},
		}
	})

	assert.deepEqual(await apiList('/customers/'), [{ id: 21 }, { id: 22 }])
})

test('downloadApiFile sends auth, clicks a download link and revokes the blob url', async () => {
	const click = vi.fn()
	const revokeObjectURL = vi.fn()
	setStoredToken('download-token')
	vi.spyOn(document, 'createElement').mockReturnValue({
		click,
		set href(value) {
			this._href = value
		},
		get href() {
			return this._href
		},
		set download(value) {
			this._download = value
		},
		get download() {
			return this._download
		},
	})
	vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:report')
	vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(revokeObjectURL)
	global.fetch = vi.fn(async (_url, options) => {
		const headers = new Headers(options.headers)
		assert.equal(headers.get('Authorization'), 'Token download-token')
		return {
			ok: true,
			blob: async () => new Blob(['csv']),
		}
	})

	await downloadApiFile('/exports/report.csv', 'report.csv')

	assert.equal(click.mock.calls.length, 1)
	assert.deepEqual(revokeObjectURL.mock.calls, [['blob:report']])
})

test('downloadApiFile raises a generic error when the file response fails', async () => {
	global.fetch = vi.fn(async () => ({ ok: false }))

	await assert.rejects(
		() => downloadApiFile('/exports/missing.csv', 'missing.csv'),
		/No se pudo descargar el archivo\./,
	)
})
