import assert from 'node:assert/strict'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, test, vi } from 'vitest'

const pdfPreviewMocks = vi.hoisted(() => ({
	renderPdfPreviewDataUrl: vi.fn(),
}))

vi.mock('./pdf-preview', () => ({
	renderPdfPreviewDataUrl: pdfPreviewMocks.renderPdfPreviewDataUrl,
}))

import { usePdfThumbnailPreview } from './use-pdf-thumbnail-preview'

afterEach(cleanup)

beforeEach(() => {
	pdfPreviewMocks.renderPdfPreviewDataUrl.mockReset()
})

test('stays idle when the preview is disabled or has no source', () => {
	const { result, rerender } = renderHook(
		({ source, enabled }) => usePdfThumbnailPreview(source, enabled, 320),
		{ initialProps: { source: '/logo.pdf', enabled: false } },
	)

	assert.deepEqual(result.current, { thumbnail: null, status: 'idle' })
	rerender({ source: null, enabled: true })
	assert.deepEqual(result.current, { thumbnail: null, status: 'idle' })
	assert.equal(pdfPreviewMocks.renderPdfPreviewDataUrl.mock.calls.length, 0)
})

test('stores a rendered thumbnail and keeps the requested max width', async () => {
	pdfPreviewMocks.renderPdfPreviewDataUrl.mockResolvedValue(
		'data:image/png;base64,preview',
	)
	const { result } = renderHook(() =>
		usePdfThumbnailPreview('/logo.pdf', true, 720),
	)

	await waitFor(() => {
		assert.equal(result.current.status, 'ready')
	})

	assert.equal(result.current.thumbnail, 'data:image/png;base64,preview')
	assert.equal(pdfPreviewMocks.renderPdfPreviewDataUrl.mock.calls[0][0], '/logo.pdf')
	assert.equal(
		pdfPreviewMocks.renderPdfPreviewDataUrl.mock.calls[0][1].maxWidth,
		720,
	)
})

test('reports rendering errors and aborts an in-flight preview on cleanup', async () => {
	pdfPreviewMocks.renderPdfPreviewDataUrl.mockRejectedValue(new Error('preview'))
	const { result, unmount } = renderHook(() =>
		usePdfThumbnailPreview('/logo.pdf', true, 128),
	)

	await waitFor(() => {
		assert.equal(result.current.status, 'error')
	})
	assert.equal(result.current.thumbnail, null)

	pdfPreviewMocks.renderPdfPreviewDataUrl.mockImplementation(
		(_source, options) => new Promise(() => {
			assert.equal(options.signal.aborted, false)
		}),
	)
	const pending = renderHook(() =>
		usePdfThumbnailPreview('/avatar.pdf', true, 128),
	)
	const signal = pdfPreviewMocks.renderPdfPreviewDataUrl.mock.calls[1][1].signal
	pending.unmount()
	unmount()
	assert.equal(signal.aborted, true)
})
