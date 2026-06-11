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

export default function ReservationDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/reservations/${id}/`}
			entityLabel="Reserva"
			buildTitle={(d) => String(d.customer_name ?? `Reserva #${id}`)}
			buildFields={(d) => [
				{ label: 'Cliente', value: d.customer_name ? String(d.customer_name) : null },
				{ label: 'Vehículo', value: d.vehicle_label ? String(d.vehicle_label) : null },
				{ label: 'Servicio', value: d.service_name ? String(d.service_name) : null },
				{ label: 'Fecha', value: d.day ? String(d.day) : null },
				{ label: 'Horario', value: d.start_time ? String(d.start_time) : null },
				{
					label: 'Estado',
					value: d.status ? (STATUS_LABELS[String(d.status)] ?? String(d.status)) : null,
				},
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
