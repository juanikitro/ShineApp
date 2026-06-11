'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

const TOOL_STATUS_LABELS: Record<string, string> = {
	active: 'Activa',
	maintenance: 'En mantenimiento',
	decommissioned: 'Dada de baja',
}

export default function ToolDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/tools/${id}/`}
			entityLabel="Herramienta"
			buildTitle={(d) => String(d.name ?? `Herramienta #${id}`)}
			buildFields={(d) => [
				{ label: 'Nombre', value: d.name ? String(d.name) : null },
				{ label: 'Cantidad', value: d.quantity != null ? String(d.quantity) : null },
				{
					label: 'Estado',
					value: d.status ? (TOOL_STATUS_LABELS[String(d.status)] ?? String(d.status)) : null,
				},
				{
					label: 'Valor unitario',
					value: d.unit_value != null ? `$${String(d.unit_value)}` : null,
				},
				{ label: 'Fecha de compra', value: d.purchased_at ? String(d.purchased_at) : null },
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
