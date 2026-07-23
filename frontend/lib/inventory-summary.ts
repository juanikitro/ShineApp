import { materialStockValue, toolTotalValue } from './inventory-display'
import { type AnyRecord, numberValue } from './page-support'

type MaterialUsageSummary = {
	count: number
	totalCost: number
}

export function inventorySummaryForMaterials(
	materials: AnyRecord[],
	materialUsageSummary: (material: AnyRecord) => MaterialUsageSummary,
) {
	return materials.reduce(
		(summary, material) => {
			const usage = materialUsageSummary(material)
			return {
				stockValue: summary.stockValue + materialStockValue(material),
				usageCount: summary.usageCount + usage.count,
				consumedCost: summary.consumedCost + usage.totalCost,
				openUnits:
					summary.openUnits + numberValue(material.open_units_active_count),
			}
		},
		{ stockValue: 0, usageCount: 0, consumedCost: 0, openUnits: 0 },
	)
}

export function toolSummaryForTools(tools: AnyRecord[]) {
	return tools.reduce(
		(summary, tool) => ({
			records: summary.records + 1,
			quantity: summary.quantity + numberValue(tool.quantity),
			value: summary.value + toolTotalValue(tool),
		}),
		{ records: 0, quantity: 0, value: 0 },
	)
}
