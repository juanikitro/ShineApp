'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
	draft: 'Borrador',
	sent: 'Enviada',
	accepted: 'Aceptada',
	rejected: 'Rechazada',
}

export default function QuoteDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/quotes/${id}/`}
			entityLabel="Cotización"
			buildTitle={(d) => {
				const name = d.customer_snapshot_name || d.customer_name
				return name ? String(name) : `Cotización #${id}`
			}}
			buildFields={(d) => [
				{
					label: 'Cliente',
					value: d.customer_snapshot_name ? String(d.customer_snapshot_name) : null,
				},
				{ label: 'Código público', value: d.public_code ? String(d.public_code) : null },
				{ label: 'Fecha', value: d.quote_date ? String(d.quote_date) : null },
				{ label: 'Válida hasta', value: d.valid_until ? String(d.valid_until) : null },
				{
					label: 'Estado',
					value: d.status ? (QUOTE_STATUS_LABELS[String(d.status)] ?? String(d.status)) : null,
				},
				{ label: 'Subtotal', value: d.subtotal != null ? `$${String(d.subtotal)}` : null },
				{ label: 'Total', value: d.total != null ? `$${String(d.total)}` : null },
				{ label: 'Observaciones', value: d.observations ? String(d.observations) : null },
			]}
		/>
	)
}
