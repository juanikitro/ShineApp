'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

const INTERVAL_LABELS: Record<string, string> = {
	day: 'días',
	week: 'semanas',
	month: 'meses',
	year: 'años',
}

export default function FixedExpenseDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/fixed-expenses/${id}/`}
			entityLabel="Gasto fijo"
			buildTitle={(d) => String(d.concept ?? `Gasto fijo #${id}`)}
			buildFields={(d) => {
				const intervalUnit = d.interval_unit ? (INTERVAL_LABELS[String(d.interval_unit)] ?? String(d.interval_unit)) : null
				const interval = d.interval_count && intervalUnit ? `Cada ${String(d.interval_count)} ${intervalUnit}` : null
				return [
					{ label: 'Concepto', value: d.concept ? String(d.concept) : null },
					{ label: 'Monto', value: d.amount != null ? `$${String(d.amount)}` : null },
					{ label: 'Frecuencia', value: interval },
					{ label: 'Método de pago', value: d.payment_method ? String(d.payment_method) : null },
					{ label: 'Proveedor', value: d.supplier_name ? String(d.supplier_name) : null },
					{ label: 'Pago automático', value: d.auto_pay != null ? (d.auto_pay ? 'Sí' : 'No') : null },
					{ label: 'Notas', value: d.notes ? String(d.notes) : null },
				]
			}}
		/>
	)
}
