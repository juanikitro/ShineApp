export function detailKindFromTitle(title: string) {
	return (
		{
			Cliente: 'customer',
			Vehiculo: 'vehicle',
			Servicio: 'service',
			Reserva: 'reservation',
			'Orden de trabajo': 'workorder',
			Material: 'material',
			Proveedor: 'supplier',
			'Movimiento de stock': 'stock-movement',
			'Unidad abierta': 'material-open-unit',
			'Compra de material': 'material-purchase',
			'Consumo de material': 'material-consumption',
			Herramienta: 'tool',
			Cotizacion: 'quote',
			'Movimiento de caja': 'cash-movement',
			Deuda: 'debt',
			'Pago de deuda': 'debt-payment',
		}[title] ?? ''
	)
}

export function detailEndpoint(kind: string, id: string | number) {
	const paths: Record<string, string> = {
		customer: `/customers/${id}/`,
		vehicle: `/vehicles/${id}/`,
		service: `/services/${id}/`,
		reservation: `/reservations/${id}/`,
		workorder: `/work-orders/${id}/`,
		material: `/materials/${id}/`,
		supplier: `/suppliers/${id}/`,
		tool: `/tools/${id}/`,
		'material-purchase': `/material-purchases/${id}/`,
		'material-consumption': `/material-consumptions/${id}/`,
		quote: `/quotes/${id}/`,
		'cash-movement': `/cash-movements/${id}/`,
		debt: `/debts/${id}/`,
		'debt-payment': `/debt-payments/${id}/`,
		'fixed-expense': `/fixed-expenses/${id}/`,
	}
	return paths[kind]
}

export function apiPathForRecord(
	kind: string,
	id: string | number | null | undefined,
) {
	if (id === null || id === undefined || id === '') return ''
	const detailPath = detailEndpoint(kind, id)
	if (detailPath) return detailPath
	const paths: Record<string, string> = {
		payment: `/payments/${id}/`,
		'stock-movement': `/stock-movements/${id}/`,
		'material-open-unit': `/material-open-units/${id}/`,
	}
	return paths[kind] ?? ''
}

export function isEditableDetailKind(kind: string) {
	return [
		'customer',
		'vehicle',
		'service',
		'reservation',
		'workorder',
		'material',
		'supplier',
		'material-purchase',
		'material-consumption',
		'tool',
		'quote',
		'cash-movement',
		'debt',
		'debt-payment',
	].includes(kind)
}
