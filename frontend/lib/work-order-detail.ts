type WorkOrderRecord = Record<string, any>

export function workOrderServicePatch(
	data: WorkOrderRecord,
	serviceId: string,
	services: WorkOrderRecord[],
	canViewEconomy: boolean,
) {
	const service = services.find((item) => String(item.id) === serviceId)
	const patch: WorkOrderRecord = { service: serviceId }
	if (canViewEconomy) {
		patch.total_amount = service?.base_price ?? data.total_amount
	}
	return patch
}

export function workOrderStatusFocusKey(canViewEconomy: boolean) {
	return canViewEconomy
		? 'detail.workorder.total_amount'
		: 'detail.workorder.estimated_delivery_at'
}
