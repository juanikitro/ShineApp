import { type AnyRecord, money, numberValue } from '@/lib/page-support'

export function supplierListInsight(supplier: AnyRecord) {
	return supplier.list_insights ?? {}
}

export function filterToolsForSearch(
	tools: AnyRecord[],
	search: string,
	toolStatusLabels: Record<string, string>,
) {
	const term = search.toLowerCase()
	if (!term) return tools
	return tools.filter((item) =>
		[
			item.name,
			toolStatusLabels[item.status],
			item.status,
			item.notes,
		].some((value) =>
			String(value ?? '')
				.toLowerCase()
				.includes(term),
		),
	)
}

export function filterSuppliersForSearch(
	suppliers: AnyRecord[],
	search: string,
) {
	const term = search.trim().toLowerCase()
	if (!term) return suppliers
	return suppliers.filter((item) => {
		const insights = item.list_insights ?? {}
		return [
			item.name,
			item.legal_name,
			item.category,
			item.tax_condition,
			item.contact_name,
			item.phone,
			item.email,
			item.tax_id,
			item.website,
			insights.last_purchase_on,
		].some((value) =>
			String(value ?? '')
				.toLowerCase()
				.includes(term),
		)
	})
}

export function materialUnitValue(material: AnyRecord) {
	return numberValue(
		material.last_purchase_unit_cost ?? material.estimated_unit_cost,
	)
}

export function materialStockValue(material: AnyRecord) {
	if (material.stock_value !== undefined && material.stock_value !== null) {
		return numberValue(material.stock_value)
	}
	return numberValue(material.stock_quantity) * materialUnitValue(material)
}

export function toolTotalValue(tool: AnyRecord) {
	if (tool.total_value !== undefined && tool.total_value !== null) {
		return numberValue(tool.total_value)
	}
	return numberValue(tool.quantity) * numberValue(tool.unit_value)
}

export function materialSelectOptions(materials: AnyRecord[]) {
	return materials.map((item) => ({
		value: String(item.id),
		label: item.name,
		meta: `stock ${item.stock_quantity} ${item.unit} - costo ${money(item.estimated_unit_cost)}`,
	}))
}

export function openMaterialUnitSelectOptions(materialOpenUnits: AnyRecord[]) {
	return materialOpenUnits
		.filter((item) => item.status === 'open')
		.map((item) => ({
			value: String(item.id),
			label: item.material_name ?? 'Unidad abierta',
			meta: `abierta ${item.opened_at} - ${item.consumptions_count ?? 0} usos`,
		}))
}

export function supplierSelectOptions(suppliers: AnyRecord[]) {
	return suppliers.map((item) => ({
		value: String(item.id),
		label: item.name,
		meta: [
			item.legal_name,
			item.category,
			item.contact_name,
			item.phone,
			item.email,
		]
			.filter(Boolean)
			.join(' - '),
	}))
}
