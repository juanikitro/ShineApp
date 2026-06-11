'use client'

import { ArrowLeft } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { StandaloneAppLayout } from '@/app/components/layout/StandaloneAppLayout'
import { apiFetch } from '@/lib/api'

type Field = {
	label: string
	value: ReactNode
}

type Props = {
	apiPath: string
	entityLabel: string
	buildFields: (data: Record<string, unknown>) => Field[]
	buildTitle?: (data: Record<string, unknown>) => string
}

function backToSearch() {
	const ref = typeof document !== 'undefined' ? document.referrer : ''
	if (ref && new URL(ref, window.location.href).pathname === '/search') {
		history.back()
	} else {
		window.location.href = '/search'
	}
}

export function DetailPage({ apiPath, entityLabel, buildFields, buildTitle }: Props) {
	const [data, setData] = useState<Record<string, unknown> | null>(null)
	const [loading, setLoading] = useState(true)
	const [notFound, setNotFound] = useState(false)

	useEffect(() => {
		let cancelled = false
		apiFetch<Record<string, unknown>>(apiPath)
			.then((d) => {
				if (!cancelled) setData(d)
			})
			.catch((err: { status?: number }) => {
				if (!cancelled) {
					if (err?.status === 404) setNotFound(true)
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [apiPath])

	const title = data && buildTitle ? buildTitle(data) : entityLabel
	const fields = data ? buildFields(data) : []

	return (
		<StandaloneAppLayout>
			<div className="detail-page">
				<div className="detail-page-nav">
					<button
						type="button"
						className="detail-page-back"
						onClick={backToSearch}
						aria-label="Volver al buscador"
					>
						<ArrowLeft size={14} aria-hidden="true" />
						Volver
					</button>
					<span className="detail-page-entity-label">{entityLabel}</span>
				</div>

				{loading ? (
					<div className="detail-page-loading">
						<span className="global-search-spinner global-search-spinner--lg" aria-hidden="true" />
					</div>
				) : notFound ? (
					<div className="detail-page-not-found">
						<p>Registro no encontrado.</p>
						<a href="/search" className="detail-page-back-link">Volver al buscador</a>
					</div>
				) : data ? (
					<>
						<h1 className="detail-page-title">{title}</h1>
						<dl className="detail-page-fields">
							{fields.map((field) => (
								<div key={field.label} className="detail-field">
									<dt className="detail-field-label">{field.label}</dt>
									<dd className="detail-field-value">{field.value ?? '—'}</dd>
								</div>
							))}
						</dl>
					</>
				) : null}
			</div>
		</StandaloneAppLayout>
	)
}
