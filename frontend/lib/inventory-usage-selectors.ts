import {
	materialOpenUnitRowsForMaterial,
	materialUsageSummary as materialUsageSummaryForRows,
	materialUsageRowsForMaterial,
	workOrderMaterialUsageSummary as workOrderMaterialUsageSummaryForSources,
} from './inventory-usage'
import { type AnyRecord } from './page-support'

type InventoryUsageSources = {
	consumptions: AnyRecord[]
	materialOpenUnits: AnyRecord[]
	materials: AnyRecord[]
	stockMovements: AnyRecord[]
}

export function inventoryUsageSelectors({
	consumptions,
	materialOpenUnits,
	materials,
	stockMovements,
}: InventoryUsageSources) {
	function materialUsageRows(material: AnyRecord) {
		return materialUsageRowsForMaterial(
			material,
			consumptions,
			stockMovements,
		)
	}

	function materialOpenUnitRows(material: AnyRecord) {
		return materialOpenUnitRowsForMaterial(material, materialOpenUnits)
	}

	function workOrderMaterialUsageSummary(workOrder: AnyRecord) {
		return workOrderMaterialUsageSummaryForSources(
			workOrder,
			consumptions,
			stockMovements,
			materials,
		)
	}

	function materialUsageSummary(material: AnyRecord) {
		return materialUsageSummaryForRows(material, materialUsageRows(material))
	}

	return {
		materialOpenUnitRows,
		materialUsageRows,
		materialUsageSummary,
		workOrderMaterialUsageSummary,
	}
}
