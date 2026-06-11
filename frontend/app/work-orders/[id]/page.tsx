'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

const STATUS_LABELS: Record<string, string> = {
	pending: 'Pendiente',
	confirmed: 'Confirmada',
	in_progress: 'En proceso',
	ready: 'Listo',
	delivered: 'Entregado',
	canceled: 'Cancelada',
}

export default function WorkOrderDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/work-orders/${id}/`}
			entityLabel="Orden de trabajo"
			buildTitle={(d) => String(d.customer_name ?? `Orden #${id}`)}
			buildFields={(d) => [
				{ label: 'Cliente', value: d.customer_name ? String(d.customer_name) : null },
				{ label: 'Servicio', value: d.service_name ? String(d.service_name) : null },
				{
					label: 'Estado',
					value: d.status ? (STATUS_LABELS[String(d.status)] ?? String(d.status)) : null,
				},
				{
					label: 'Total',
					value: d.total_amount != null ? `$${String(d.total_amount)}` : null,
				},
				{
					label: 'Pagado',
					value: d.paid_amount != null ? `$${String(d.paid_amount)}` : null,
				},
				{
					label: 'Saldo',
					value: d.balance_due != null ? `$${String(d.balance_due)}` : null,
				},
				{ label: 'Notas internas', value: d.internal_notes ? String(d.internal_notes) : null },
			]}
		/>
	)
}
