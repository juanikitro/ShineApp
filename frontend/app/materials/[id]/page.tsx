'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function MaterialDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/materials/${id}/`}
			entityLabel="Material"
			buildTitle={(d) => String(d.name ?? `Material #${id}`)}
			buildFields={(d) => [
				{ label: 'Nombre', value: d.name ? String(d.name) : null },
				{ label: 'SKU', value: d.sku ? String(d.sku) : null },
				{ label: 'Categoría', value: d.category ? String(d.category) : null },
				{ label: 'Unidad', value: d.unit ? String(d.unit) : null },
				{ label: 'Stock actual', value: d.stock_quantity != null ? String(d.stock_quantity) : null },
				{ label: 'Stock mínimo', value: d.minimum_stock != null ? String(d.minimum_stock) : null },
				{
					label: 'Costo unitario estimado',
					value: d.estimated_unit_cost != null ? `$${String(d.estimated_unit_cost)}` : null,
				},
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
