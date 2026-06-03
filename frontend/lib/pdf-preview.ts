const PDF_ASSET_PATTERN = /\.pdf(?:$|[?#])/i
const SAFE_IMAGE_DATA_URL_PATTERN =
	/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i

export function isPdfAssetName(value: string | null | undefined) {
	return typeof value === 'string' && PDF_ASSET_PATTERN.test(value.trim())
}

export function isPdfAssetSource(value: string | null | undefined) {
	return typeof value === 'string' && PDF_ASSET_PATTERN.test(value)
}

export function safeImageAssetSource(value: string | null | undefined) {
	if (typeof value !== 'string') return null
	const source = value.trim()
	if (!source) return null
	if (SAFE_IMAGE_DATA_URL_PATTERN.test(source)) return source

	try {
		const parsed = new URL(source, 'http://localhost')
		if (['http:', 'https:', 'blob:'].includes(parsed.protocol)) {
			// Relative paths must be returned as-is; absolute URLs go through
			// parsed.href so the URL parser normalises them before reaching the DOM.
			return source.startsWith('/') ? source : parsed.href
		}
	} catch {
		return null
	}
	return null
}

type RenderPdfPreviewOptions = {
	maxWidth?: number
	signal?: AbortSignal
}

export async function renderPdfPreviewDataUrl(
	source: string,
	options: RenderPdfPreviewOptions = {},
) {
	if (!source) {
		throw new Error('PDF source is required to generate a preview.')
	}
	const response = await fetch(source, {
		signal: options.signal,
	})
	if (!response.ok) {
		throw new Error(`Unable to fetch PDF preview source: ${response.status}`)
	}

	const { getDocument } = await import('pdfjs-dist/webpack.mjs')
	const bytes = new Uint8Array(await response.arrayBuffer())
	const loadingTask = getDocument({ data: bytes })
	const onAbort = () => {
		void loadingTask.destroy()
	}
	options.signal?.addEventListener('abort', onAbort, { once: true })

	try {
		const pdf = await loadingTask.promise
		try {
			const page = await pdf.getPage(1)
			const baseViewport = page.getViewport({ scale: 1 })
			const maxWidth = options.maxWidth ?? 640
			const scale = Math.max(
				0.75,
				Math.min(maxWidth / baseViewport.width, 2),
			)
			const viewport = page.getViewport({ scale })
			const canvas = document.createElement('canvas')
			const context = canvas.getContext('2d', { alpha: false })

			if (!context) {
				throw new Error('Canvas 2D context is not available.')
			}

			canvas.width = Math.ceil(viewport.width)
			canvas.height = Math.ceil(viewport.height)

			await page.render({
				canvasContext: context,
				viewport,
			}).promise

			const dataUrl = canvas.toDataURL('image/png')
			canvas.width = 0
			canvas.height = 0
			page.cleanup()
			return dataUrl
		} finally {
			await pdf.destroy()
		}
	} finally {
		options.signal?.removeEventListener('abort', onAbort)
	}
}
