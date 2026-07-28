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
	| 'whatsappConfig'
	| 'whatsappTemplates'
	| 'whatsappAutomationRules'
	| 'whatsappMessages'

export type DataLoadingScope = {
	section: string
	settingsSection?: string
	canViewEconomy: boolean
}

export function beginDataLoad(
	activeControllers: Set<AbortController>,
	preserveActiveLoads = false,
) {
	if (!preserveActiveLoads) {
		cancelDataLoads(activeControllers)
	}

	const controller = new AbortController()
	activeControllers.add(controller)
	return controller
}

export function cancelDataLoads(activeControllers: Set<AbortController>) {
	for (const controller of activeControllers) {
		controller.abort()
	}
	activeControllers.clear()
}

export function beginDataSetLoading(
	loadCounts: Map<DataSetKey, number>,
	keys: readonly DataSetKey[],
): ReadonlySet<DataSetKey> {
	for (const key of keys) {
		loadCounts.set(key, (loadCounts.get(key) ?? 0) + 1)
	}
	return new Set(loadCounts.keys())
}

export function finishDataSetLoading(
	loadCounts: Map<DataSetKey, number>,
	keys: readonly DataSetKey[],
): ReadonlySet<DataSetKey> {
	for (const key of keys) {
		const nextCount = (loadCounts.get(key) ?? 0) - 1
		if (nextCount > 0) {
			loadCounts.set(key, nextCount)
		} else {
			loadCounts.delete(key)
		}
	}
	return new Set(loadCounts.keys())
}

const sectionDataSets: Record<LoadDataSection, readonly DataSetKey[]> = {
	dashboard: [
		'dashboard',
		'cash',
		'businessProfile',
		'services',
		'sectors',
		'whatsappConfig',
		'whatsappTemplates',
		'whatsappAutomationRules',
	],
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
		'whatsappConfig',
		'whatsappTemplates',
		'whatsappAutomationRules',
		'whatsappMessages',
	],
	tasks: ['tasks', 'employees'],
	customers: [
		'customers',
		'vehicles',
		'services',
		'whatsappConfig',
		'whatsappTemplates',
		'whatsappMessages',
	],
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
		'services',
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
		'whatsappConfig',
		'whatsappTemplates',
		'whatsappMessages',
	],
	services: ['services', 'serviceMaterials', 'sectors', 'customers', 'vehicles'],
	notifications: ['publicRequests', 'customers', 'vehicles', 'services', 'sectors'],
	settings: ['businessProfile', 'employees', 'services', 'sectors'],
	// El buscador global consulta /search/ por su cuenta; solo necesita los
	// datasets de shell (sidebar) que se agregan siempre.
	search: [],
}

const shellDataSets: readonly DataSetKey[] = ['businessProfile', 'publicRequests', 'tasks']

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
	'whatsappConfig',
	'whatsappTemplates',
	'whatsappAutomationRules',
	'whatsappMessages',
])

function isLoadDataSection(section: string): section is LoadDataSection {
	return loadDataSections.includes(section as LoadDataSection)
}

export function dataSetKeysForSection({
	section,
	settingsSection,
	canViewEconomy,
}: DataLoadingScope): DataSetKey[] {
	const targetSection = isLoadDataSection(section) ? section : 'dashboard'
	const keys = [...sectionDataSets[targetSection], ...shellDataSets]
	if (targetSection === 'settings' && settingsSection === 'whatsapp') {
		keys.push(
			'whatsappConfig',
			'whatsappTemplates',
			'whatsappAutomationRules',
			'whatsappMessages',
		)
	}
	const allowedKeys = canViewEconomy
		? keys
		: keys.filter((key) => !economyOnlyDataSets.has(key))
	return Array.from(new Set(allowedKeys))
}
