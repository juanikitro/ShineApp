import { type AnyRecord, numberValue, quantity } from '@/lib/page-support'

export function materialUsageRowsForMaterial(
	material: AnyRecord,
	consumptions: AnyRecord[],
	stockMovements: AnyRecord[],
) {
	const legacyRows = consumptions.filter(
		(item) => String(item.material) === String(material.id),
	)
	const movementRows = stockMovements
		.filter((movement) => movement.movement_type === 'consumption')
		.flatMap((movement) =>
			(movement.lines ?? [])
				.filter((line: AnyRecord) => String(line.material) === String(material.id))
				.map((line: AnyRecord) => ({
					...line,
					id: `stock-${movement.id}-${line.id}`,
					material: line.material,
					material_name: line.material_name,
					consumed_at: movement.occurred_on,
					work_order: movement.work_order,
					estimated_total_cost: line.estimated_total_cost,
				})),
		)
	return [...legacyRows, ...movementRows]
}

export function materialOpenUnitRowsForMaterial(
	material: AnyRecord,
	materialOpenUnits: AnyRecord[],
) {
	return materialOpenUnits.filter(
		(item) => String(item.material) === String(material.id),
	)
}

export function workOrderMaterialUsageSummary(
	workOrder: AnyRecord,
	consumptions: AnyRecord[],
	stockMovements: AnyRecord[],
	materials: AnyRecord[],
) {
	const legacyRows = consumptions.filter(
		(item) => String(item.work_order) === String(workOrder.id),
	)
	const movementRows = stockMovements
		.filter(
			(movement) =>
				movement.movement_type === 'consumption' &&
				String(movement.work_order) === String(workOrder.id),
		)
		.flatMap((movement) =>
			(movement.lines ?? []).map((line: AnyRecord) => ({
				...line,
				material: line.material,
				material_name: line.material_name,
			})),
		)
	const rows = [...legacyRows, ...movementRows]
	if (!rows.length) return null

	const groups = rows.reduce<AnyRecord[]>((summary, item) => {
		const materialId = String(item.material)
		const existing = summary.find((group) => group.materialId === materialId)
		const material = materials.find(
			(candidate) => String(candidate.id) === materialId,
		)
		if (existing) {
			existing.quantity += numberValue(item.quantity)
			existing.openUnitUses += item.open_unit ? 1 : 0
			return summary
		}
		summary.push({
			materialId,
			name: item.material_name ?? material?.name ?? 'Material',
			quantity: numberValue(item.quantity),
			openUnitUses: item.open_unit ? 1 : 0,
			unit: material?.unit ?? '',
		})
		return summary
	}, [])

	const first = groups[0]
	const extraCount = groups.length - 1
	const firstLabel =
		first.openUnitUses > 0 && first.quantity === 0
			? `${first.name}: ${first.openUnitUses} usos de unidad abierta`
			: `${first.name}: ${quantity(first.quantity, first.unit)}`
	return {
		label: firstLabel,
		 extra: extraCount > 0 ? ` +${extraCount}` : '',
	}
}

export function materialUsageSummary(material: AnyRecord, rows: AnyRecord[]) {
	return {
		count:
			material.usage_count !== undefined
				? numberValue(material.usage_count)
				: rows.length,
		totalQuantity:
			material.total_consumed_quantity !== undefined
				? numberValue(material.total_consumed_quantity)
				: rows.reduce(
						(total, item) => total + numberValue(item.quantity),
						0,
					),
		totalCost:
			material.total_consumed_estimated_cost !== undefined
				? numberValue(material.total_consumed_estimated_cost)
				: rows.reduce(
						(total, item) => total + numberValue(item.estimated_total_cost),
						0,
					),
		lastConsumedAt: material.last_consumed_at ?? rows[0]?.consumed_at ?? null,
		rows,
	}
}

export function historicalUsageDetails(
	historicalUsageForm: AnyRecord,
	materials: AnyRecord[],
	reservations: AnyRecord[],
	today: string,
) {
	const selectedMaterial = materials.find(
		(item) => String(item.id) === historicalUsageForm.material,
	)
	const selectedReservationIds: string[] = historicalUsageForm.reservations ?? []
	const pastServiceReservations = historicalUsageForm.service
		? reservations
				.filter(
					(item) =>
						String(item.service) === String(historicalUsageForm.service) &&
						item.status !== 'canceled' &&
						String(item.day) <= today,
				)
				.sort((a, b) => String(b.day).localeCompare(String(a.day)))
		: []
	const selectedCount = selectedReservationIds.length
	const unitQuantity =
		numberValue(historicalUsageForm.stock_quantity_to_decrement) || 1
	const consumptionPerService = selectedCount > 0 ? unitQuantity / selectedCount : 0
	const unitCost = selectedMaterial
		? numberValue(selectedMaterial.estimated_unit_cost)
		: 0
	const materialUnit = selectedMaterial?.unit ?? 'unidad'

	return {
		selectedMaterial,
		selectedReservationIds,
		pastServiceReservations,
		selectedCount,
		unitQuantity,
		consumptionPerService,
		unitCost,
		materialUnit,
	}
}

export function historicalUsageFormForToggledReservation(
	historicalUsageForm: AnyRecord,
	reservationId: string,
	reservations: AnyRecord[],
) {
	const selectedReservationIds: string[] = historicalUsageForm.reservations ?? []
	const selected = new Set(selectedReservationIds)
	if (selected.has(reservationId)) selected.delete(reservationId)
	else selected.add(reservationId)
	const nextIds = Array.from(selected)
	const days = (nextIds
		.map(
			(id) => reservations.find((item) => String(item.id) === id)?.day,
		)
		.filter(Boolean) as string[]).sort()
	return {
		...historicalUsageForm,
		reservations: nextIds,
		opened_at: days.length ? days[0] : '',
		finished_at: days.length ? days[days.length - 1] : '',
	}
}
