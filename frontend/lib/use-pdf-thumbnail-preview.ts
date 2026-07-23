import { useEffect, useState } from 'react'

import { renderPdfPreviewDataUrl } from '@/lib/pdf-preview'

export function usePdfThumbnailPreview(
	source: string | null,
	enabled: boolean,
	maxWidth: number,
) {
	const [thumbnail, setThumbnail] = useState<string | null>(null)
	const [status, setStatus] = useState<
		'idle' | 'loading' | 'ready' | 'error'
	>('idle')

	useEffect(() => {
		if (!enabled || !source) {
			setThumbnail(null)
			setStatus('idle')
			return
		}

		const abortController = new AbortController()
		setThumbnail(null)
		setStatus('loading')

		renderPdfPreviewDataUrl(source, {
			maxWidth,
			signal: abortController.signal,
		})
			.then((nextThumbnail) => {
				if (abortController.signal.aborted) return
				setThumbnail(nextThumbnail)
				setStatus('ready')
			})
			.catch(() => {
				if (abortController.signal.aborted) return
				setThumbnail(null)
				setStatus('error')
			})

		return () => {
			abortController.abort()
		}
	}, [enabled, maxWidth, source])

	return {
		thumbnail,
		status,
	}
}
