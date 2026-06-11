'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function SupplierDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/suppliers/${id}/`}
			entityLabel="Proveedor"
			buildTitle={(d) => String(d.name ?? `Proveedor #${id}`)}
			buildFields={(d) => [
				{ label: 'Nombre', value: d.name ? String(d.name) : null },
				{ label: 'Razón social', value: d.legal_name ? String(d.legal_name) : null },
				{ label: 'Categoría', value: d.category ? String(d.category) : null },
				{ label: 'CUIT', value: d.tax_id ? String(d.tax_id) : null },
				{ label: 'Contacto', value: d.contact_name ? String(d.contact_name) : null },
				{ label: 'Teléfono', value: d.phone ? String(d.phone) : null },
				{ label: 'Email', value: d.email ? String(d.email) : null },
				{ label: 'Dirección', value: d.address ? String(d.address) : null },
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
