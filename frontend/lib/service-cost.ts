// Costo y ratio estimado por servicio. Espejo en frontend de la lógica del
// backend (catalog.models.Service): jerarquía receta > costo estimado manual,
// y `isEstimated` SOLO cuando se cae al costo manual (sin receta).

type ServiceRecord = Record<string, any> | null | undefined

function toNumber(value: any): number | null {
	if (value === null || value === undefined || String(value).trim() === '') {
		return null
	}
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

// Costo de la receta: suma de `cantidad x costo_unitario`. null si no hay receta.
// Si hay receta devuelve el total aunque sea 0 (la receta es dato existente).
export function serviceRecipeCost(service: ServiceRecord): number | null {
	const materials = service?.materials
	if (!Array.isArray(materials) || materials.length === 0) {
		return null
	}
	return materials.reduce((sum: number, line: any) => {
		const qty = toNumber(line?.quantity) ?? 0
		const unitCost = toNumber(line?.material_unit_cost) ?? 0
		return sum + qty * unitCost
	}, 0)
}

// Costo efectivo del servicio. isEstimated = true solo con costo manual (sin receta).
export function serviceEstimatedCost(service: ServiceRecord): {
	cost: number | null
	isEstimated: boolean
} {
	const recipe = serviceRecipeCost(service)
	if (recipe !== null) {
		return { cost: recipe, isEstimated: false }
	}
	const manual = toNumber(service?.estimated_material_cost)
	if (manual !== null) {
		return { cost: manual, isEstimated: true }
	}
	return { cost: null, isEstimated: false }
}

// Ratios de rentabilidad. marginRate y costRatio en porcentaje (0-100+).
// Devuelve null en cada campo que no se pueda calcular (sin costo o sin precio > 0).
export function serviceCostRatios(
	price: any,
	cost: number | null,
): {
	margin: number | null
	marginRate: number | null
	costRatio: number | null
} {
	const priceNumber = toNumber(price)
	if (cost === null || priceNumber === null) {
		return { margin: null, marginRate: null, costRatio: null }
	}
	const margin = priceNumber - cost
	if (priceNumber === 0) {
		return { margin, marginRate: null, costRatio: null }
	}
	return {
		margin,
		marginRate: (margin / priceNumber) * 100,
		costRatio: (cost / priceNumber) * 100,
	}
}

// Formatea un ratio en porcentaje a un string corto, o '—' si es null.
export function formatRatioLabel(value: number | null): string {
	if (value === null) {
		return '—'
	}
	return `${value.toFixed(1)}%`
}
