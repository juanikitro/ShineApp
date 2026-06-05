import { type DataSetKey } from './data-loading'

type AnyRecord = Record<string, any>

export type AppDataScope = {
	period: {
		from: string
		to: string
	}
	selectedDay: string
}

export type AppDataLoaders = {
	apiFetch: <T>(path: string, options?: RequestInit & { signal?: AbortSignal }) => Promise<T>
	apiList: <T>(path: string, options?: RequestInit & { signal?: AbortSignal }) => Promise<T[]>
}

export type AppDataEntry = readonly [DataSetKey, unknown]

export type AppDataAppliers = Record<DataSetKey, (data: any) => void>

export function dataSetCacheKey(key: DataSetKey, scope: AppDataScope) {
	if (key === 'dashboard') {
		return `${key}:${scope.period.from}:${scope.period.to}`
	}
	if (key === 'cash') return `${key}:${scope.selectedDay}`
	return key
}

export async function loadAppDataSet(
	key: DataSetKey,
	scope: AppDataScope,
	loaders: AppDataLoaders,
) {
	switch (key) {
		case 'dashboard':
			return loaders.apiFetch<AnyRecord>(
				`/dashboard/summary/?from=${scope.period.from}&to=${scope.period.to}`,
			)
		case 'cash':
			return loaders.apiFetch<AnyRecord>(
				`/cash/daily/?date=${scope.selectedDay}`,
			)
		case 'customers':
			return loaders.apiList<AnyRecord>('/customers/')
		case 'vehicles':
			return loaders.apiList<AnyRecord>('/vehicles/')
		case 'services':
			return loaders.apiList<AnyRecord>('/services/')
		case 'reservations':
			return loaders.apiList<AnyRecord>('/reservations/')
		case 'workOrders':
			return loaders.apiList<AnyRecord>('/work-orders/')
		case 'payments':
			return loaders.apiList<AnyRecord>('/payments/')
		case 'debts':
			return loaders.apiList<AnyRecord>('/debts/')
		case 'debtPayments':
			return loaders.apiList<AnyRecord>('/debt-payments/')
		case 'materials':
			return loaders.apiList<AnyRecord>('/materials/')
		case 'suppliers':
			return loaders.apiList<AnyRecord>('/suppliers/')
		case 'stockMovements':
			return loaders.apiList<AnyRecord>('/stock-movements/')
		case 'materialOpenUnits':
			return loaders.apiList<AnyRecord>('/material-open-units/')
		case 'purchases':
			return loaders.apiList<AnyRecord>('/material-purchases/')
		case 'consumptions':
			return loaders.apiList<AnyRecord>('/material-consumptions/')
		case 'tools':
			return loaders.apiList<AnyRecord>('/tools/')
		case 'quotes':
			return loaders.apiList<AnyRecord>('/quotes/')
		case 'publicRequests':
			return loaders.apiList<AnyRecord>('/public-requests/')
		case 'businessProfile':
			return loaders.apiFetch<AnyRecord>('/settings/business-profile/', {
				cache: 'default',
			})
		case 'employees':
			return loaders.apiList<AnyRecord>('/auth/employees/')
		case 'dailyCapacities':
			return loaders.apiList<AnyRecord>('/daily-capacities/')
	}
}

export function loadAppDataSets(
	keys: DataSetKey[],
	scope: AppDataScope,
	loaders: AppDataLoaders,
): Promise<AppDataEntry[]> {
	return Promise.all(
		keys.map(
			async (key) =>
				[key, await loadAppDataSet(key, scope, loaders)] as const,
		),
	)
}

export function applyAppDataEntry(
	key: DataSetKey,
	data: unknown,
	appliers: AppDataAppliers,
) {
	appliers[key](data)
}
