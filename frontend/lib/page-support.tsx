import { MouseSensor, TouchSensor } from '@dnd-kit/core'
import {
	Bell,
	CalendarClock,
	CalendarDays,
	Building2,
	Car,
	CheckCircle2,
	CircleAlert,
	CreditCard,
	FileText,
	Gauge,
	Hammer,
	ListTodo,
	Package,
	ReceiptText,
	Search,
	Settings,
	Undo2,
	Users,
	Wrench,
	X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppBrand } from '@/app/components/layout/AppBrand'
import { Field } from '@/app/components/ui/Field'
import { apiFetch, publicApiFetch, setStoredToken } from '@/lib/api'
import {
	currencyArsFormatter,
	dateFormatter,
	dateTimeFormatter,
	dayMonthFormatter,
	decimalFormatter,
	fullDateFormatter,
	weekdayShortFormatter,
} from '@/lib/intl-format'
import { type ApiErrorNotice, formatApiError } from '@/lib/api-errors'
import { type AgendaOperationalPhase } from '@/lib/agenda'
import { type WorkingHoursEntry, DEFAULT_WORKING_HOURS } from '@/lib/scheduling-availability'
import { toastIconVariants, toastVariants } from '@/lib/motion-spec'

type AnyRecord = Record<string, any>
type ToastTone = 'success' | 'error'
type ToastAction = {
	label: string
	title?: string
	disabled?: boolean
	onClick: () => void
}
type ToastNotice = {
	id: number
	tone: ToastTone
	title: string
	description?: string
	fields?: ApiErrorNotice['fields']
	action?: ToastAction
	visibleMs?: number
}
type ToastDraft = Omit<ToastNotice, 'id'>
type ActionMessage<T> = string | ((result: T) => string | null | undefined)
type EntityFeedbackAction = 'created' | 'updated' | 'deleted'
type CategoryTree = Record<string, string[]>
type ExpenseCategoryTree = CategoryTree
type FormModalKind =
	| 'customer'
	| 'vehicle'
	| 'quote'
	| 'service'
	| 'payment'
	| 'cash-movement'
	| 'cash-load'
	| 'expense-classification'
	| 'debt'
	| 'debt-payment'
	| 'fixed-expense'
	| 'fixed-expense-pay'
	| 'material'
	| 'supplier'
	| 'stock-movement'
	| 'material-purchase'
	| 'material-open-unit'
	| 'material-historical-usage'
	| 'material-consumption'
	| 'tool'
	| 'employee'

type Section =
	| 'dashboard'
	| 'agenda'
	| 'tasks'
	| 'customers'
	| 'suppliers'
	| 'vehicles'
	| 'cash'
	| 'debts'
	| 'fixed-expenses'
	| 'inventory'
	| 'tools'
	| 'quotes'
	| 'services'
	| 'notifications'
	| 'settings'
	| 'search'

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'shineapp-theme'
const AGENDA_VISIBLE_DAYS = 5

function toIsoDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
	const [year, month, day] = value.split('-').map(Number)
	return new Date(year, month - 1, day)
}

function addDays(value: string, offset: number) {
	const date = parseIsoDate(value)
	date.setDate(date.getDate() + offset)
	return toIsoDate(date)
}

function dayOffset(from: string, to: string) {
	return Math.round(
		(parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) /
			86_400_000,
	)
}

function monthRange(value: string, offset = 0) {
	const date = parseIsoDate(value)
	const year = date.getFullYear()
	const month = date.getMonth() + offset
	return {
		from: toIsoDate(new Date(year, month, 1)),
		to: toIsoDate(new Date(year, month + 1, 0)),
	}
}

function formatDayName(value: string) {
	return weekdayShortFormatter.format(parseIsoDate(value))
}

function formatDayLabel(value: string) {
	return dayMonthFormatter.format(parseIsoDate(value))
}

function formatFullDateLabel(value: string) {
	return fullDateFormatter.format(parseIsoDate(value))
}

function formatDateTimeLabel(value: any) {
	if (!value) return 'Sin fecha'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return String(value)
	}
	return dateTimeFormatter.format(date)
}

function formatDateLabel(value: any) {
	if (!value) return 'Sin fecha'
	const raw = value instanceof Date ? value : String(value)
	const normalized =
		typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
			? `${raw}T00:00:00`
			: raw
	const date = new Date(normalized)
	if (Number.isNaN(date.getTime())) {
		return String(value)
	}
	return dateFormatter.format(date)
}

function birthdayText(customer: AnyRecord) {
	if (!customer?.birthday_label) return 'Sin cumpleanos'
	if (customer.days_until_birthday === 0) return `Cumple hoy (${customer.birthday_label})`
	if (customer.days_until_birthday === 1) return `Cumple manana (${customer.birthday_label})`
	if (customer.days_until_birthday !== null && customer.days_until_birthday !== undefined) {
		return `Cumple en ${customer.days_until_birthday} dias (${customer.birthday_label})`
	}
	return `Cumple ${customer.birthday_label}`
}

function blankQuoteItem() {
	return { service: '', quantity: '1', unit_price: '' }
}

function blankCustomerForm() {
	return {
		id: '',
		name: '',
		phone: '',
		email: '',
		tax_id: '',
		billing_address: '',
		birthday_month: '',
		birthday_day: '',
		notes: '',
	}
}

function blankBusinessForm() {
	return {
		name: '',
		cuit: '',
		vat_condition: '',
		contact_phone: '',
		contact_email: '',
		address: '',
		maps_url: '',
		default_quote_validity_days: '7',
		default_quote_tax_rate: '0',
		default_quote_discount_rate: '0',
		default_quote_terms: '',
		default_quote_payment_instructions: '',
		use_reservation_times: true,
		show_stay_days_in_agenda: true,
		allow_overlapping_reservations: false,
		enforce_capacity_limit: true,
		default_capacity_wash: '8',
		default_capacity_detailing: '4',
		public_landing_enabled: true,
		public_landing_intro: '',
		allow_public_booking_requests: true,
		allow_public_quote_requests: true,
		public_hidden_service_ids: [] as number[],
		public_show_service_description: true,
		public_show_service_price: false,
		opening_time: null,
		closing_time: null,
		working_hours: DEFAULT_WORKING_HOURS as WorkingHoursEntry[],
		income_category_tree: normalizeIncomeCategoryTree(
			DEFAULT_INCOME_CATEGORY_TREE,
		),
		expense_category_tree: normalizeExpenseCategoryTree(
			DEFAULT_EXPENSE_CATEGORY_TREE,
		),
	}
}

function blankReservationForm(day = '', startTime = '') {
	return {
		customer: '',
		vehicle: '',
		service: '',
		day,
		exit_day: '',
		start_time: startTime,
		exit_time: '',
		items: [blankQuoteItem()],
		notes: '',
	}
}

function blankQuoteForm(reservationDay = '') {
	return {
		customer: '',
		vehicle: '',
		reservation_day: reservationDay,
		reservation_start_time: '',
		valid_until: '',
		tax_rate: '',
		discount_rate: '',
		terms: '',
		payment_instructions: '',
		items: [blankQuoteItem()],
		observations: '',
	}
}

const DEFAULT_PAYMENT_TYPE = 'payment'
const DEFAULT_PAYMENT_METHOD = 'cash'
const DEFAULT_EXPENSE_CATEGORY = 'Otros'
const DEFAULT_INCOME_CATEGORY = 'Pago'
const DEFAULT_INCOME_CATEGORY_TREE: CategoryTree = {
	Pago: ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'],
	Sena: ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'],
	Adelanto: ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'],
	Prestamo: ['General'],
	Inversion: ['Aporte de capital', 'Aporte de socio'],
	Venta: ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'],
	'Pago de orden': ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'],
	Otros: ['General'],
}
const DEFAULT_EXPENSE_CATEGORY_TREE: ExpenseCategoryTree = {
	Alquiler: ['Local', 'Deposito', 'Cochera'],
	Inversion: [
		'Herramientas',
		'Maquinarias',
		'Remodelaciones',
		'Equipamiento',
		'Tecnologia',
	],
	Servicios: [
		'Agua',
		'Alquiler',
		'Comida',
		'Gas',
		'Internet',
		'Luz',
		'Sueldo',
		'Telefono',
	],
	'Materiales e insumos': [
		'Shampoo',
		'Ceras',
		'Abrillantadores',
		'Panos',
		'Microfibras',
		'Quimicos',
		'Descartables',
		'Compra de materiales',
	],
	Mantenimiento: ['Equipos', 'Local', 'Vehiculos', 'Repuestos'],
	'Impuestos y tasas': ['Monotributo', 'IVA', 'Municipal', 'Bancarios'],
	Administracion: ['Contador', 'Software', 'Papeleria', 'Limpieza'],
	'Marketing y ventas': ['Publicidad', 'Promociones', 'Carteleria'],
	Personal: [
		'Comida',
		'Transporte',
		'Salud',
		'Entretenimiento',
		'Ropa',
		'Hogar',
		'Educacion',
		'Cuidado personal',
		'Suscripciones',
		'Mascotas',
		'Viajes',
		'Otros',
	],
	Deudas: ['Pago de deuda', 'Otros'],
	Ajustes: ['Ajuste de cierre', 'Diferencia de caja'],
	Otros: ['General'],
}
const businessVatConditionOptions = [
	{
		value: 'responsable_inscripto',
		label: 'Responsable inscripto',
	},
	{
		value: 'monotributo',
		label: 'Monotributo',
	},
	{
		value: 'exento',
		label: 'Exento',
	},
	{
		value: 'consumidor_final',
		label: 'Consumidor final',
	},
]
const CASH_CATEGORY_FALLBACKS: Record<'income' | 'expense', string[]> = {
	income: Object.keys(DEFAULT_INCOME_CATEGORY_TREE),
	expense: Object.keys(DEFAULT_EXPENSE_CATEGORY_TREE),
}

function defaultCashCategory(movementType: string) {
	return movementType === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY
}

function normalizeCategoryTree(value: any, fallback: CategoryTree): CategoryTree {
	const source =
		value && typeof value === 'object' && !Array.isArray(value)
			? value
			: fallback
	const normalized: CategoryTree = {}
	Object.entries(source).forEach(([category, rawSubcategories]) => {
		const categoryName = String(category ?? '').trim()
		if (!categoryName || !Array.isArray(rawSubcategories)) return
		const subcategories = Array.from(
			new Set(
				rawSubcategories
					.map((item) => String(item ?? '').trim())
					.filter(Boolean),
			),
		)
		if (subcategories.length) {
			normalized[categoryName] = subcategories
		}
	})
	return Object.keys(normalized).length
		? normalized
		: normalizeCategoryTree(fallback, fallback)
}

function normalizeExpenseCategoryTree(value: any): ExpenseCategoryTree {
	return normalizeCategoryTree(value, DEFAULT_EXPENSE_CATEGORY_TREE)
}

function normalizeIncomeCategoryTree(value: any): CategoryTree {
	return normalizeCategoryTree(value, DEFAULT_INCOME_CATEGORY_TREE)
}

function expenseCategoryTreeToText(value: any) {
	return Object.entries(normalizeExpenseCategoryTree(value))
		.map(([category, subcategories]) => `${category}: ${subcategories.join(', ')}`)
		.join('\n')
}

function expenseCategoryTreeFromText(value: string) {
	const tree: ExpenseCategoryTree = {}
	value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.forEach((line) => {
			const [rawCategory, ...rawRest] = line.split(':')
			const category = rawCategory.trim()
			if (!category) return
			const subcategories = rawRest
				.join(':')
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
			tree[category] = subcategories.length ? subcategories : ['General']
		})
	return normalizeExpenseCategoryTree(tree)
}

function expenseCategoryPairs(value: any) {
	return Object.entries(normalizeExpenseCategoryTree(value)).flatMap(
		([category, subcategories]) =>
			subcategories.map((subcategory) => ({ category, subcategory })),
	)
}

function incomeCategoryPairs(value: any) {
	return Object.entries(normalizeIncomeCategoryTree(value)).flatMap(
		([category, subcategories]) =>
			subcategories.map((subcategory) => ({ category, subcategory })),
	)
}

function expenseSubcategoriesForCategory(value: any, category: any) {
	const categoryName = String(category ?? '').trim()
	if (!categoryName) return []
	return normalizeExpenseCategoryTree(value)[categoryName] ?? []
}

function incomeSubcategoriesForCategory(value: any, category: any) {
	const categoryName = String(category ?? '').trim()
	if (!categoryName) return []
	return normalizeIncomeCategoryTree(value)[categoryName] ?? []
}

function upsertExpenseCategoryPair(
	value: any,
	category: any,
	subcategory: any,
	previous?: { category?: any; subcategory?: any },
) {
	const categoryName = String(category ?? '').trim()
	const subcategoryName = String(subcategory ?? '').trim()
	const tree = removeExpenseCategoryPair(
		value,
		previous?.category,
		previous?.subcategory,
	)
	if (!categoryName || !subcategoryName) return tree
	const current = tree[categoryName] ?? []
	if (!current.includes(subcategoryName)) {
		tree[categoryName] = [...current, subcategoryName]
	}
	return normalizeExpenseCategoryTree(tree)
}

function upsertIncomeCategoryPair(
	value: any,
	category: any,
	subcategory: any,
	previous?: { category?: any; subcategory?: any },
) {
	const categoryName = String(category ?? '').trim()
	const subcategoryName = String(subcategory ?? '').trim()
	const tree = removeIncomeCategoryPair(
		value,
		previous?.category,
		previous?.subcategory,
	)
	if (!categoryName || !subcategoryName) return tree
	const current = tree[categoryName] ?? []
	if (!current.includes(subcategoryName)) {
		tree[categoryName] = [...current, subcategoryName]
	}
	return normalizeIncomeCategoryTree(tree)
}

function removeExpenseCategoryPair(value: any, category: any, subcategory: any) {
	const categoryName = String(category ?? '').trim()
	const subcategoryName = String(subcategory ?? '').trim()
	const tree = normalizeExpenseCategoryTree(value)
	if (!categoryName || !subcategoryName || !tree[categoryName]) return tree
	const nextSubcategories = tree[categoryName].filter(
		(item) => item !== subcategoryName,
	)
	if (nextSubcategories.length) {
		tree[categoryName] = nextSubcategories
	} else {
		delete tree[categoryName]
	}
	return normalizeExpenseCategoryTree(tree)
}

function removeIncomeCategoryPair(value: any, category: any, subcategory: any) {
	const categoryName = String(category ?? '').trim()
	const subcategoryName = String(subcategory ?? '').trim()
	const tree = normalizeIncomeCategoryTree(value)
	if (!categoryName || !subcategoryName || !tree[categoryName]) return tree
	const nextSubcategories = tree[categoryName].filter(
		(item) => item !== subcategoryName,
	)
	if (nextSubcategories.length) {
		tree[categoryName] = nextSubcategories
	} else {
		delete tree[categoryName]
	}
	return normalizeIncomeCategoryTree(tree)
}

function normalizedAmountInput(value: any) {
	if (value === null || value === undefined || value === '') return ''
	return String(value)
}

function fullPaymentAmountForOrder(order: AnyRecord | null | undefined) {
	return normalizedAmountInput(order?.balance_due ?? order?.total_amount ?? '')
}

function blankPaymentForm(workOrder = '', amount = '') {
	return {
		work_order: workOrder,
		amount,
		payment_type: DEFAULT_PAYMENT_TYPE,
		method: DEFAULT_PAYMENT_METHOD,
		notes: '',
	}
}

function blankAgendaPaymentForm(orderId: string, amount = '') {
	return blankPaymentForm(orderId, amount)
}

function blankDebtForm(originDate: string) {
	return {
		concept: '',
		creditor: '',
		supplier: '',
		principal_amount: '',
		origin_date: originDate,
		due_date: '',
		expense_category: 'Servicios',
		expense_subcategory: 'Otros',
		notes: '',
	}
}

function blankDebtPaymentForm(paidAt: string) {
	return {
		debt: '',
		amount: '',
		paid_at: paidAt,
		method: DEFAULT_PAYMENT_METHOD,
		notes: '',
	}
}

function blankFixedExpenseForm(startDate: string) {
	return {
		id: '',
		concept: '',
		supplier: '',
		amount: '',
		expense_category: 'Servicios',
		expense_subcategory: 'Otros',
		notes: '',
		interval_unit: 'months',
		interval_count: '1',
		start_date: startDate,
		due_offset_days: '0',
		end_date: '',
		max_cycles: '',
		auto_pay: false,
		payment_method: 'transfer',
	}
}

const FEEDBACK_PULSE_MS = 880
const TOAST_VISIBLE_MS = 3400
const TOAST_ERROR_VISIBLE_MS = 6200
const AGENDA_DRAG_MOUSE_DISTANCE = 8
const AGENDA_DRAG_TOUCH_DELAY_MS = 180
const AGENDA_DRAG_TOUCH_TOLERANCE = 10
const AGENDA_INTERACTIVE_SELECTOR =
	'button,a,input,textarea,select,.combo-field,.quick-actions-menu,.quick-actions-trigger'

const entityFeedbackTitles: Record<
	string,
	Partial<Record<EntityFeedbackAction, string>>
> = {
	customer: {
		created: 'Cliente creado',
		updated: 'Cliente editado',
		deleted: 'Cliente dado de baja',
	},
	vehicle: {
		created: 'Vehiculo creado',
		updated: 'Vehiculo editado',
		deleted: 'Vehiculo dado de baja',
	},
	service: {
		created: 'Servicio creado',
		updated: 'Servicio editado',
		deleted: 'Servicio inactivado',
	},
	reservation: {
		created: 'Reserva creada',
		updated: 'Reserva editada',
		deleted: 'Reserva eliminada',
	},
	workorder: {
		updated: 'Trabajo actualizado',
		deleted: 'Trabajo eliminado',
	},
	payment: {
		created: 'Pago registrado',
		updated: 'Pago editado',
		deleted: 'Pago eliminado',
	},
	'cash-movement': {
		created: 'Movimiento registrado',
		updated: 'Movimiento editado',
		deleted: 'Movimiento eliminado',
	},
	debt: {
		created: 'Deuda creada',
		updated: 'Deuda editada',
		deleted: 'Deuda eliminada',
	},
	'debt-payment': {
		created: 'Pago de deuda registrado',
		updated: 'Pago de deuda editado',
		deleted: 'Pago de deuda eliminado',
	},
	'fixed-expense': {
		created: 'Gasto fijo creado',
		updated: 'Gasto fijo editado',
		deleted: 'Gasto fijo eliminado',
	},
	'fixed-expense-occurrence': {
		updated: 'Pago de gasto fijo registrado',
	},
	material: {
		created: 'Material creado',
		updated: 'Material editado',
		deleted: 'Material inactivado',
	},
	supplier: {
		created: 'Proveedor creado',
		updated: 'Proveedor editado',
		deleted: 'Proveedor inactivado',
	},
	'stock-movement': {
		created: 'Movimiento de stock creado',
		updated: 'Movimiento de stock editado',
		deleted: 'Movimiento de stock eliminado',
	},
	'material-purchase': {
		created: 'Compra registrada',
		updated: 'Compra editada',
		deleted: 'Compra eliminada',
	},
	'material-consumption': {
		created: 'Consumo registrado',
		updated: 'Consumo editado',
		deleted: 'Consumo eliminado',
	},
	'material-open-unit': {
		created: 'Unidad abierta registrada',
		updated: 'Unidad abierta actualizada',
		deleted: 'Unidad abierta eliminada',
	},
	tool: {
		created: 'Herramienta creada',
		updated: 'Herramienta editada',
		deleted: 'Herramienta inactivada',
	},
	quote: {
		created: 'Cotizacion creada',
		updated: 'Cotizacion editada',
		deleted: 'Cotizacion eliminada',
	},
}

function entityFeedbackTitle(kind: string, action: EntityFeedbackAction) {
	return entityFeedbackTitles[kind]?.[action] ?? 'Cambio guardado'
}

function successToastDescription(title: string | null | undefined) {
	const normalizedTitle = String(title ?? '').toLowerCase()
	if (!normalizedTitle) return undefined

	if (
		normalizedTitle.includes('pdf descargado') &&
		normalizedTitle.includes('enviada')
	) {
		return 'El archivo se descargo y la cotizacion quedo marcada como enviada.'
	}
	if (normalizedTitle.includes('pdf descargado')) {
		return 'El archivo se genero y quedo descargado.'
	}
	if (normalizedTitle.includes('reserva movida')) {
		return 'La reserva quedo en el nuevo dia de agenda.'
	}
	if (normalizedTitle.includes('reserva ubicada')) {
		return 'Te llevamos a la fecha donde esta cargada la reserva.'
	}
	if (normalizedTitle.includes('estado actualizado')) {
		return 'El nuevo estado quedo guardado y visible en la agenda.'
	}
	if (normalizedTitle.includes('perfil actualizado')) {
		return 'Los datos de tu cuenta quedaron guardados.'
	}
	if (normalizedTitle.includes('caja cerrada')) {
		return 'El cierre del dia quedo registrado.'
	}
	if (normalizedTitle.includes('archivada')) {
		return 'La solicitud dejo de figurar como pendiente.'
	}
	if (
		normalizedTitle.includes('dado de baja') ||
		normalizedTitle.includes('inactiv')
	) {
		return 'El registro dejo de estar activo en los listados principales.'
	}
	if (normalizedTitle.includes('eliminad')) {
		return 'El registro se elimino y la lista quedo actualizada.'
	}
	if (normalizedTitle.includes('cread') || normalizedTitle.includes('registrad')) {
		return 'El nuevo registro quedo guardado y disponible en la app.'
	}
	if (
		normalizedTitle.includes('editad') ||
		normalizedTitle.includes('actualizad') ||
		normalizedTitle.includes('guardad')
	) {
		return 'Los cambios quedaron guardados correctamente.'
	}
	if (normalizedTitle.includes('finalizad')) {
		return 'La accion quedo finalizada y registrada.'
	}
	return 'La accion se completo correctamente.'
}

function canStartAgendaDrag(target: EventTarget | null) {
	return target instanceof HTMLElement && !target.closest(AGENDA_INTERACTIVE_SELECTOR)
}

function moveReservationToDay(
	records: AnyRecord[],
	reservationId: string,
	day: string,
	exitDay?: string | null,
) {
	return records.map((record) =>
		String(record.id) === reservationId
			? {
					...record,
					day,
					...(exitDay !== undefined ? { exit_day: exitDay } : {}),
				}
			: record,
	)
}

function replaceReservationRecord(records: AnyRecord[], nextRecord: AnyRecord) {
	return records.map((record) =>
		String(record.id) === String(nextRecord.id) ? nextRecord : record,
	)
}

function reservationExitOffset(reservation: AnyRecord | null | undefined) {
	const entryDay = String(reservation?.day ?? '')
	const exitDay = String(reservation?.exit_day ?? '')
	if (!entryDay || !exitDay || exitDay < entryDay) {
		return null
	}
	return dayOffset(entryDay, exitDay)
}

class AgendaMouseSensor extends MouseSensor {
	static activators = [
		{
			eventName: 'onMouseDown' as const,
			handler: ({ nativeEvent }: any) => canStartAgendaDrag(nativeEvent.target),
		},
	]
}

class AgendaTouchSensor extends TouchSensor {
	static activators = [
		{
			eventName: 'onTouchStart' as const,
			handler: ({ nativeEvent }: any) => canStartAgendaDrag(nativeEvent.target),
		},
	]
}

function useFlashTarget(durationMs: number) {
	const [flashTarget, setFlashTarget] = useState<string | null>(null)
	const clearRef = useRef<number | null>(null)
	const frameRef = useRef<number | null>(null)

	function clearTimers() {
		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current)
			frameRef.current = null
		}
		if (clearRef.current !== null) {
			window.clearTimeout(clearRef.current)
			clearRef.current = null
		}
	}

	function flash(target?: string | null) {
		if (!target) return
		clearTimers()
		setFlashTarget(null)
		frameRef.current = window.requestAnimationFrame(() => {
			setFlashTarget(target)
			clearRef.current = window.setTimeout(() => {
				setFlashTarget((current) => (current === target ? null : current))
				clearRef.current = null
			}, durationMs)
			frameRef.current = null
		})
	}

	useEffect(() => clearTimers, [])

	return { flashTarget, flash }
}

const today = toIsoDate(new Date())

const sectionMeta: Record<
	Section,
	{ label: string; icon: any; subtitle: string }
> = {
	dashboard: {
		label: 'Dashboard',
		icon: Gauge,
		subtitle: 'Prioridad comercial y operativa del periodo',
	},
	agenda: {
		label: 'Agenda',
		icon: CalendarDays,
		subtitle: 'Reservas, trabajos y seguimiento diario',
	},
	tasks: {
		label: 'Tareas',
		icon: ListTodo,
		subtitle: 'Pendientes del negocio y por empleado',
	},
	customers: {
		label: 'Clientes',
		icon: Users,
		subtitle: 'Cartera, seguimiento y vehiculos',
	},
	suppliers: {
		label: 'Proveedores',
		icon: Building2,
		subtitle: 'Compras, deuda y stock',
	},
	vehicles: {
		label: 'Vehiculos',
		icon: Car,
		subtitle: 'Autos vinculados a clientes',
	},
	cash: {
		label: 'Caja',
		icon: CreditCard,
		subtitle: 'Flujo diario, ajustes y cierre',
	},
	debts: {
		label: 'Deudas',
		icon: ReceiptText,
		subtitle: 'Saldos, vencimientos y pagos parciales',
	},
	'fixed-expenses': {
		label: 'Gastos fijos',
		icon: CalendarClock,
		subtitle: 'Servicios, alquiler y abonos recurrentes',
	},
	inventory: {
		label: 'Materiales',
		icon: Package,
		subtitle: 'Stock, compras y consumo',
	},
	tools: {
		label: 'Herramientas',
		icon: Hammer,
		subtitle: 'Inversion y stock operativo',
	},
	quotes: {
		label: 'Cotizaciones',
		icon: FileText,
		subtitle: 'Presupuestos en PDF',
	},
	services: {
		label: 'Servicios',
		icon: Wrench,
		subtitle: 'Lavados, detailing y combos',
	},
	notifications: {
		label: 'Notificaciones',
		icon: Bell,
		subtitle: 'Solicitudes publicas pendientes',
	},
	settings: {
		label: 'Configuracion',
		icon: Settings,
		subtitle: 'Preferencias operativas del negocio',
	},
	search: {
		label: 'Buscador',
		icon: Search,
		subtitle: 'Resultados en todos los modulos',
	},
}

const economySections: Section[] = [
	'cash',
	'debts',
	'fixed-expenses',
	'inventory',
	'suppliers',
	'tools',
	'quotes',
]

function sectionRequiresEconomy(section: Section) {
	return economySections.includes(section)
}

const employerOnlySections: Section[] = ['notifications', 'settings']

function sectionRequiresEmployer(section: Section) {
	return sectionRequiresEconomy(section) || employerOnlySections.includes(section)
}

const economyDetailKinds = [
	'service',
	'material',
	'supplier',
	'stock-movement',
	'material-open-unit',
	'material-purchase',
	'material-consumption',
	'tool',
	'quote',
	'cash-movement',
	'debt',
	'debt-payment',
]

function detailRequiresEconomy(kind: string) {
	return economyDetailKinds.includes(kind)
}

const reservationLabels: Record<string, string> = {
	pending: 'Pendiente',
	confirmed: 'Confirmada',
	in_progress: 'En proceso',
	ready: 'Listo',
	delivered: 'Entregada',
	canceled: 'Cancelada',
}

const reservationAgendaClassNames: Record<string, string> = {
	pending: 'agenda-operational-card--pending',
	confirmed: 'agenda-operational-card--confirmed',
	in_progress: 'agenda-operational-card--in-progress',
	ready: 'agenda-operational-card--ready',
	delivered: 'agenda-operational-card--completed',
	canceled: 'agenda-operational-card--canceled',
}

const agendaPhaseLabels: Record<AgendaOperationalPhase, string> = {
	entry: 'Ingreso',
	stay: 'Permanece',
	exit: 'Egreso',
}

const orderLabels: Record<string, string> = {
	pending: 'Pendiente',
	confirmed: 'Confirmada',
	in_progress: 'En proceso',
	ready: 'Listo',
	delivered: 'Entregado',
	canceled: 'Cancelada',
}

const debtStatusLabels: Record<string, string> = {
	pending: 'Pendiente',
	partial: 'En pago',
	paid: 'Pagada',
	overdue: 'Vencida',
}

const debtPaymentMethodLabels: Record<string, string> = {
	cash: 'Efectivo',
	card: 'Tarjeta',
	transfer: 'Transferencia',
	other: 'Otro',
}

const fixedExpenseIntervalLabels: Record<string, string> = {
	weeks: 'semanas',
	months: 'meses',
}

const fixedExpenseIntervalOptions = Object.entries(fixedExpenseIntervalLabels).map(
	([value, label]) => ({ value, label }),
)

const toolStatusLabels: Record<string, string> = {
	in_use: 'En uso',
	maintenance: 'Mantenimiento',
	retired: 'Retirada',
}

const toolStatusOptions = Object.entries(toolStatusLabels).map(([value, label]) => ({
	value,
	label,
}))

const serviceTypeLabels: Record<string, string> = {
	wash: 'Lavado',
	detailing: 'Detailing',
	combo: 'Combo',
}

function money(value: any) {
	return currencyArsFormatter.format(Number(value ?? 0))
}

function numberValue(value: any) {
	const number = Number(value ?? 0)
	return Number.isFinite(number) ? number : 0
}

function quantity(value: any, unit = '') {
	const formatted = decimalFormatter.format(numberValue(value))
	return unit ? `${formatted} ${unit}` : formatted
}

function calculatedUnitCost(quantityValue: any, totalValue: any) {
	const amount = numberValue(quantityValue)
	if (amount <= 0) return 0
	return numberValue(totalValue) / amount
}

function asPayload(form: AnyRecord) {
	return Object.fromEntries(
		Object.entries(form).filter(([key]) => key !== 'id'),
	)
}

function cleanCustomerPayload(form: AnyRecord) {
	const payload = asPayload(form)
	payload.birthday_month = payload.birthday_month
		? Number(payload.birthday_month)
		: null
	payload.birthday_day = payload.birthday_day
		? Number(payload.birthday_day)
		: null
	return payload
}

function uniqueValues(items: AnyRecord[], key: string) {
	return Array.from(
		new Set(
			items.map((item) => String(item[key] ?? '').trim()).filter(Boolean),
		),
	).sort((a, b) => a.localeCompare(b))
}

function mergeStringValues(...groups: Array<unknown[] | undefined>) {
	return Array.from(
		new Set(
			groups
				.flatMap((group) => group ?? [])
				.map((value) => String(value ?? '').trim())
				.filter(Boolean),
		),
	).sort((a, b) => a.localeCompare(b))
}

const BUTTON_HOVER_TITLE_ATTR = 'data-hover-title'
const BUTTON_HOVER_TITLE_MANAGED_ATTR = 'data-hover-title-managed'
const BUTTON_HOVER_TITLE_DELAY_MS = 1000
const BUTTON_HOVER_TITLE_MAX_LENGTH = 72
const BUTTON_LOW_INFORMATION_TITLES = new Set([
	'Abrir',
	'Actualizar',
	'Cancelar',
	'Crear',
	'Editar',
	'Eliminar',
	'Finalizar',
	'Guardar',
	'Inactivar',
	'Registrar',
])
const BUTTON_SYMBOL_TITLES: Record<string, string> = {
	'+': 'Agregar',
	'-': 'Quitar',
	'×': 'Cerrar',
	x: 'Cerrar',
	X: 'Cerrar',
	'<': 'Anterior',
	'>': 'Siguiente',
	'‹': 'Anterior',
	'›': 'Siguiente',
	'←': 'Anterior',
	'→': 'Siguiente',
}

function normalizeButtonTitle(value: string | null | undefined) {
	return String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim()
}

function clearButtonHoverTitle(button: HTMLButtonElement) {
	button.removeAttribute(BUTTON_HOVER_TITLE_ATTR)
	button.removeAttribute(BUTTON_HOVER_TITLE_MANAGED_ATTR)
	button.removeAttribute('title')
}

function shouldSuppressButtonHoverTitle(button: HTMLButtonElement) {
	if (button.classList.contains('combo-trigger')) return true

	const sidebar = button.closest('.sidebar')
	if (!sidebar) return false
	if (
		button.classList.contains('theme-switch') ||
		button.classList.contains('sidebar-profile-button')
	) {
		return false
	}

	return sidebar.getAttribute('data-collapsed') !== 'true'
}

function simplifyButtonContext(value: string) {
	return value
		.replace(
			/^(abrir|crear|editar|guardar|mi|nuevo|nueva|registrar)\s+/i,
			'',
		)
		.trim()
}

function resolveButtonContext(button: HTMLButtonElement) {
	const modalTitle = normalizeButtonTitle(
		button
			.closest('.modal-panel')
			?.querySelector('h2')
			?.textContent,
	)
	if (modalTitle) return simplifyButtonContext(modalTitle)

	const topbarTitle = normalizeButtonTitle(
		button
			.closest('.topbar')
			?.querySelector('h1')
			?.textContent,
	)
	if (topbarTitle) return simplifyButtonContext(topbarTitle)

	return ''
}

function enrichRedundantButtonTitle(
	button: HTMLButtonElement,
	title: string,
	text: string,
) {
	if (!title || !text || title.toLowerCase() !== text.toLowerCase()) {
		return title
	}
	if (!BUTTON_LOW_INFORMATION_TITLES.has(text)) return title

	const context = resolveButtonContext(button)
	if (!context || context.toLowerCase() === text.toLowerCase()) return title

	return `${text} ${context.toLowerCase()}`
}

function resolveButtonTextTitle(button: HTMLButtonElement) {
	const text = normalizeButtonTitle(button.textContent)
	if (!text) return ''
	if (BUTTON_SYMBOL_TITLES[text]) return BUTTON_SYMBOL_TITLES[text]
	if (button.classList.contains('record')) return 'Ver detalle'
	if (button.hasAttribute('data-combo-option')) {
		return text ? `Seleccionar ${text}` : 'Seleccionar opcion'
	}
	if (text.length > BUTTON_HOVER_TITLE_MAX_LENGTH) return 'Ver detalle'
	return text
}

function resolveButtonHoverTitle(button: HTMLButtonElement) {
	if (shouldSuppressButtonHoverTitle(button)) return ''

	const existingTitle = normalizeButtonTitle(button.getAttribute('title'))
	const storedTitle = normalizeButtonTitle(
		button.getAttribute(BUTTON_HOVER_TITLE_ATTR),
	)
	const ariaTitle = normalizeButtonTitle(button.getAttribute('aria-label'))
	const textTitle = resolveButtonTextTitle(button)
	const nextTitle =
		existingTitle || ariaTitle || textTitle || storedTitle || 'Boton'

	return enrichRedundantButtonTitle(button, nextTitle, textTitle)
}

function applyButtonHoverTitles(root: ParentNode = document) {
	root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
		const nextTitle = resolveButtonHoverTitle(button)
		if (!nextTitle) {
			clearButtonHoverTitle(button)
			return
		}
		button.setAttribute(BUTTON_HOVER_TITLE_ATTR, nextTitle)
		button.setAttribute(BUTTON_HOVER_TITLE_MANAGED_ATTR, 'true')
		button.removeAttribute('title')
		if (
			!normalizeButtonTitle(button.getAttribute('aria-label')) &&
			!normalizeButtonTitle(button.textContent)
		) {
			button.setAttribute('aria-label', nextTitle)
		}
	})
}

function createButtonHoverTooltip() {
	const tooltip = document.createElement('div')
	tooltip.className = 'button-hover-tooltip'
	tooltip.setAttribute('role', 'tooltip')
	tooltip.setAttribute('aria-hidden', 'true')
	tooltip.innerHTML = '<span class="button-hover-tooltip-title"></span>'
	document.body.appendChild(tooltip)
	return tooltip
}

function buttonFromEventTarget(target: EventTarget | null) {
	return target instanceof Element ? target.closest('button') : null
}

function positionButtonHoverTooltip(
	tooltip: HTMLDivElement,
	button: HTMLButtonElement,
) {
	const viewportGap = 12
	const arrowOffset = 8
	const buttonRect = button.getBoundingClientRect()
	const tooltipRect = tooltip.getBoundingClientRect()
	const placement =
		buttonRect.top >= tooltipRect.height + arrowOffset + viewportGap
			? 'top'
			: 'bottom'
	const preferredLeft =
		buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2
	const left = Math.min(
		window.innerWidth - tooltipRect.width - viewportGap,
		Math.max(viewportGap, preferredLeft),
	)
	const top =
		placement === 'top'
			? buttonRect.top - tooltipRect.height - arrowOffset
			: buttonRect.bottom + arrowOffset
	const arrowLeft = Math.min(
		tooltipRect.width - 18,
		Math.max(18, buttonRect.left + buttonRect.width / 2 - left),
	)

	tooltip.dataset.placement = placement
	tooltip.style.left = `${Math.round(left)}px`
	tooltip.style.top = `${Math.round(top)}px`
	tooltip.style.setProperty('--tooltip-arrow-left', `${arrowLeft}px`)
}

function useButtonHoverTitles() {
	useEffect(() => {
		let frameId = 0
		let showTimeoutId = 0
		let activeButton: HTMLButtonElement | null = null
		let pendingButton: HTMLButtonElement | null = null
		const tooltip = createButtonHoverTooltip()
		const tooltipTitle = tooltip.querySelector<HTMLSpanElement>(
			'.button-hover-tooltip-title',
		)

		function clearShowDelay() {
			if (!showTimeoutId) return
			window.clearTimeout(showTimeoutId)
			showTimeoutId = 0
			pendingButton = null
		}

		function scheduleApply() {
			window.cancelAnimationFrame(frameId)
			frameId = window.requestAnimationFrame(() => {
				applyButtonHoverTitles()
				if (activeButton && document.body.contains(activeButton)) {
					positionButtonHoverTooltip(tooltip, activeButton)
				}
			})
		}

		function hideTooltip() {
			clearShowDelay()
			activeButton = null
			tooltip.dataset.visible = 'false'
			tooltip.setAttribute('aria-hidden', 'true')
		}

		function showTooltip(button: HTMLButtonElement) {
			applyButtonHoverTitles(button.parentElement ?? document)
			const title = normalizeButtonTitle(
				button.getAttribute(BUTTON_HOVER_TITLE_ATTR),
			)
			if (!title || button.disabled) {
				hideTooltip()
				return
			}

			activeButton = button
			if (tooltipTitle) tooltipTitle.textContent = title
			tooltip.dataset.visible = 'true'
			tooltip.setAttribute('aria-hidden', 'false')
			positionButtonHoverTooltip(tooltip, button)
		}

		function scheduleTooltip(button: HTMLButtonElement) {
			if (button.disabled || shouldSuppressButtonHoverTitle(button)) {
				hideTooltip()
				return
			}
			if (button === activeButton || button === pendingButton) return

			hideTooltip()
			pendingButton = button
			showTimeoutId = window.setTimeout(() => {
				showTimeoutId = 0
				if (pendingButton !== button || !document.body.contains(button)) {
					return
				}
				pendingButton = null
				showTooltip(button)
			}, BUTTON_HOVER_TITLE_DELAY_MS)
		}

		function handlePointerOver(event: PointerEvent) {
			const button = buttonFromEventTarget(event.target)
			if (!button || button === activeButton) return
			scheduleTooltip(button)
		}

		function handlePointerOut(event: PointerEvent) {
			const button = buttonFromEventTarget(event.target)
			if (!button || (button !== activeButton && button !== pendingButton)) {
				return
			}
			const nextTarget = event.relatedTarget
			if (
				nextTarget instanceof Node &&
				button.contains(nextTarget)
			) {
				return
			}
			hideTooltip()
		}

		function handleFocusIn(event: FocusEvent) {
			const button = buttonFromEventTarget(event.target)
			if (button) scheduleTooltip(button)
		}

		function handleFocusOut(event: FocusEvent) {
			const button = buttonFromEventTarget(event.target)
			if (!button || (button !== activeButton && button !== pendingButton)) {
				return
			}
			const nextTarget = event.relatedTarget
			if (
				nextTarget instanceof Node &&
				button.contains(nextTarget)
			) {
				return
			}
			hideTooltip()
		}

		scheduleApply()
		const observer = new MutationObserver((mutations) => {
			window.cancelAnimationFrame(frameId)
			frameId = window.requestAnimationFrame(() => {
				if (activeButton && document.body.contains(activeButton)) {
					// Tooltip is visible — only reposition. showTooltip() applies titles
					// lazily on hover, so no full sweep needed while a button is active.
					positionButtonHoverTooltip(tooltip, activeButton)
					return
				}
				// Sweep only the subtrees that actually mutated, not the whole document.
				const seen = new Set<ParentNode>()
				for (const m of mutations) {
					const el =
						m.target instanceof Element ? m.target : m.target.parentElement
					if (el && !seen.has(el)) {
						seen.add(el)
						applyButtonHoverTitles(el)
					}
				}
			})
		})
		observer.observe(document.body, {
			attributeFilter: ['aria-label', 'class', 'data-collapsed', 'title'],
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true,
		})
		document.addEventListener('pointerover', handlePointerOver)
		document.addEventListener('pointerout', handlePointerOut)
		document.addEventListener('focusin', handleFocusIn)
		document.addEventListener('focusout', handleFocusOut)
		document.addEventListener('click', hideTooltip)
		window.addEventListener('resize', scheduleApply)
		window.addEventListener('scroll', scheduleApply, true)

		return () => {
			window.cancelAnimationFrame(frameId)
			clearShowDelay()
			observer.disconnect()
			document.removeEventListener('pointerover', handlePointerOver)
			document.removeEventListener('pointerout', handlePointerOut)
			document.removeEventListener('focusin', handleFocusIn)
			document.removeEventListener('focusout', handleFocusOut)
			document.removeEventListener('click', hideTooltip)
			window.removeEventListener('resize', scheduleApply)
			window.removeEventListener('scroll', scheduleApply, true)
			tooltip.remove()
		}
	}, [])
}

function cashCategoryListId(movementType: any) {
	if (movementType === 'income') return 'cash-category-income-options'
	if (movementType === 'expense') return 'cash-category-expense-options'
	return 'cash-category-options'
}

function DataList({ id, values }: { id: string; values: string[] }) {
	return (
		<datalist id={id}>
			{values.map((value) => (
				<option key={value} value={value} />
			))}
		</datalist>
	)
}

function apiErrorToast(notice: ApiErrorNotice): ToastDraft {
	return {
		tone: 'error',
		title: notice.title,
		description: notice.description,
		fields: notice.fields,
	}
}

function resolveActionMessage<T>(
	message: ActionMessage<T> | undefined,
	result: T,
) {
	return typeof message === 'function' ? message(result) : message
}

export type PendingActionsApi = {
	begin: (key: string) => void
	end: (key: string) => void
	isPending: (key: string) => boolean
	pending: boolean
	pendingKeys: ReadonlySet<string>
}

function usePendingActions(): PendingActionsApi {
	const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(
		() => new Set(),
	)

	function begin(key: string) {
		setPendingKeys((prev) => {
			if (prev.has(key)) return prev
			const next = new Set(prev)
			next.add(key)
			return next
		})
	}

	function end(key: string) {
		setPendingKeys((prev) => {
			if (!prev.has(key)) return prev
			const next = new Set(prev)
			next.delete(key)
			return next
		})
	}

	function isPending(key: string) {
		return pendingKeys.has(key)
	}

	return {
		begin,
		end,
		isPending,
		pending: pendingKeys.size > 0,
		pendingKeys,
	}
}

function useNoticeToasts() {
	const [toasts, setToasts] = useState<ToastNotice[]>([])
	const nextIdRef = useRef(0)

	function dismissToast(id: number) {
		setToasts((current) => current.filter((toast) => toast.id !== id))
	}

	// El auto-cierre se delega en cada NoticeToast para poder pausarlo con hover
	// o foco (WCAG 2.2.1). El hook solo administra la cola de notificaciones.
	function showToast(notice: ToastDraft) {
		const id = nextIdRef.current + 1
		nextIdRef.current = id
		setToasts((current) => [...current.slice(-2), { id, ...notice }])
		return id
	}

	return { toasts, showToast, dismissToast }
}

function NoticeToast({
	toast,
	onDismiss,
}: {
	toast: ToastNotice
	onDismiss: (id: number) => void
}) {
	const Icon = toast.tone === 'success' ? CheckCircle2 : CircleAlert
	const role = toast.tone === 'error' ? 'alert' : 'status'
	const [paused, setPaused] = useState(false)
	const dismissRef = useRef(onDismiss)
	dismissRef.current = onDismiss
	const visibleMs =
		toast.visibleMs ??
		(toast.tone === 'error' ? TOAST_ERROR_VISIBLE_MS : TOAST_VISIBLE_MS)

	// Auto-cierre que se pausa con hover o con foco dentro del toast: evita que
	// desaparezca mientras se lee o se usa "Deshacer" (WCAG 2.2.1 / 2.4.3).
	useEffect(() => {
		if (paused) return
		const timer = window.setTimeout(
			() => dismissRef.current(toast.id),
			visibleMs,
		)
		return () => window.clearTimeout(timer)
	}, [paused, visibleMs, toast.id])

	return (
		<m.div
			className={`toast-notice toast-notice--${toast.tone}`}
			role={role}
			aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
			aria-atomic="true"
			layout
			variants={toastVariants}
			initial="initial"
			animate="animate"
			exit="exit"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocusCapture={() => setPaused(true)}
			onBlurCapture={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					setPaused(false)
				}
			}}
		>
			<m.span
				className="toast-icon"
				aria-hidden="true"
				variants={toastIconVariants}
				initial="initial"
				animate="animate"
				exit="exit"
			>
				<Icon size={28} strokeWidth={2.8} />
			</m.span>
			<div className="toast-content">
				<div className="toast-title">{toast.title}</div>
				{toast.description ? <p>{toast.description}</p> : null}
			</div>
			{toast.fields?.length ? (
				<ul className="alert-fields">
					{toast.fields.slice(0, 8).map((field, index) => (
						<li key={`${field.path}-${index}`}>
							<strong>{field.label}</strong>
							<span>{field.message}</span>
						</li>
					))}
				</ul>
			) : null}
			{toast.action ? (
				<button
					type="button"
					className="toast-action"
					onClick={toast.action.onClick}
					disabled={toast.action.disabled}
					title={toast.action.title}
				>
					<Undo2 size={15} />
					<span>{toast.action.label}</span>
				</button>
			) : null}
			<button
				type="button"
				className="toast-close"
				onClick={() => onDismiss(toast.id)}
				aria-label="Cerrar notificacion"
			>
				<X size={16} />
			</button>
		</m.div>
	)
}

function NoticeToastViewport({
	toasts,
	onDismiss,
}: {
	toasts: ToastNotice[]
	onDismiss: (id: number) => void
}) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted || !toasts.length) return null

	return createPortal(
		<div className="toast-viewport" aria-label="Notificaciones">
			<AnimatePresence initial={false}>
				{toasts.map((toast) => (
					<NoticeToast key={toast.id} toast={toast} onDismiss={onDismiss} />
				))}
			</AnimatePresence>
		</div>,
		document.body,
	)
}

function loginInitialCredentials() {
	const demoLoginEnabled =
		process.env.NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN === '1'
	const demoUsername =
		process.env.NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME?.trim() || 'admin'

	return {
		username: demoLoginEnabled ? demoUsername : '',
		password: '',
	}
}

function trialSignupInitialForm() {
	return {
		business_name: '',
		industry: '',
		owner_name: '',
		email: '',
		phone: '',
		city: '',
		country: 'Argentina',
		password: '',
	}
}

function LoginScreen({
	onLogin,
	sessionExpired = false,
}: {
	onLogin: (token: string, user: AnyRecord) => void
	sessionExpired?: boolean
}) {
	const [mode, setMode] = useState<'login' | 'trial' | 'forgot-password' | 'forgot-password-sent'>('login')
	const [form, setForm] = useState(loginInitialCredentials)
	const [trialForm, setTrialForm] = useState(trialSignupInitialForm)
	const [forgotEmail, setForgotEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const { toasts, showToast, dismissToast } = useNoticeToasts()

	function setError(notice: ApiErrorNotice | null) {
		if (notice) {
			showToast(apiErrorToast(notice))
		}
	}

	async function submitLogin(event: FormEvent) {
		event.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const response = await apiFetch<{
				token: string
				user: AnyRecord
			}>('/auth/login/', {
				method: 'POST',
				body: JSON.stringify(form),
			})
			setStoredToken(response.token)
			onLogin(response.token, response.user)
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo iniciar sesion',
					fallbackDescription:
						'Revisa el usuario y la clave, y vuelve a intentar.',
				}),
			)
		} finally {
			setLoading(false)
		}
	}

	async function submitTrial(event: FormEvent) {
		event.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const response = await publicApiFetch<{
				token: string
				user: AnyRecord
			}>('/auth/trial-signup/', {
				method: 'POST',
				body: JSON.stringify(trialForm),
			})
			setStoredToken(response.token)
			onLogin(response.token, response.user)
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo solicitar la prueba',
					fallbackDescription:
						'Revisa los datos del negocio y vuelve a intentar.',
				}),
			)
		} finally {
			setLoading(false)
		}
	}

	async function submitForgotPassword(event: FormEvent) {
		event.preventDefault()
		setLoading(true)
		setError(null)
		try {
			await publicApiFetch('/auth/password-reset/', {
				method: 'POST',
				body: JSON.stringify({ email: forgotEmail }),
			})
			setMode('forgot-password-sent')
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo enviar el link',
					fallbackDescription: 'Intenta nuevamente en unos minutos.',
				}),
			)
		} finally {
			setLoading(false)
		}
	}

	const signupMode = mode === 'trial'

	return (
		<main className="login-screen">
			<NoticeToastViewport toasts={toasts} onDismiss={dismissToast} />
			{mode === 'forgot-password' ? (
				<form className="login-card" onSubmit={submitForgotPassword}>
					<AppBrand
						className="login-brand"
						subtitle="Recuperar acceso"
						titleAs="h1"
					/>
					<div className="form-grid">
						<Field label="Email de tu cuenta">
							<input
								type="email"
								name="email"
								autoComplete="email"
								required
								value={forgotEmail}
								onChange={(event) => setForgotEmail(event.target.value)}
							/>
						</Field>
						<div className="login-actions">
							<button type="submit" className="primary" disabled={loading}>
								Enviar link
							</button>
							<button
								type="button"
								className="ghost"
								disabled={loading}
								onClick={() => setMode('login')}
							>
								Volver al login
							</button>
						</div>
					</div>
				</form>
			) : mode === 'forgot-password-sent' ? (
				<div className="login-card">
					<AppBrand
						className="login-brand"
						subtitle="Recuperar acceso"
						titleAs="h1"
					/>
					<p>
						Si tu email esta registrado, recibiras un link para restablecer
						tu contrasena. Revisa tu bandeja de entrada.
					</p>
					<div className="login-actions">
						<button
							type="button"
							className="primary"
							onClick={() => setMode('login')}
						>
							Volver al login
						</button>
					</div>
				</div>
			) : (
				<form
					className={signupMode ? 'login-card login-card--trial' : 'login-card'}
					onSubmit={signupMode ? submitTrial : submitLogin}
				>
					<AppBrand
						className="login-brand"
						subtitle={signupMode ? 'Prueba gratuita por 30 dias' : 'Acceso operativo'}
						titleAs="h1"
					/>
					{sessionExpired && !signupMode ? (
						<div className="alert-notice" role="alert">
							<p>Tu sesion expiro. Volve a iniciar sesion para continuar.</p>
						</div>
					) : null}
					{signupMode ? (
						<div className="form-grid login-trial-grid">
							<p className="login-trial-note">
								Sin tarjeta ni cobro automatico. Crea un espacio de prueba
								para operar ShineApp durante 30 dias.
							</p>
							<Field label="Negocio">
								<input
									name="business_name"
									autoComplete="organization"
									required
									value={trialForm.business_name}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											business_name: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Rubro">
								<input
									name="industry"
									autoComplete="organization-title"
									required
									value={trialForm.industry}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											industry: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Responsable">
								<input
									name="owner_name"
									autoComplete="name"
									required
									value={trialForm.owner_name}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											owner_name: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Email">
								<input
									type="email"
									name="email"
									autoComplete="email"
									required
									value={trialForm.email}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											email: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="WhatsApp/telefono">
								<input
									type="tel"
									name="phone"
									autoComplete="tel"
									required
									value={trialForm.phone}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											phone: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Ciudad">
								<input
									name="city"
									autoComplete="address-level2"
									required
									value={trialForm.city}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											city: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Pais">
								<input
									name="country"
									autoComplete="country-name"
									required
									value={trialForm.country}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											country: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Contrasena">
								<input
									type="password"
									name="password"
									autoComplete="new-password"
									required
									minLength={8}
									value={trialForm.password}
									onChange={(event) =>
										setTrialForm({
											...trialForm,
											password: event.target.value,
										})
									}
								/>
							</Field>
							<div className="login-actions">
								<button type="submit" className="primary" disabled={loading}>
									Crear prueba
								</button>
								<button
									type="button"
									className="ghost"
									disabled={loading}
									onClick={() => setMode('login')}
								>
									Ya tengo cuenta
								</button>
							</div>
						</div>
					) : (
						<div className="form-grid">
							<Field label="Usuario">
								<input
									name="username"
									autoComplete="username"
									value={form.username}
									onChange={(event) =>
										setForm({
											...form,
											username: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Clave">
								<input
									type="password"
									name="password"
									autoComplete="current-password"
									value={form.password}
									onChange={(event) =>
										setForm({
											...form,
											password: event.target.value,
										})
									}
								/>
							</Field>
							<div className="login-actions">
								<button type="submit" className="primary" disabled={loading}>
									Ingresar
								</button>
								<button
									type="button"
									className="ghost"
									disabled={loading}
									onClick={() => setMode('trial')}
								>
									Solicitar prueba
								</button>
							</div>
							<button
								type="button"
								className="login-forgot-link"
								disabled={loading}
								onClick={() => setMode('forgot-password')}
							>
								Olvide mi contrasena
							</button>
						</div>
					)}
				</form>
			)}
		</main>
	)
}


export type {
	ActionMessage,
	AnyRecord,
	EntityFeedbackAction,
	FormModalKind,
	Section,
	ThemeMode,
	ToastAction,
	ToastDraft,
	ToastNotice,
	ToastTone,
}
export {
	AGENDA_VISIBLE_DAYS,
	AGENDA_DRAG_MOUSE_DISTANCE,
	AGENDA_DRAG_TOUCH_DELAY_MS,
	AGENDA_DRAG_TOUCH_TOLERANCE,
	AGENDA_INTERACTIVE_SELECTOR,
	CASH_CATEGORY_FALLBACKS,
	DEFAULT_EXPENSE_CATEGORY_TREE,
	DEFAULT_INCOME_CATEGORY_TREE,
	DEFAULT_EXPENSE_CATEGORY,
	DEFAULT_INCOME_CATEGORY,
	DEFAULT_PAYMENT_METHOD,
	DEFAULT_PAYMENT_TYPE,
	FEEDBACK_PULSE_MS,
	THEME_STORAGE_KEY,
	AgendaMouseSensor,
	AgendaTouchSensor,
	DataList,
	LoginScreen,
	NoticeToastViewport,
	addDays,
	agendaPhaseLabels,
	apiErrorToast,
	asPayload,
	businessVatConditionOptions,
	birthdayText,
	loginInitialCredentials,
	blankBusinessForm,
	blankAgendaPaymentForm,
	blankCustomerForm,
	blankDebtForm,
	blankDebtPaymentForm,
	blankFixedExpenseForm,
	blankPaymentForm,
	blankQuoteForm,
	blankQuoteItem,
	blankReservationForm,
	calculatedUnitCost,
	cashCategoryListId,
	cleanCustomerPayload,
	debtPaymentMethodLabels,
	debtStatusLabels,
	fixedExpenseIntervalLabels,
	fixedExpenseIntervalOptions,
	defaultCashCategory,
	detailRequiresEconomy,
	entityFeedbackTitle,
	successToastDescription,
	expenseCategoryPairs,
	expenseCategoryTreeFromText,
	expenseCategoryTreeToText,
	expenseSubcategoriesForCategory,
	incomeCategoryPairs,
	incomeSubcategoriesForCategory,
	formatDateLabel,
	formatDateTimeLabel,
	formatDayLabel,
	formatDayName,
	formatFullDateLabel,
	fullPaymentAmountForOrder,
	mergeStringValues,
	money,
	monthRange,
	moveReservationToDay,
	normalizedAmountInput,
	normalizeExpenseCategoryTree,
	normalizeIncomeCategoryTree,
	numberValue,
	orderLabels,
	quantity,
	replaceReservationRecord,
	reservationAgendaClassNames,
	reservationExitOffset,
	reservationLabels,
	resolveActionMessage,
	sectionMeta,
	sectionRequiresEmployer,
	sectionRequiresEconomy,
	serviceTypeLabels,
	toIsoDate,
	today,
	toolStatusLabels,
	toolStatusOptions,
	uniqueValues,
	removeExpenseCategoryPair,
	removeIncomeCategoryPair,
	upsertIncomeCategoryPair,
	upsertExpenseCategoryPair,
	useButtonHoverTitles,
	useFlashTarget,
	useNoticeToasts,
	usePendingActions,
}

