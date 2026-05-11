type VehicleOptionSource = {
	brand?: unknown
	model?: unknown
}

type VehicleCatalogEntry = {
	brand: string
	models: string[]
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = [
	{
		brand: 'Audi',
		models: ['A1', 'A3', 'A4', 'A5', 'Q2', 'Q3', 'Q5', 'Q7'],
	},
	{
		brand: 'BMW',
		models: ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 5', 'X1', 'X3', 'X5', 'X6'],
	},
	{
		brand: 'Chery',
		models: ['QQ', 'Tiggo 2', 'Tiggo 3', 'Tiggo 4', 'Tiggo 5', 'Tiggo 7', 'Tiggo 8'],
	},
	{
		brand: 'Chevrolet',
		models: ['Classic', 'Corsa', 'Cruze', 'Montana', 'Onix', 'Prisma', 'S10', 'Spin', 'Tracker'],
	},
	{
		brand: 'Citroen',
		models: ['Aircross', 'Berlingo', 'C3', 'C4', 'C4 Cactus', 'C5 Aircross', 'Jumpy'],
	},
	{
		brand: 'Fiat',
		models: ['Argo', 'Cronos', 'Fiorino', 'Mobi', 'Palio', 'Pulse', 'Siena', 'Strada', 'Toro', 'Uno'],
	},
	{
		brand: 'Ford',
		models: ['EcoSport', 'Fiesta', 'Focus', 'Ka', 'Kuga', 'Maverick', 'Mondeo', 'Ranger', 'Territory'],
	},
	{
		brand: 'Honda',
		models: ['Accord', 'City', 'Civic', 'CR-V', 'Fit', 'HR-V', 'WR-V'],
	},
	{
		brand: 'Hyundai',
		models: ['Creta', 'H-1', 'HB20', 'Santa Fe', 'Tucson', 'i10', 'i20', 'i30'],
	},
	{
		brand: 'Jeep',
		models: ['Cherokee', 'Commander', 'Compass', 'Grand Cherokee', 'Renegade', 'Wrangler'],
	},
	{
		brand: 'Kia',
		models: ['Carnival', 'Cerato', 'Picanto', 'Rio', 'Sorento', 'Soul', 'Sportage'],
	},
	{
		brand: 'Mercedes-Benz',
		models: ['Clase A', 'Clase B', 'Clase C', 'Clase E', 'GLA', 'GLC', 'Sprinter'],
	},
	{
		brand: 'Mitsubishi',
		models: ['ASX', 'Eclipse Cross', 'L200', 'Montero', 'Outlander'],
	},
	{
		brand: 'Nissan',
		models: ['Frontier', 'Kicks', 'March', 'Murano', 'Note', 'Sentra', 'Versa', 'X-Trail'],
	},
	{
		brand: 'Peugeot',
		models: ['2008', '206', '207', '208', '3008', '308', '408', 'Expert', 'Partner'],
	},
	{
		brand: 'RAM',
		models: ['1500', '2500', '3500', 'Rampage'],
	},
	{
		brand: 'Renault',
		models: ['Captur', 'Clio', 'Duster', 'Kangoo', 'Kwid', 'Logan', 'Megane', 'Oroch', 'Sandero'],
	},
	{
		brand: 'Suzuki',
		models: ['Baleno', 'Grand Vitara', 'Jimny', 'Swift', 'Vitara'],
	},
	{
		brand: 'Toyota',
		models: ['Camry', 'Corolla', 'Corolla Cross', 'Etios', 'Hilux', 'RAV4', 'SW4', 'Yaris'],
	},
	{
		brand: 'Volkswagen',
		models: ['Amarok', 'Gol', 'Nivus', 'Polo', 'Saveiro', 'T-Cross', 'Taos', 'Vento', 'Virtus'],
	},
	{
		brand: 'Volvo',
		models: ['S60', 'V40', 'XC40', 'XC60', 'XC90'],
	},
]

function cleanVehicleText(value: unknown) {
	return String(value ?? '').trim()
}

function vehicleTextKey(value: unknown) {
	return cleanVehicleText(value).toLocaleLowerCase('es-AR')
}

function mergeVehicleValues(...groups: Array<unknown[] | undefined>) {
	const values = new Map<string, string>()
	groups.flatMap((group) => group ?? []).forEach((value) => {
		const cleaned = cleanVehicleText(value)
		if (!cleaned) return
		const key = vehicleTextKey(cleaned)
		if (!values.has(key)) {
			values.set(key, cleaned)
		}
	})
	return Array.from(values.values()).sort((a, b) => a.localeCompare(b))
}

function catalogEntryForBrand(brand: unknown) {
	const brandKey = vehicleTextKey(brand)
	return VEHICLE_CATALOG.find((entry) => vehicleTextKey(entry.brand) === brandKey)
}

export function vehicleBrandOptions(historicalBrands: unknown[] = []) {
	return mergeVehicleValues(
		VEHICLE_CATALOG.map((entry) => entry.brand),
		historicalBrands,
	)
}

export function vehicleModelOptionsForBrand(
	brand: unknown,
	vehicles: VehicleOptionSource[] = [],
	extraModels: unknown[] = [],
) {
	const brandKey = vehicleTextKey(brand)
	if (!brandKey) {
		return mergeVehicleValues(extraModels)
	}
	const knownModels = catalogEntryForBrand(brand)?.models ?? []
	const historicalModels = vehicles
		.filter((vehicle) => vehicleTextKey(vehicle.brand) === brandKey)
		.map((vehicle) => vehicle.model)

	return mergeVehicleValues(knownModels, historicalModels, extraModels)
}
