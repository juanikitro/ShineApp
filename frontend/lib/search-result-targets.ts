import type { Section } from './page-support'

export type SearchResultTarget = {
	section: Section
	detailTitle: string
	apiPath: (id: number) => string
}

// Mapea cada tipo de resultado del buscador global a su seccion del SPA y al
// modal de detalle/edicion correspondiente. `fixed_expense` no tiene detail
// modal: abre el form modal de gastos fijos. `task` solo navega: TasksPanel
// edita en linea.
export const searchResultTargets: Record<string, SearchResultTarget> = {
	customer: {
		section: 'customers',
		detailTitle: 'Cliente',
		apiPath: (id) => `/customers/${id}/`,
	},
	task: {
		section: 'tasks',
		detailTitle: '',
		apiPath: (id) => `/tasks/${id}/`,
	},
	vehicle: {
		section: 'vehicles',
		detailTitle: 'Vehiculo',
		apiPath: (id) => `/vehicles/${id}/`,
	},
	reservation: {
		section: 'agenda',
		detailTitle: 'Reserva',
		apiPath: (id) => `/reservations/${id}/`,
	},
	work_order: {
		section: 'agenda',
		detailTitle: 'Orden de trabajo',
		apiPath: (id) => `/work-orders/${id}/`,
	},
	service: {
		section: 'services',
		detailTitle: 'Servicio',
		apiPath: (id) => `/services/${id}/`,
	},
	cash_movement: {
		section: 'cash',
		detailTitle: 'Movimiento de caja',
		apiPath: (id) => `/cash-movements/${id}/`,
	},
	material: {
		section: 'inventory',
		detailTitle: 'Material',
		apiPath: (id) => `/materials/${id}/`,
	},
	supplier: {
		section: 'suppliers',
		detailTitle: 'Proveedor',
		apiPath: (id) => `/suppliers/${id}/`,
	},
	tool: {
		section: 'tools',
		detailTitle: 'Herramienta',
		apiPath: (id) => `/tools/${id}/`,
	},
	quote: {
		section: 'quotes',
		detailTitle: 'Cotizacion',
		apiPath: (id) => `/quotes/${id}/`,
	},
	debt: {
		section: 'debts',
		detailTitle: 'Deuda',
		apiPath: (id) => `/debts/${id}/`,
	},
	fixed_expense: {
		section: 'fixed-expenses',
		detailTitle: '',
		apiPath: (id) => `/fixed-expenses/${id}/`,
	},
}
