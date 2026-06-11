'use client'

import { DetailPage } from '@/app/components/search/DetailPage'

function getIdFromUrl() {
	if (typeof window === 'undefined') return ''
	return window.location.pathname.split('/').filter(Boolean).pop() ?? ''
}

export default function VehicleDetailPage() {
	const id = getIdFromUrl()
	return (
		<DetailPage
			apiPath={`/vehicles/${id}/`}
			entityLabel="Vehículo"
			buildTitle={(d) => String(d.label ?? d.license_plate ?? `Vehículo #${id}`)}
			buildFields={(d) => [
				{ label: 'Patente', value: d.license_plate ? String(d.license_plate) : null },
				{ label: 'Marca', value: d.brand ? String(d.brand) : null },
				{ label: 'Modelo', value: d.model ? String(d.model) : null },
				{ label: 'Color', value: d.color ? String(d.color) : null },
				{ label: 'Tipo', value: d.vehicle_type_label ? String(d.vehicle_type_label) : null },
				{ label: 'Cliente', value: d.customer_name ? String(d.customer_name) : null },
				{ label: 'Notas', value: d.notes ? String(d.notes) : null },
			]}
		/>
	)
}
