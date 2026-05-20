import assert from 'node:assert/strict'
import { beforeEach, test, vi } from 'vitest'

const pdfMocks = vi.hoisted(() => ({
	getDocument: vi.fn(),
}))

vi.mock('pdfjs-dist/webpack.mjs', () => ({
	getDocument: pdfMocks.getDocument,
}))

import {
	isPdfAssetName,
	isPdfAssetSource,
	renderPdfPreviewDataUrl,
	safeImageAssetSource,
} from './pdf-preview'

beforeEach(() => {
	pdfMocks.getDocument.mockReset()
})

test('detects pdf file names regardless of case', () => {
	assert.equal(isPdfAssetName('logo.pdf'), true)
	assert.equal(isPdfAssetName('LOGO.PDF'), true)
	assert.equal(isPdfAssetName('logo.png'), false)
	assert.equal(isPdfAssetName(''), false)
})

test('detects pdf asset urls with querystrings and ignores other assets', () => {
	assert.equal(isPdfAssetSource('http://localhost:9001/media/logo.pdf'), true)
	assert.equal(
		isPdfAssetSource('http://localhost:9001/media/logo.pdf?token=123'),
		true,
	)
	assert.equal(
		isPdfAssetSource('http://localhost:9001/media/logo.png?download=1'),
		false,
	)
	assert.equal(isPdfAssetSource(null), false)
})

test('allows only safe image asset sources', () => {
	assert.equal(
		safeImageAssetSource('https://cdn.example.test/logo.png'),
		'https://cdn.example.test/logo.png',
	)
	assert.equal(safeImageAssetSource('/media/logo.webp'), '/media/logo.webp')
	assert.equal(safeImageAssetSource('blob:http://localhost/logo'), 'blob:http://localhost/logo')
	assert.equal(
		safeImageAssetSource('data:image/png;base64,cHJldmlldw=='),
		'data:image/png;base64,cHJldmlldw==',
	)
	assert.equal(safeImageAssetSource('javascript:alert(1)'), null)
	assert.equal(safeImageAssetSource('http://['), null)
	assert.equal(
		safeImageAssetSource('data:image/svg+xml,<svg onload=alert(1)>'),
		null,
	)
})

test('renderPdfPreviewDataUrl rejects missing and failed PDF sources', async () => {
	await assert.rejects(
		() => renderPdfPreviewDataUrl(''),
		/PDF source is required/,
	)

	global.fetch = vi.fn(async () => ({ ok: false, status: 503 }))
	await assert.rejects(
		() => renderPdfPreviewDataUrl('/files/report.pdf'),
		/Unable to fetch PDF preview source: 503/,
	)
})

test('renderPdfPreviewDataUrl rejects when canvas rendering is unavailable', async () => {
	const getPage = vi.fn(async () => ({
		getViewport: ({ scale }) => ({
			width: 320 * scale,
			height: 200 * scale,
			scale,
		}),
	}))
	const destroyPdf = vi.fn(async () => undefined)

	global.fetch = vi.fn(async () => ({
		ok: true,
		arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
	}))
	pdfMocks.getDocument.mockReturnValue({
		destroy: vi.fn(),
		promise: Promise.resolve({
			getPage,
			destroy: destroyPdf,
		}),
	})
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

	await assert.rejects(
		() => renderPdfPreviewDataUrl('/files/report.pdf'),
		/Canvas 2D context is not available/,
	)
	assert.equal(destroyPdf.mock.calls.length, 1)
})

test('renderPdfPreviewDataUrl renders the first page to a png data url and cleans resources', async () => {
	const render = vi.fn(() => ({ promise: Promise.resolve() }))
	const cleanup = vi.fn()
	const getViewport = vi.fn(({ scale }) => ({
		width: 320 * scale,
		height: 200 * scale,
		scale,
	}))
	const getPage = vi.fn(async () => ({
		getViewport,
		render,
		cleanup,
	}))
	const destroyPdf = vi.fn(async () => undefined)
	const destroyTask = vi.fn()
	const signal = new AbortController().signal

	global.fetch = vi.fn(async (_url, options) => {
		assert.equal(options.signal, signal)
		return {
			ok: true,
			arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
		}
	})
	pdfMocks.getDocument.mockReturnValue({
		destroy: destroyTask,
		promise: Promise.resolve({
			getPage,
			destroy: destroyPdf,
		}),
	})
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
	vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
		'data:image/png;base64,preview',
	)

	const dataUrl = await renderPdfPreviewDataUrl('/files/report.pdf', {
		maxWidth: 160,
		signal,
	})

	assert.equal(dataUrl, 'data:image/png;base64,preview')
	assert.deepEqual(pdfMocks.getDocument.mock.calls[0][0].data, new Uint8Array([1, 2, 3]))
	assert.equal(getPage.mock.calls[0][0], 1)
	assert.deepEqual(getViewport.mock.calls.map((call) => call[0].scale), [1, 0.75])
	assert.equal(render.mock.calls[0][0].viewport.scale, 0.75)
	assert.equal(cleanup.mock.calls.length, 1)
	assert.equal(destroyPdf.mock.calls.length, 1)
	assert.equal(destroyTask.mock.calls.length, 0)
})

test('renderPdfPreviewDataUrl destroys the loading task when the signal aborts', async () => {
	const controller = new AbortController()
	const destroyTask = vi.fn()
	let resolvePdf
	global.fetch = vi.fn(async () => ({
		ok: true,
		arrayBuffer: async () => new Uint8Array([1]).buffer,
	}))
	pdfMocks.getDocument.mockReturnValue({
		destroy: destroyTask,
		promise: new Promise((resolve) => {
			resolvePdf = resolve
		}),
	})

	const preview = renderPdfPreviewDataUrl('/files/report.pdf', {
		signal: controller.signal,
	})
	await vi.waitFor(() => {
		assert.equal(pdfMocks.getDocument.mock.calls.length, 1)
	})
	controller.abort()

	assert.equal(destroyTask.mock.calls.length, 1)
	resolvePdf({
		getPage: async () => ({
			getViewport: ({ scale }) => ({ width: 100 * scale, height: 100 * scale }),
			render: () => ({ promise: Promise.resolve() }),
			cleanup: vi.fn(),
		}),
		destroy: async () => undefined,
	})
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
	vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,x')

	await preview
})
