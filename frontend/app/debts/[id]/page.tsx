'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function DebtDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/debts/${id}/`}
			entityLabel="Deuda"
			buildTitle={(d) => String(d.concept ?? `Deuda #${id}`)}
			buildFields={(d) => [
				{ label: 'Concepto', value: d.concept ? String(d.concept) : null },
				{ label: 'Acreedor', value: d.creditor ? String(d.creditor) : null },
				{ label: 'Monto original', value: d.principal_amount != null ? `$${String(d.principal_amount)}` : null },
				{ label: 'Saldo pendiente', value: d.remaining_amount != null ? `$${String(d.remaining_amount)}` : null },
				{ label: 'Fecha origen', value: d.origin_date ? String(d.origin_date) : null },
				{ label: 'Fecha vencimiento', value: d.due_date ? String(d.due_date) : null },
				{ label: 'Estado', value: d.status_display ? String(d.status_display) : null },
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
