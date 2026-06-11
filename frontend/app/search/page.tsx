'use client'

import { useEffect } from 'react'

// El buscador vive ahora como seccion del SPA principal. Esta ruta queda solo
// como redirect de compatibilidad para links/bookmarks viejos a /search?q=...
export default function SearchRedirect() {
	useEffect(() => {
		const query = new URLSearchParams(window.location.search).get('q') ?? ''
		const target = query
			? `/?section=search&q=${encodeURIComponent(query)}`
			: '/?section=search'
		window.location.replace(target)
	}, [])

	return null
}
