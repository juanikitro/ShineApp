'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function CustomerDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/customers/${id}/`}
			entityLabel="Cliente"
			buildTitle={(d) => String(d.name ?? `Cliente #${id}`)}
			buildFields={(d) => [
				{ label: 'Nombre', value: String(d.name ?? '') },
				{ label: 'Teléfono', value: d.phone ? String(d.phone) : null },
				{ label: 'Email', value: d.email ? String(d.email) : null },
				{ label: 'CUIT / DNI', value: d.tax_id ? String(d.tax_id) : null },
				{ label: 'Dirección', value: d.billing_address ? String(d.billing_address) : null },
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
