'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function CashMovementDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/cash-movements/${id}/`}
			entityLabel="Movimiento de caja"
			buildTitle={(d) =>
				d.description
					? String(d.description)
					: d.category
						? String(d.category)
						: `Movimiento #${id}`
			}
			buildFields={(d) => [
				{
					label: 'Tipo',
					value: d.movement_type === 'income' ? 'Ingreso' : d.movement_type === 'expense' ? 'Egreso' : d.movement_type ? String(d.movement_type) : null,
				},
				{ label: 'Categoría', value: d.category ? String(d.category) : null },
				{ label: 'Subcategoría', value: d.subcategory ? String(d.subcategory) : null },
				{ label: 'Monto', value: d.amount != null ? `$${String(d.amount)}` : null },
				{ label: 'Descripción', value: d.description ? String(d.description) : null },
				{ label: 'Fecha', value: d.occurred_at ? String(d.occurred_at).slice(0, 10) : null },
			]}
		/>
	)
}
