export const loadDataSections = [
	'dashboard',
	'agenda',
	'tasks',
	'customers',
	'suppliers',
	'vehicles',
	'cash',
	'debts',
	'fixed-expenses',
	'inventory',
	'tools',
	'quotes',
	'services',
	'notifications',
	'settings',
	'search',
] as const

export type LoadDataSection = (typeof loadDataSections)[number]

export type DataSetKey =
	| 'dashboard'
	| 'cash'
	| 'tasks'
	| 'customers'
	| 'vehicles'
	| 'services'
	| 'serviceMaterials'
	| 'sectors'
	| 'reservations'
	| 'workOrders'
	| 'payments'
	| 'debts'
	| 'debtPayments'
	| 'fixedExpenses'
	| 'fixedExpenseOccurrences'
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
		'sectors',
		'reservations',
		'workOrders',
		'materials',
		'materialOpenUnits',
		'quotes',
	],
	tasks: ['tasks', 'employees'],
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
	'fixed-expenses': ['fixedExpenses', 'fixedExpenseOccurrences', 'suppliers', 'cash'],
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
		'sectors',
		'reservations',
		'businessProfile',
	],
	services: ['services', 'serviceMaterials', 'sectors', 'customers', 'vehicles'],
	notifications: ['publicRequests', 'customers', 'vehicles', 'services', 'sectors'],
	settings: ['businessProfile', 'employees', 'services', 'sectors'],
	// El buscador global consulta /search/ por su cuenta; solo necesita los
	// datasets de shell (sidebar) que se agregan siempre.
	search: [],
}

const shellDataSets: readonly DataSetKey[] = ['businessProfile', 'publicRequests']

const economyOnlyDataSets = new Set<DataSetKey>([
	'cash',
	'payments',
	'debts',
	'debtPayments',
	'fixedExpenses',
	'fixedExpenseOccurrences',
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
	'serviceMaterials',
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
