export const loadDataSections = [
	'dashboard',
	'agenda',
	'customers',
	'suppliers',
	'vehicles',
	'cash',
	'debts',
	'inventory',
	'tools',
	'quotes',
	'services',
	'notifications',
	'settings',
] as const

export type LoadDataSection = (typeof loadDataSections)[number]

export type DataSetKey =
	| 'dashboard'
	| 'cash'
	| 'customers'
	| 'vehicles'
	| 'services'
	| 'reservations'
	| 'workOrders'
	| 'payments'
	| 'debts'
	| 'debtPayments'
	| 'materials'
	| 'suppliers'
	| 'stockMovements'
	| 'materialOpenUnits'
	| 'purchases'
	| 'consumptions'
	| 'tools'
	| 'quotes'
	| 'publicRequests'
	| 'businessProfile'
	| 'employees'
	| 'dailyCapacities'

export type DataLoadingScope = {
	section: string
	settingsSection?: string
	canViewEconomy: boolean
}

const sectionDataSets: Record<LoadDataSection, readonly DataSetKey[]> = {
	dashboard: ['dashboard', 'cash', 'businessProfile'],
	agenda: [
		'customers',
		'vehicles',
		'services',
		'reservations',
		'workOrders',
		'materials',
		'materialOpenUnits',
		'quotes',
	],
	customers: ['customers', 'vehicles', 'services'],
	suppliers: [
		'suppliers',
		'materials',
		'stockMovements',
		'purchases',
		'debts',
		'customers',
		'reservations',
	],
	vehicles: ['vehicles', 'customers'],
	cash: [
		'cash',
		'payments',
		'debts',
		'debtPayments',
		'workOrders',
		'materials',
		'suppliers',
		'stockMovements',
		'purchases',
		'businessProfile',
	],
	debts: ['debts', 'debtPayments', 'suppliers', 'cash'],
	inventory: [
		'materials',
		'suppliers',
		'stockMovements',
		'materialOpenUnits',
		'purchases',
		'consumptions',
		'workOrders',
		'customers',
		'reservations',
	],
	tools: ['tools'],
	quotes: [
		'quotes',
		'customers',
		'vehicles',
		'services',
		'reservations',
		'businessProfile',
	],
	services: ['services', 'customers', 'vehicles'],
	notifications: ['publicRequests', 'customers', 'vehicles', 'services'],
	settings: ['businessProfile', 'employees', 'dailyCapacities', 'services'],
}

const shellDataSets: readonly DataSetKey[] = ['businessProfile', 'publicRequests']

const economyOnlyDataSets = new Set<DataSetKey>([
	'cash',
	'payments',
	'debts',
	'debtPayments',
	'materials',
	'suppliers',
	'stockMovements',
	'materialOpenUnits',
	'purchases',
	'consumptions',
	'tools',
	'quotes',
	'publicRequests',
	'businessProfile',
	'employees',
	'dailyCapacities',
])

function isLoadDataSection(section: string): section is LoadDataSection {
	return loadDataSections.includes(section as LoadDataSection)
}

export function dataSetKeysForSection({
	section,
	canViewEconomy,
}: DataLoadingScope): DataSetKey[] {
	const targetSection = isLoadDataSection(section) ? section : 'dashboard'
	const keys = [...sectionDataSets[targetSection], ...shellDataSets]
	const allowedKeys = canViewEconomy
		? keys
		: keys.filter((key) => !economyOnlyDataSets.has(key))
	return Array.from(new Set(allowedKeys))
}
