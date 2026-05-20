'use client'

import {
	closestCenter,
	DndContext,
	DragOverlay,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'

import {
	Building2,
	CalendarDays,
	Car,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	CreditCard,
	Eye,
	FileText,
	Hammer,
	History,
	LockKeyhole,
	LogOut,
	Menu,
	MoreHorizontal,
	Package,
	Pencil,
	Plus,
	ReceiptText,
	RefreshCw,
	Search,
	Trash2,
	Users,
	Wrench,
	X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
	type ChangeEvent,
	type CSSProperties,
	type FormEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import { AnimatedLabelSwap } from '@/app/components/motion/AnimatedLabelSwap'
import { AgendaBoardToolbar } from '@/app/components/agenda/AgendaBoardToolbar'
import { AgendaReservationCard } from '@/app/components/agenda/AgendaReservationCard'
import {
	CashPanel,
	type CashFilterState,
	type CashFlowSummary,
	type CashSummaryGroup,
	type CashSummaryLine,
	type CashSummaryMode,
} from '@/app/components/cash/CashPanel'
import {
	DebtPanel,
	type DebtFilterState,
	type DebtSummary,
} from '@/app/components/debts/DebtPanel'
import { DashboardPanel } from '@/app/components/dashboard/DashboardPanel'
import { InventoryPanel } from '@/app/components/inventory/InventoryPanel'
import { SettingsWorkspace } from '@/app/components/settings/SettingsWorkspace'
import {
	CustomerDashboardShell,
	type CustomerDashboardMetric,
	type CustomerDashboardProfileItem,
} from '@/app/components/customers/CustomerDashboardShell'
import {
	CustomerListPanel,
	type CustomerCardFilter,
} from '@/app/components/customers/CustomerListPanel'
import { AppBrand } from '@/app/components/layout/AppBrand'
import { AppShell } from '@/app/components/layout/AppShell'
import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { AnimatedWorkspaceView } from '@/app/components/motion/AnimatedWorkspaceView'
import { PageHeader } from '@/app/components/layout/PageHeader'
import {
	SidebarNav,
	type SidebarNavItem,
} from '@/app/components/layout/SidebarNav'
import { DetailModal } from '@/app/components/ui/DetailModal'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { BirthdayFields } from '@/app/components/ui/BirthdayFields'
import { Field } from '@/app/components/ui/Field'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'
import { Panel } from '@/app/components/ui/Panel'
import {
	QuickActionsMenu,
	type QuickAction,
} from '@/app/components/ui/QuickActionsMenu'
import {
	RecordCard,
	RecordCardHeader,
} from '@/app/components/ui/RecordCard'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { cx } from '@/app/components/utils'
import {
	focusElementIfAvailable,
	focusFirstElement,
	trapFocusWithin,
} from '@/lib/a11y'
import {
	apiFetch,
	apiList,
	clearStoredToken,
	downloadApiFile,
	getStoredToken,
} from '@/lib/api'
import {
	applyAppDataEntry,
	type AppDataAppliers,
	dataSetCacheKey,
	loadAppDataSets,
} from '@/lib/app-data'
import {
	dataSetKeysForSection,
	type DataSetKey,
} from '@/lib/data-loading'
import {
	type ApiErrorNotice,
	createValidationNotice,
	formatApiError,
} from '@/lib/api-errors'
import {
	isPdfAssetName,
	isPdfAssetSource,
	renderPdfPreviewDataUrl,
	safeImageAssetSource,
} from '@/lib/pdf-preview'
import {
	auditLogListOrEmpty,
	type AuditLogFilters,
} from '@/lib/audit-log'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AgendaCalendarSegment,
	type AgendaOperationalPhase,
	type AgendaOperationalRow,
	type AgendaServiceBucket,
	buildAgendaCalendarSegments,
	buildAgendaOperationalRows,
	buildWorkOrderByReservation,
	filterAgendaReservationsByBucket,
} from '@/lib/agenda'
import {
	buildAgendaReservationActions,
	type AgendaReservationAction,
} from '@/lib/reservation-actions'
import {
	filterFreeQuotesByServiceBucket,
	groupReservationsByEntryDate,
	groupReservationsByWorkOrderStatusColumns,
	reservationCanMoveWorkStatus,
	workStatusColumnForStatus,
	workStatusForReservation,
	type WorkOrderViewMode,
	workOrderForReservation,
} from '@/lib/work-orders'
import {
	type AgendaSlideMotion,
	agendaBoardVariants,
	agendaSlidePresenceMode,
	agendaSlideMotionFromOffset,
	agendaSlideWindowsOverlap,
} from '@/lib/motion-spec'
import {
	navigationUrlForState,
	readNavigationStateFromUrl,
	type NavigationConfig,
	type NavigationState,
} from '@/lib/navigation-state'
import {
	vehicleBrandOptions,
	vehicleModelOptionsForBrand,
} from '@/lib/vehicle-options'
import {
	vehicleDescriptionText,
	vehicleDisplayTitle,
	vehicleMatchesSearch,
} from '@/lib/vehicle-display'
import { serviceDisplayName } from '@/lib/service-display'
import { serviceDetailPayloadFields } from '@/lib/service-detail-payload'
import { shouldHandleUndoShortcut } from '@/lib/undo-shortcut'

import {
	type ActionMessage,
	type AnyRecord,
	type FormModalKind,
	type Section,
	type ThemeMode,
	AGENDA_DRAG_MOUSE_DISTANCE,
	AGENDA_DRAG_TOUCH_DELAY_MS,
	AGENDA_DRAG_TOUCH_TOLERANCE,
	AGENDA_INTERACTIVE_SELECTOR,
	AGENDA_VISIBLE_DAYS,
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
	birthdayText,
	blankAgendaPaymentForm,
	blankBusinessForm,
	blankCustomerForm,
	blankDebtForm,
	blankDebtPaymentForm,
	blankPaymentForm,
	blankQuoteForm,
	blankQuoteItem,
	blankReservationForm,
	calculatedUnitCost,
	cleanCustomerPayload,
	debtPaymentMethodLabels,
	debtStatusLabels,
	defaultCashCategory,
	detailRequiresEconomy,
	entityFeedbackTitle,
	expenseCategoryPairs,
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
	serviceTypeLabels,
	successToastDescription,
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
} from '@/lib/page-support'

type QuickActionsMenuState = {
	title: string
	actions: QuickAction[]
	anchorPoint: { x: number; y: number }
}

type UndoAction<T> = {
	label?: ActionMessage<T>
	description?: ActionMessage<T>
	execute: (result: T) => Promise<void>
	successTitle?: ActionMessage<T>
	successDescription?: ActionMessage<T>
}

type RunActionOptions<T> = {
	flashTarget?: string | null | ((result: T) => string | null | undefined)
	successTitle?: ActionMessage<T>
	successDescription?: ActionMessage<T>
	undo?: UndoAction<T>
}

type PendingUndoAction = {
	id: number
	toastId: number | null
	expiresAt: number
	busy: boolean
	execute: () => Promise<void>
	successTitle: string
	successDescription?: string
}

const SIDEBAR_NAV_ID = 'app-sidebar-navigation'
const UNDO_WINDOW_MS = 7000

const agendaServiceBuckets: Array<{
	value: AgendaServiceBucket
	label: string
}> = [
	{ value: 'wash', label: 'Lavado' },
	{ value: 'detailing', label: 'Detailing' },
]
const workViewModes: Array<{
	value: WorkOrderViewMode
	label: string
}> = [
	{ value: 'agenda', label: 'Agenda' },
	{ value: 'status', label: 'Estado' },
	{ value: 'entry-date', label: 'Fecha de ingreso' },
]
const workStatusColumns = [
	{
		key: 'not_started',
		label: 'Sin ingresar',
		statuses: ['pending', 'confirmed'],
		dropStatus: 'confirmed',
	},
	{
		key: 'in_progress',
		label: 'En proceso',
		statuses: ['in_progress'],
		dropStatus: 'in_progress',
	},
	{
		key: 'finished',
		label: 'Finalizados',
		statuses: ['ready', 'delivered'],
		dropStatus: 'ready',
	},
]
const quoteStatusLabels: Record<string, string> = {
	draft: 'Sin enviar',
	sent: 'Enviado',
	accepted: 'Aceptada',
	rejected: 'Rechazada',
}
const serviceFormTypeOptions = [
	{ value: 'wash', label: 'Lavado' },
	{ value: 'detailing', label: 'Detailing' },
	{ value: 'combo', label: 'Combo' },
]
const profilePhoneCountryOptions = [
	{ value: '+54', label: '🇦🇷 +54' },
	{ value: '+598', label: '🇺🇾 +598' },
	{ value: '+56', label: '🇨🇱 +56' },
	{ value: '+55', label: '🇧🇷 +55' },
	{ value: '+595', label: '🇵🇾 +595' },
	{ value: '+591', label: '🇧🇴 +591' },
	{ value: '+51', label: '🇵🇪 +51' },
	{ value: '+57', label: '🇨🇴 +57' },
	{ value: '+52', label: '🇲🇽 +52' },
]
const subscriptionTypeOptions = [
	{ value: 'trial', label: 'Prueba' },
	{ value: 'premium', label: 'Premium' },
]
const stockMovementTypeOptions = [
	{ value: 'purchase', label: 'Compra' },
	{ value: 'initial_stock', label: 'Stock inicial' },
	{ value: 'consumption', label: 'Consumo' },
	{ value: 'sale', label: 'Venta' },
]
const stockMovementTypeLabels: Record<string, string> = Object.fromEntries(
	stockMovementTypeOptions.map((item) => [item.value, item.label]),
)
const stockDocumentTypeOptions = [
	{ value: '', label: 'Sin comprobante' },
	{ value: 'factura_a', label: 'Factura A' },
	{ value: 'factura_b', label: 'Factura B' },
	{ value: 'factura_c', label: 'Factura C' },
	{ value: 'ticket', label: 'Ticket' },
	{ value: 'remito', label: 'Remito' },
	{ value: 'otro', label: 'Otro' },
]
const stockPaymentMethodOptions = [
	{ value: 'cash', label: 'Efectivo' },
	{ value: 'card', label: 'Tarjeta' },
	{ value: 'transfer', label: 'Transferencia' },
	{ value: 'other', label: 'Otro' },
]
const userRoleLabels: Record<string, string> = {
	empleador: 'Empleador',
	empleado: 'Empleado',
}
type SettingsSection =
	| 'business'
	| 'quotes'
	| 'cash'
	| 'agenda'
	| 'users'
	| 'history'

const settingsSectionOptions: Array<{
	value: SettingsSection
	label: string
	icon: typeof Building2
}> = [
	{ value: 'business', label: 'Negocio', icon: Building2 },
	{ value: 'quotes', label: 'Cotizaciones', icon: FileText },
	{ value: 'cash', label: 'Caja', icon: CreditCard },
	{ value: 'agenda', label: 'Agenda', icon: CalendarDays },
	{ value: 'users', label: 'Usuarios', icon: Users },
	{ value: 'history', label: 'Historial', icon: History },
]
const navigationConfig = {
	sections: Object.keys(sectionMeta),
	settingsSections: settingsSectionOptions.map((option) => option.value),
	defaultSection: 'dashboard',
	defaultSettingsSection: 'business',
} satisfies NavigationConfig

function initialNavigationState(): NavigationState {
	if (typeof window === 'undefined') {
		return {
			section: navigationConfig.defaultSection,
			settingsSection: navigationConfig.defaultSettingsSection,
		}
	}
	return readNavigationStateFromUrl(window.location.href, navigationConfig)
}
const auditActionLabels: Record<string, string> = {
	create: 'Creacion',
	update: 'Edicion',
	delete: 'Baja',
	confirm: 'Confirmacion',
	cancel: 'Cancelacion',
	complete: 'Completado',
	create_quote: 'Cotizacion creada',
	create_reservation: 'Reserva creada',
	mark_sent: 'Cotizacion enviada',
	status: 'Cambio de estado',
	close: 'Cierre',
	consume: 'Consumo',
	finish: 'Finalizacion',
	update_profile: 'Perfil actualizado',
}
const auditModuleLabels: Record<string, string> = {
	auth: 'Usuarios',
	catalog: 'Servicios',
	core: 'Configuracion',
	customers: 'Clientes',
	debts: 'Deudas',
	finance: 'Caja',
	inventory: 'Inventario',
	notifications: 'Notificaciones',
	quotes: 'Cotizaciones',
	scheduling: 'Agenda',
	settings: 'Configuracion',
	workorders: 'Ordenes',
}
const publicRequestTypeLabels: Record<string, string> = {
	booking: 'Turno',
	quote: 'Cotizacion',
}
const publicRequestStatusLabels: Record<string, string> = {
	pending: 'Pendiente',
	converted: 'Convertida',
	archived: 'Archivada',
}
const CASH_FILTER_DEFAULTS: CashFilterState = {
	query: '',
	movementType: '',
	sourceKind: '',
	category: '',
	subcategory: '',
	effect: '',
	amountMin: '',
	amountMax: '',
}

const DEBT_FILTER_DEFAULTS: DebtFilterState = {
	status: '',
	balance: '',
}

const cashSummaryGroupDefinitions = [
	{ key: 'charges', label: 'Cobros' },
	{ key: 'payments', label: 'Pagos' },
	{ key: 'partner_contributions', label: 'Aportes' },
	{ key: 'investments', label: 'Inversiones' },
	{ key: 'partner_withdrawals', label: 'Retiros' },
	{ key: 'adjustments', label: 'Ajustes' },
] as const

const cashSourceKindLabels: Record<string, string> = {
	adjustment: 'Ajuste',
	debt_origin: 'Deuda original',
	debt_payment: 'Pago de deuda',
	manual: 'Manual',
	material_purchase: 'Compra',
	payment: 'Cobro',
}

function normalizedCashText(value: any) {
	return String(value ?? '')
		.trim()
		.toLocaleLowerCase('es-AR')
}

function cashSourceKindLabel(kind: any, fallback?: any) {
	const key = String(kind ?? '').trim()
	return cashSourceKindLabels[key] || String((fallback ?? key) || 'Origen')
}

function cashEntryTitleText(item: AnyRecord) {
	if (item.source_kind === 'debt_origin') {
		return `Deuda original: ${item.debt_concept || item.category}`
	}
	if (item.source_kind === 'debt_payment') {
		return `Pago de deuda: ${item.debt_concept || item.description}`
	}
	return item.source_label || item.category || 'Movimiento de caja'
}

function cashEntryDescriptionText(item: AnyRecord) {
	const dateLabel = item.occurred_at
		? formatDateTimeLabel(item.occurred_at)
		: 'Sin fecha'
	const classification = [item.category, item.subcategory]
		.filter(Boolean)
		.join(' / ')
	const detail = [classification, item.description]
		.filter(Boolean)
		.join(' - ')
	const audit = item.created_by_username
		? `Registrado por ${item.created_by_username}`
		: ''
	return [detail, dateLabel, audit].filter(Boolean).join(' - ')
}

function compareExpenseClassificationPair(
	a: { category: string; subcategory: string },
	b: { category: string; subcategory: string },
) {
	const categoryOrder = a.category.localeCompare(b.category, 'es-AR', {
		sensitivity: 'base',
	})
	if (categoryOrder !== 0) return categoryOrder
	return a.subcategory.localeCompare(b.subcategory, 'es-AR', {
		sensitivity: 'base',
	})
}

function cashEntryIncludedInSummary(item: AnyRecord, mode: CashSummaryMode) {
	if (mode === 'cashflow') {
		return item.cashflow_effect !== false && item.source_kind !== 'debt_origin'
	}
	return item.economic_effect !== false && item.source_kind !== 'debt_payment'
}

function cashEntrySignedAmount(item: AnyRecord) {
	const amount = numberValue(item.amount)
	return item.movement_type === 'expense' ? -amount : amount
}

function cashSummaryLineLabel(item: AnyRecord) {
	return (
		String(item.subcategory ?? '').trim() ||
		String(item.category ?? '').trim() ||
		cashSourceKindLabel(item.source_kind, item.source_label)
	)
}

function cashSummaryGroupKey(item: AnyRecord) {
	const category = normalizedCashText(item.category)
	const subcategory = normalizedCashText(item.subcategory)
	const sourceKind = normalizedCashText(item.source_kind)
	const searchText = `${category} ${subcategory} ${sourceKind}`
	if (sourceKind === 'adjustment' || category === 'ajustes') {
		return 'adjustments'
	}
	if (item.movement_type === 'income') {
		if (
			searchText.includes('aporte') ||
			searchText.includes('socio') ||
			category === 'inversion' ||
			category === 'prestamo'
		) {
			return 'partner_contributions'
		}
		return 'charges'
	}
	if (searchText.includes('retiro')) {
		return 'partner_withdrawals'
	}
	if (category === 'inversion') {
		return 'investments'
	}
	return 'payments'
}

function buildCashFlowSummary(
	entries: AnyRecord[],
	mode: CashSummaryMode,
): CashFlowSummary {
	const groupsByKey = Object.fromEntries(
		cashSummaryGroupDefinitions.map((group) => [
			group.key,
			{
				key: group.key,
				label: group.label,
				count: 0,
				amount: 0,
				lines: [] as CashSummaryLine[],
			},
		]),
	) as Record<string, CashSummaryGroup>

	entries
		.filter((item) => cashEntryIncludedInSummary(item, mode))
		.forEach((item) => {
			const groupKey = cashSummaryGroupKey(item)
			const group = groupsByKey[groupKey] ?? groupsByKey.payments
			const amount = cashEntrySignedAmount(item)
			const label = cashSummaryLineLabel(item)
			const lineKey = normalizedCashText(label)
			let line = group.lines.find((current) => current.key === lineKey)
			if (!line) {
				line = { key: lineKey, label, count: 0, amount: 0, percent: 0 }
				group.lines.push(line)
			}
			group.count += 1
			group.amount += amount
			line.count += 1
			line.amount += amount
		})

	Object.values(groupsByKey).forEach((group) => {
		const absoluteTotal = group.lines.reduce(
			(total, line) => total + Math.abs(line.amount),
			0,
		)
		group.lines = group.lines
			.map((line) => ({
				...line,
				percent: absoluteTotal ? Math.abs(line.amount) / absoluteTotal : 0,
			}))
			.sort((a, b) => {
				const amountOrder = Math.abs(b.amount) - Math.abs(a.amount)
				if (amountOrder !== 0) return amountOrder
				return a.label.localeCompare(b.label, 'es-AR', {
					sensitivity: 'base',
				})
			})
	})

	const charges = groupsByKey.charges.amount
	const payments = groupsByKey.payments.amount
	const partnerContributions = groupsByKey.partner_contributions.amount
	const investments = groupsByKey.investments.amount
	const partnerWithdrawals = groupsByKey.partner_withdrawals.amount
	const adjustments = groupsByKey.adjustments.amount
	const commercialBalance = charges + payments
	const financialBalance =
		partnerContributions + investments + partnerWithdrawals
	const netFlow = commercialBalance + financialBalance + adjustments

	return {
		groups: cashSummaryGroupDefinitions.map((group) => groupsByKey[group.key]),
		commercialBalance,
		financialBalance,
		netFlow,
	}
}

function normalizedCashFilterAmount(value: any) {
	const rawValue = String(value ?? '').trim()
	if (!rawValue) return null
	const amount = Number(rawValue.replace(',', '.'))
	return Number.isFinite(amount) ? amount : null
}

function cashEntryMatchesFilters(item: AnyRecord, filters: CashFilterState) {
	if (
		filters.movementType &&
		String(item.movement_type ?? '') !== filters.movementType
	) {
		return false
	}
	if (filters.sourceKind && String(item.source_kind ?? '') !== filters.sourceKind) {
		return false
	}
	if (filters.category && String(item.category ?? '') !== filters.category) {
		return false
	}
	if (
		filters.subcategory &&
		String(item.subcategory ?? '') !== filters.subcategory
	) {
		return false
	}
	if (filters.effect === 'cashflow' && item.cashflow_effect === false) {
		return false
	}
	if (filters.effect === 'economic_only' && item.cashflow_effect !== false) {
		return false
	}

	const amount = Math.abs(numberValue(item.amount))
	const amountMin = normalizedCashFilterAmount(filters.amountMin)
	const amountMax = normalizedCashFilterAmount(filters.amountMax)
	if (amountMin !== null && amount < amountMin) return false
	if (amountMax !== null && amount > amountMax) return false

	const query = normalizedCashText(filters.query)
	if (!query) return true
	const haystack = normalizedCashText(
		[
			cashEntryTitleText(item),
			cashEntryDescriptionText(item),
			item.source_label,
			item.source_kind,
			item.category,
			item.subcategory,
			item.amount,
			item.signed_amount,
		].join(' '),
	)
	return haystack.includes(query)
}

function hasCashFilters(filters: CashFilterState) {
	return Object.values(filters).some((value) => String(value ?? '').trim())
}

function debtMatchesFilters(
	item: AnyRecord,
	filters: DebtFilterState,
	query: string,
) {
	if (filters.status && String(item.status ?? '') !== filters.status) {
		return false
	}
	const balanceDue = numberValue(item.balance_due)
	if (filters.balance === 'open' && balanceDue <= 0) return false
	if (filters.balance === 'settled' && balanceDue > 0) return false

	const term = normalizedCashText(query)
	if (!term) return true
	const haystack = normalizedCashText(
		[
			item.concept,
			item.creditor,
			item.supplier_name,
			debtStatusLabels[item.status],
			item.status,
			item.expense_category,
			item.expense_subcategory,
			item.notes,
			item.principal_amount,
			item.total_paid,
			item.balance_due,
		].join(' '),
	)
	return haystack.includes(term)
}

function hasDebtFilters(filters: DebtFilterState) {
	return Object.values(filters).some((value) => String(value ?? '').trim())
}

function customerDaysText(value: any, emptyText = 'Sin dato') {
	const days = Number(value)
	if (!Number.isFinite(days)) return emptyText
	if (days === 0) return 'Hoy'
	if (days === 1) return '1 dia'
	return `${days} dias`
}

function customerDaysAgoText(value: any, emptyText = 'Sin dato') {
	const label = customerDaysText(value, emptyText)
	if (label === emptyText || label === 'Hoy') return label
	return `Hace ${label}`
}

function customerAverageGapText(value: any) {
	const days = Number(value)
	if (!Number.isFinite(days)) return 'Sin suficiente historial'
	if (days === 0) return 'Visitas el mismo dia'
	if (days === 1) return '1 dia promedio entre visitas'
	return `${days} dias promedio entre visitas`
}

function selectOptionsFromValues(values: string[], currentValue?: any) {
	const current = String(currentValue ?? '').trim()
	const normalizedValues =
		current && !values.includes(current) ? [current, ...values] : values
	return normalizedValues.map((value) => ({ value, label: value }))
}

function formatTimeLabel(value: any) {
	const raw = String(value ?? '')
	return raw.length >= 5 ? raw.slice(0, 5) : ''
}

function customerScheduleLabel(
	reservation: AnyRecord | null | undefined,
	showReservationTimes = true,
) {
	if (!reservation?.day) return 'Sin reserva futura'
	const time =
		showReservationTimes && reservation.start_time
			? ` ${formatTimeLabel(reservation.start_time)}`
			: ''
	return `${formatDateLabel(reservation.day)}${time}`
}

function customerListInsights(customer: AnyRecord) {
	return customer?.list_insights ?? {}
}

function blankProfileForm(user?: AnyRecord | null) {
	return {
		email: String(user?.email ?? ''),
		phone_country_code: String(user?.phone_country_code ?? '+54'),
		phone_number: String(user?.phone_number ?? ''),
		subscription_type: String(user?.subscription_type ?? 'trial'),
	}
}

function blankSupplierForm() {
	return {
		name: '',
		legal_name: '',
		category: '',
		tax_condition: '',
		website: '',
		contact_name: '',
		phone: '',
		email: '',
		tax_id: '',
		address: '',
		notes: '',
	}
}

function blankStockMovementLine() {
	return {
		material: '',
		quantity: '',
		unit_price: '',
	}
}

function blankStockMovementForm(day = today) {
	return {
		movement_type: 'purchase',
		occurred_on: day,
		supplier: '',
		customer: '',
		reservation: '',
		document_type: '',
		document_number: '',
		affects_cash: true,
		products_received: false,
		payment_method: DEFAULT_PAYMENT_METHOD,
		notes: '',
		lines: [blankStockMovementLine()],
	}
}

function profileDisplayName(user?: AnyRecord | null) {
	return String(user?.username ?? 'Mi perfil')
}

function profileInitial(user?: AnyRecord | null) {
	const name = profileDisplayName(user).trim()
	return name ? name.charAt(0).toUpperCase() : '?'
}

function profileRoleLabel(user?: AnyRecord | null) {
	return userRoleLabels[String(user?.role ?? '')] ?? 'Usuario'
}

function profileLastLoginText(user?: AnyRecord | null) {
	return user?.last_login
		? formatDateTimeLabel(user.last_login)
		: 'Sin inicio previo'
}

function profileJoinedText(user?: AnyRecord | null) {
	return user?.date_joined
		? formatDateTimeLabel(user.date_joined)
		: 'Sin fecha de alta'
}

function profileActiveText(user?: AnyRecord | null) {
	return user?.is_active === false ? 'Inactivo' : 'Activo'
}

function profileTrialText(user?: AnyRecord | null) {
	if (user?.trial_expired) return 'Prueba vencida'
	if (user?.trial_ends_at) {
		return `Prueba activa hasta ${formatDateLabel(user.trial_ends_at)}`
	}
	return null
}

function usePdfThumbnailPreview(
	source: string | null,
	enabled: boolean,
	maxWidth: number,
) {
	const [thumbnail, setThumbnail] = useState<string | null>(null)
	const [status, setStatus] = useState<
		'idle' | 'loading' | 'ready' | 'error'
	>('idle')

	useEffect(() => {
		if (!enabled || !source) {
			setThumbnail(null)
			setStatus('idle')
			return
		}

		const abortController = new AbortController()
		setThumbnail(null)
		setStatus('loading')

		renderPdfPreviewDataUrl(source, {
			maxWidth,
			signal: abortController.signal,
		})
			.then((nextThumbnail) => {
				if (abortController.signal.aborted) return
				setThumbnail(nextThumbnail)
				setStatus('ready')
			})
			.catch(() => {
				if (abortController.signal.aborted) return
				setThumbnail(null)
				setStatus('error')
			})

		return () => {
			abortController.abort()
		}
	}, [enabled, maxWidth, source])

	return {
		thumbnail,
		status,
	}
}

export default function Home() {
	useButtonHoverTitles()

	const [token, setToken] = useState<string | null>(null)
	const [currentUser, setCurrentUser] = useState<AnyRecord | null>(null)
	const [active, setActive] = useState<Section>(
		() => initialNavigationState().section as Section,
	)
	const [themeMode, setThemeMode] = useState<ThemeMode>('light')
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
	const sidebarMobileToggleRef = useRef<HTMLButtonElement>(null)
	const sidebarReturnFocusRef = useRef<HTMLElement | null>(null)
	const [settingsSection, setSettingsSection] =
		useState<SettingsSection>(
			() => initialNavigationState().settingsSection as SettingsSection,
		)
	const navigationHistoryModeRef = useRef<'pushState' | 'replaceState'>(
		'replaceState',
	)
	const [loading, setLoading] = useState(false)
	const [agendaLoadError, setAgendaLoadError] =
		useState<ApiErrorNotice | null>(null)
	const [loadErrorNotice, setLoadErrorNotice] =
		useState<ApiErrorNotice | null>(null)
	const { toasts, showToast, dismissToast } = useNoticeToasts()
	const undoTimerRef = useRef<number | null>(null)
	const pendingUndoRef = useRef<PendingUndoAction | null>(null)
	const executeUndoRef = useRef<(id?: number) => void>(() => undefined)
	const nextUndoIdRef = useRef(0)
	const [search, setSearch] = useState('')
	const [customerCardFilter, setCustomerCardFilter] =
		useState<CustomerCardFilter>('all')
	const [agendaStartDay, setAgendaStartDay] = useState(today)
	const [agendaServiceBucket, setAgendaServiceBucket] =
		useState<AgendaServiceBucket>('wash')
	const [workViewMode, setWorkViewMode] =
		useState<WorkOrderViewMode>('agenda')
	const [selectedDay, setSelectedDay] = useState(today)
	const [cashSummaryMode, setCashSummaryMode] =
		useState<CashSummaryMode>('cashflow')
	const [cashFilters, setCashFilters] =
		useState<CashFilterState>(CASH_FILTER_DEFAULTS)
	const [debtFilters, setDebtFilters] =
		useState<DebtFilterState>(DEBT_FILTER_DEFAULTS)
	const cashMovementDateTimeFor = (day: string) => `${day}T12:00`
	const blankMovementForm = (
		day = selectedDay,
		overrides: AnyRecord = {},
	) => ({
		movement_type: 'expense',
		category: DEFAULT_EXPENSE_CATEGORY,
		subcategory: '',
		amount: '',
		occurred_at: cashMovementDateTimeFor(day),
		description: '',
		adjusts_closed_day: '',
		...overrides,
	})
	const [period, setPeriod] = useState({
		from: today.slice(0, 8) + '01',
		to: today,
	})

	const [dashboard, setDashboard] = useState<AnyRecord>({})
	const [cash, setCash] = useState<AnyRecord>({})
	const [customers, setCustomers] = useState<AnyRecord[]>([])
	const [vehicles, setVehicles] = useState<AnyRecord[]>([])
	const [services, setServices] = useState<AnyRecord[]>([])
	const [reservations, setReservations] = useState<AnyRecord[]>([])
	const [workOrders, setWorkOrders] = useState<AnyRecord[]>([])
	const [payments, setPayments] = useState<AnyRecord[]>([])
	const [debts, setDebts] = useState<AnyRecord[]>([])
	const [debtPayments, setDebtPayments] = useState<AnyRecord[]>([])
	const [materials, setMaterials] = useState<AnyRecord[]>([])
	const [suppliers, setSuppliers] = useState<AnyRecord[]>([])
	const [stockMovements, setStockMovements] = useState<AnyRecord[]>([])
	const [purchases, setPurchases] = useState<AnyRecord[]>([])
	const [consumptions, setConsumptions] = useState<AnyRecord[]>([])
	const [materialOpenUnits, setMaterialOpenUnits] = useState<AnyRecord[]>([])
	const [tools, setTools] = useState<AnyRecord[]>([])
	const [quotes, setQuotes] = useState<AnyRecord[]>([])
	const [publicRequests, setPublicRequests] = useState<AnyRecord[]>([])
	const [publicRequestSelections, setPublicRequestSelections] = useState<
		Record<string, { customer?: string; vehicle?: string }>
	>({})
	const [employees, setEmployees] = useState<AnyRecord[]>([])
	const [auditLogs, setAuditLogs] = useState<AnyRecord[]>([])
	const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({})
	const auditLogsLoadedRef = useRef(false)
	const loadedDataCacheRef = useRef<Set<string>>(new Set())
	const [expandedAuditLogId, setExpandedAuditLogId] = useState<string | null>(
		null,
	)
	const [businessProfile, setBusinessProfile] = useState<AnyRecord | null>(null)
	const [profileModalOpen, setProfileModalOpen] = useState(false)

	const [businessForm, setBusinessForm] = useState<AnyRecord>(
		blankBusinessForm(),
	)
	const [expenseClassificationForm, setExpenseClassificationForm] =
		useState<AnyRecord>({
			movement_type: 'expense',
			category: '',
			subcategory: '',
			originalCategory: '',
			originalSubcategory: '',
		})
	const [profileForm, setProfileForm] = useState<AnyRecord>(blankProfileForm())
	const businessFormRef = useRef<AnyRecord>(blankBusinessForm())
	const [customerForm, setCustomerForm] = useState<AnyRecord>(blankCustomerForm())
	const [vehicleForm, setVehicleForm] = useState<AnyRecord>({
		id: '',
		customer: '',
		license_plate: '',
		brand: '',
		model: '',
		color: '',
		notes: '',
	})
	const [serviceForm, setServiceForm] = useState<AnyRecord>({
		id: '',
		name: '',
		icon: '',
		service_type: 'wash',
		base_price: '',
		estimated_duration_minutes: '60',
		notes: '',
	})
	const [reservationForm, setReservationForm] = useState<AnyRecord>(
		blankReservationForm(),
	)
	const [paymentForm, setPaymentForm] = useState<AnyRecord>(blankPaymentForm())
	const [movementForm, setMovementForm] = useState<AnyRecord>(
		blankMovementForm(),
	)
	const [debtForm, setDebtForm] = useState<AnyRecord>(blankDebtForm(today))
	const [debtPaymentForm, setDebtPaymentForm] = useState<AnyRecord>(
		blankDebtPaymentForm(today),
	)
	const [materialForm, setMaterialForm] = useState<AnyRecord>({
		id: '',
		name: '',
		unit: 'ml',
		category: '',
		sku: '',
		presentation: '',
		stock_quantity: '0',
		minimum_stock: '0',
		estimated_unit_cost: '0',
		notes: '',
	})
	const [supplierForm, setSupplierForm] = useState<AnyRecord>(
		blankSupplierForm(),
	)
	const [stockMovementForm, setStockMovementForm] = useState<AnyRecord>(
		blankStockMovementForm(today),
	)
	const [stockMovementDocumentFile, setStockMovementDocumentFile] =
		useState<File | null>(null)
	const [purchaseForm, setPurchaseForm] = useState<AnyRecord>({
		material: '',
		purchased_at: today,
		quantity: '',
		total_cost: '',
		affects_cash: true,
		observations: '',
	})
	const [consumptionForm, setConsumptionForm] = useState<AnyRecord>({
		mode: 'direct',
		work_order: '',
		material: '',
		open_unit: '',
		consumed_at: today,
		quantity: '',
		observations: '',
	})
	const [openUnitForm, setOpenUnitForm] = useState<AnyRecord>({
		material: '',
		opened_at: today,
		opened_by_work_order: '',
		stock_quantity_to_decrement: '1',
		observations: '',
	})
	const [toolForm, setToolForm] = useState<AnyRecord>({
		id: '',
		name: '',
		quantity: '1',
		status: 'in_use',
		unit_value: '0',
		purchased_at: '',
		notes: '',
	})
	const [quoteForm, setQuoteForm] = useState<AnyRecord>(blankQuoteForm())
	const [quoteReservationForm, setQuoteReservationForm] = useState<AnyRecord>({
		quote: '',
		vehicle: '',
		day: selectedDay,
		start_time: '',
		exit_time: '',
	})
	const [employeeForm, setEmployeeForm] = useState<AnyRecord>({
		username: '',
		email: '',
		password: '',
	})
	const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null)
	const [businessLogoInputKey, setBusinessLogoInputKey] = useState(0)
	const [businessLogoPreview, setBusinessLogoPreview] = useState<string | null>(
		null,
	)
	const [quickReservationDay, setQuickReservationDay] = useState<string | null>(
		null,
	)
	const [quickReservationPrefillDay, setQuickReservationPrefillDay] =
		useState(false)
	const [quickCreate, setQuickCreate] = useState<AnyRecord | null>(null)
	const [formModal, setFormModal] = useState<{
		kind: FormModalKind
	} | null>(null)
	const [detailModal, setDetailModal] = useState<{
		title: string
		kind: string
		data: AnyRecord
		editData: AnyRecord
		editing: boolean
	} | null>(null)
	const [quickActionsMenu, setQuickActionsMenu] =
		useState<QuickActionsMenuState | null>(null)
	const quickActionsReturnFocusRef = useRef<HTMLElement | null>(null)
	const [customerHistory, setCustomerHistory] = useState<AnyRecord | null>(null)
	const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false)
	const [customerDashboard, setCustomerDashboard] = useState<AnyRecord | null>(
		null,
	)
	const [customerDashboardHistory, setCustomerDashboardHistory] =
		useState<AnyRecord | null>(null)
	const [customerDashboardLoading, setCustomerDashboardLoading] =
		useState(false)
	const [serviceDashboard, setServiceDashboard] = useState<AnyRecord | null>(null)
	const [serviceDashboardHistory, setServiceDashboardHistory] =
		useState<AnyRecord | null>(null)
	const [serviceDashboardLoading, setServiceDashboardLoading] =
		useState(false)
	const [supplierDashboard, setSupplierDashboard] = useState<AnyRecord | null>(
		null,
	)
	const [supplierDashboardHistory, setSupplierDashboardHistory] =
		useState<AnyRecord | null>(null)
	const [supplierDashboardLoading, setSupplierDashboardLoading] =
		useState(false)
	const [consumeForOrder, setConsumeForOrder] = useState<AnyRecord | null>(
		null,
	)
	const [paymentForOrder, setPaymentForOrder] = useState<AnyRecord | null>(
		null,
	)
	const [reservationForQuote, setReservationForQuote] = useState<AnyRecord | null>(
		null,
	)
	const [agendaPaymentForm, setAgendaPaymentForm] = useState<AnyRecord>(
		blankAgendaPaymentForm(''),
	)
	const [activeAgendaReservationId, setActiveAgendaReservationId] = useState<
		string | null
	>(null)
	const [agendaDropDay, setAgendaDropDay] = useState<string | null>(null)
	const [agendaMovePendingId, setAgendaMovePendingId] = useState<string | null>(
		null,
	)
	const [activeWorkStatusReservationId, setActiveWorkStatusReservationId] =
		useState<string | null>(null)
	const [workStatusDropStatus, setWorkStatusDropStatus] = useState<
		string | null
	>(null)
	const [workStatusMovePendingId, setWorkStatusMovePendingId] = useState<
		string | null
	>(null)
	const [activeQuoteDragId, setActiveQuoteDragId] = useState<string | null>(null)
	const [quoteDropStatus, setQuoteDropStatus] = useState<
		'draft' | 'sent' | null
	>(null)
	const [quoteMovePendingId, setQuoteMovePendingId] = useState<string | null>(
		null,
	)
	const [agendaSlideMotion, setAgendaSlideMotion] = useState<AgendaSlideMotion>({
		direction: 'forward',
		distancePercent: 24,
		offsetDays: AGENDA_VISIBLE_DAYS,
		scope: 'range',
	})
	const [agendaOverlapSuppressedStartDay, setAgendaOverlapSuppressedStartDay] =
		useState<string | null>(null)
	const canViewEconomy = currentUser?.can_view_economy === true
	const useReservationTimes = businessForm.use_reservation_times !== false
	const showStayDaysInAgenda =
		businessForm.show_stay_days_in_agenda !== false
	const effectiveActive =
		canViewEconomy || !sectionRequiresEmployer(active) ? active : 'agenda'
	const currentDay = toIsoDate(new Date())
	const displayedActive = effectiveActive
	const quickReservationExit = {
		close: () => {
			setQuickReservationDay(null)
			setQuickReservationPrefillDay(false)
		},
	}
	const quickCreateExit = {
		close: () => setQuickCreate(null),
	}
	const formModalExit = {
		close: () => setFormModal(null),
	}
	const detailExit = {
		close: () => setDetailModal(null),
	}
	const profileExit = {
		close: () => closeProfileModal(),
	}
	const consumptionExit = {
		close: () => setConsumeForOrder(null),
	}
	const paymentExit = {
		close: () => {
			setPaymentForOrder(null)
			setAgendaPaymentForm(blankAgendaPaymentForm(''))
		},
	}
	const quoteReservationExit = {
		close: () => setReservationForQuote(null),
	}

	useEffect(() => {
		try {
			const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
			if (storedTheme === 'light' || storedTheme === 'dark') {
				setThemeMode(storedTheme)
			}
		} catch {
			// Theme persistence is non-critical; the app must keep rendering.
		}
	}, [])

	useEffect(() => {
		document.documentElement.dataset.theme = themeMode
	}, [themeMode])

	useEffect(() => {
		const handlePopState = () => {
			const nextNavigation = readNavigationStateFromUrl(
				window.location.href,
				navigationConfig,
			)
			navigationHistoryModeRef.current = 'replaceState'
			setActive(nextNavigation.section as Section)
			setSettingsSection(nextNavigation.settingsSection as SettingsSection)
			setSidebarMobileOpen(false)
		}
		window.addEventListener('popstate', handlePopState)
		return () => {
			window.removeEventListener('popstate', handlePopState)
		}
	}, [])

	useEffect(() => {
		const nextUrl = navigationUrlForState(
			window.location.href,
			{ section: active, settingsSection },
			navigationConfig,
		)
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
		if (nextUrl !== currentUrl) {
			window.history[navigationHistoryModeRef.current](null, '', nextUrl)
		}
		navigationHistoryModeRef.current = 'pushState'
	}, [active, settingsSection])

	useEffect(() => {
		if (!canViewEconomy && customerCardFilter === 'with_balance') {
			setCustomerCardFilter('all')
		}
	}, [canViewEconomy, customerCardFilter])

	useEffect(() => {
		if (!sidebarMobileOpen) return

		const previousOverflow = document.body.style.overflow
		const sidebar = document.getElementById(SIDEBAR_NAV_ID)
		const focusFrame = window.requestAnimationFrame(() => {
			focusFirstElement(sidebar)
		})
		const focusTimer = window.setTimeout(() => {
			focusFirstElement(document.getElementById(SIDEBAR_NAV_ID))
		}, 220)
		const closeOnDesktop = () => {
			if (window.innerWidth > 980) {
				closeSidebarMobileMenu({ restoreFocus: false })
			}
		}
		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				closeSidebarMobileMenu()
				return
			}
			trapFocusWithin(event, sidebar)
		}

		document.body.style.overflow = 'hidden'
		closeOnDesktop()
		window.addEventListener('resize', closeOnDesktop)
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.cancelAnimationFrame(focusFrame)
			window.clearTimeout(focusTimer)
			document.body.style.overflow = previousOverflow
			window.removeEventListener('resize', closeOnDesktop)
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [sidebarMobileOpen])

	function toggleThemeMode() {
		setThemeMode((current) => {
			const next = current === 'dark' ? 'light' : 'dark'
			try {
				window.localStorage.setItem(THEME_STORAGE_KEY, next)
			} catch {
				// Ignore storage failures, for example private browsing restrictions.
			}
			return next
		})
	}

	useEffect(() => revokeBusinessLogoObjectUrl, [])
	const { flashTarget, flash } = useFlashTarget(FEEDBACK_PULSE_MS)

	function setError(notice: ApiErrorNotice | null) {
		if (notice) {
			showToast(apiErrorToast(notice))
		}
	}

	function clearPendingUndo(options: { dismissToast?: boolean } = {}) {
		const pending = pendingUndoRef.current
		if (undoTimerRef.current) {
			window.clearTimeout(undoTimerRef.current)
			undoTimerRef.current = null
		}
		pendingUndoRef.current = null
		if (options.dismissToast !== false && pending?.toastId) {
			dismissToast(pending.toastId)
		}
	}

	function registerUndoAction<T>(
		result: T,
		undo: UndoAction<T>,
		successTitle: string,
		successDescription?: string,
	) {
		clearPendingUndo()
		const id = nextUndoIdRef.current + 1
		nextUndoIdRef.current = id
		const pending: PendingUndoAction = {
			id,
			toastId: null,
			expiresAt: Date.now() + UNDO_WINDOW_MS,
			busy: false,
			execute: () => undo.execute(result),
			successTitle:
				resolveActionMessage(undo.successTitle, result) ?? 'Cambio deshecho',
			successDescription:
				resolveActionMessage(undo.successDescription, result) ?? undefined,
		}
		pendingUndoRef.current = pending
		const undoDescription =
			resolveActionMessage(undo.description, result) ??
			successDescription ??
			'Tenes unos segundos para arrepentirte.'
		pending.toastId = showToast({
			tone: 'success',
			title: successTitle,
			description: undoDescription,
			visibleMs: UNDO_WINDOW_MS,
			action: {
				label: resolveActionMessage(undo.label, result) ?? 'Deshacer',
				title: 'Deshacer la ultima accion (Ctrl+Z)',
				onClick: () => executePendingUndo(id),
			},
		})
		undoTimerRef.current = window.setTimeout(() => {
			if (pendingUndoRef.current?.id === id) {
				clearPendingUndo({ dismissToast: false })
			}
		}, UNDO_WINDOW_MS)
	}

	async function executePendingUndo(expectedId?: number) {
		const pending = pendingUndoRef.current
		if (!pending || (expectedId && pending.id !== expectedId) || pending.busy) {
			return
		}
		if (Date.now() > pending.expiresAt) {
			clearPendingUndo()
			return
		}
		pending.busy = true
		setError(null)
		try {
			await loadData({ force: true })
			const successTitle = pending.successTitle
			const successDescription = pending.successDescription
			clearPendingUndo()
			showToast({
				tone: 'success',
				title: successTitle,
				description: successDescription,
			})
		} catch (err: any) {
			pending.busy = false
			setError(formatApiError(err))
		}
	}

	executeUndoRef.current = (id?: number) => {
		void executePendingUndo(id)
	}

	useEffect(() => {
		function handleUndoShortcut(event: globalThis.KeyboardEvent) {
			if (!shouldHandleUndoShortcut(event)) return
			const pending = pendingUndoRef.current
			if (!pending || pending.busy || Date.now() > pending.expiresAt) return
			event.preventDefault()
			executeUndoRef.current(pending.id)
		}

		window.addEventListener('keydown', handleUndoShortcut)
		return () => {
			window.removeEventListener('keydown', handleUndoShortcut)
			if (undoTimerRef.current) {
				window.clearTimeout(undoTimerRef.current)
				undoTimerRef.current = null
			}
		}
	}, [])

	const businessLogoObjectUrlRef = useRef<string | null>(null)
	const businessLogoInputRef = useRef<HTMLInputElement | null>(null)
	const suppressAgendaClickRef = useRef(false)
	const suppressAgendaClickTimeoutRef = useRef<number | null>(null)
	const suppressQuoteClickRef = useRef(false)
	const suppressQuoteClickTimeoutRef = useRef<number | null>(null)
	const agendaSensors = useSensors(
		useSensor(AgendaMouseSensor, {
			activationConstraint: { distance: AGENDA_DRAG_MOUSE_DISTANCE },
		}),
		useSensor(AgendaTouchSensor, {
			activationConstraint: {
				delay: AGENDA_DRAG_TOUCH_DELAY_MS,
				tolerance: AGENDA_DRAG_TOUCH_TOLERANCE,
			},
		}),
	)

	function revokeBusinessLogoObjectUrl() {
		if (!businessLogoObjectUrlRef.current) return
		window.URL.revokeObjectURL(businessLogoObjectUrlRef.current)
		businessLogoObjectUrlRef.current = null
	}

	function isPdfFile(file: File | null) {
		if (!file) return false
		return file.type === 'application/pdf' || isPdfAssetName(file.name)
	}

	function syncBusinessForm(nextForm: AnyRecord) {
		businessFormRef.current = nextForm
		setBusinessForm(nextForm)
	}

	function syncProfileForm(user: AnyRecord | null) {
		setProfileForm(blankProfileForm(user))
	}

	function openProfileModal() {
		syncProfileForm(currentUser)
		setProfileModalOpen(true)
	}

	function closeProfileModal() {
		setProfileModalOpen(false)
		syncProfileForm(currentUser)
	}

	function patchBusinessForm(patch: AnyRecord) {
		syncBusinessForm({
			...businessFormRef.current,
			...patch,
		})
	}

	function syncBusinessProfile(profile: AnyRecord | null) {
		revokeBusinessLogoObjectUrl()
		setBusinessProfile(profile)
		setBusinessLogoFile(null)
		setBusinessLogoInputKey((current) => current + 1)
		setBusinessLogoPreview(profile?.logo_url ?? null)
		const nextBusinessForm = profile
			? {
					name: String(profile.name ?? ''),
					cuit: String(profile.cuit ?? ''),
					vat_condition: String(profile.vat_condition ?? ''),
					contact_phone: String(profile.contact_phone ?? ''),
					contact_email: String(profile.contact_email ?? ''),
					address: String(profile.address ?? ''),
					default_quote_validity_days: String(
						profile.default_quote_validity_days ?? '7',
					),
					default_quote_tax_rate: String(
						profile.default_quote_tax_rate ?? '0',
					),
					default_quote_discount_rate: String(
						profile.default_quote_discount_rate ?? '0',
					),
					default_quote_terms: String(profile.default_quote_terms ?? ''),
					default_quote_payment_instructions: String(
						profile.default_quote_payment_instructions ?? '',
					),
					use_reservation_times:
						profile.use_reservation_times !== false,
					show_stay_days_in_agenda:
						profile.show_stay_days_in_agenda !== false,
					public_landing_enabled:
						profile.public_landing_enabled !== false,
					public_landing_intro: String(
						profile.public_landing_intro ?? '',
					),
					allow_public_booking_requests:
						profile.allow_public_booking_requests !== false,
					allow_public_quote_requests:
						profile.allow_public_quote_requests !== false,
					income_category_tree: normalizeIncomeCategoryTree(
						profile.income_category_tree,
					),
					expense_category_tree: normalizeExpenseCategoryTree(
						profile.expense_category_tree,
					),
				}
			: blankBusinessForm()
		syncBusinessForm(nextBusinessForm)
		setExpenseClassificationForm({
			movement_type: 'expense',
			category: '',
			subcategory: '',
			originalCategory: '',
			originalSubcategory: '',
		})
	}

	function handleBusinessLogoChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null
		setBusinessLogoFile(file)
		revokeBusinessLogoObjectUrl()
		if (!file) {
			setBusinessLogoPreview(businessProfile?.logo_url ?? null)
			return
		}
		const objectUrl = window.URL.createObjectURL(file)
		businessLogoObjectUrlRef.current = objectUrl
		setBusinessLogoPreview(objectUrl)
	}

	function openBusinessLogoPicker() {
		businessLogoInputRef.current?.click()
	}

	const businessLogoIsPdf = businessLogoFile
		? isPdfFile(businessLogoFile)
		: isPdfAssetSource(businessLogoPreview)

	const sidebarAvatarIsPdf = isPdfAssetSource(currentUser?.avatar_url)

	const { thumbnail: businessLogoPdfThumbnail, status: businessLogoPdfStatus } =
		usePdfThumbnailPreview(businessLogoPreview, businessLogoIsPdf, 720)
	const safeBusinessLogoPreview = safeImageAssetSource(businessLogoPreview)
	const safeBusinessLogoPdfThumbnail = safeImageAssetSource(
		businessLogoPdfThumbnail,
	)

	const {
		thumbnail: sidebarAvatarPdfThumbnail,
	} = usePdfThumbnailPreview(currentUser?.avatar_url ?? null, sidebarAvatarIsPdf, 128)
	const safeSidebarAvatarUrl = safeImageAssetSource(currentUser?.avatar_url)
	const safeSidebarAvatarPdfThumbnail = safeImageAssetSource(
		sidebarAvatarPdfThumbnail,
	)

	useEffect(() => {
		syncProfileForm(currentUser)
	}, [currentUser])

	useEffect(() => {
		if (!formModal) return
		const firstFocus: Record<FormModalKind, string> = {
			customer: 'customer.name',
			vehicle: 'vehicle.customer',
			quote: 'quote.customer',
			service: 'service.name',
			payment: 'payment.work_order',
			'cash-movement': 'cash-movement.type',
			'expense-classification': 'expense-classification.type',
			debt: 'debt.concept',
			'debt-payment': 'debt-payment.debt',
			material: 'material.name',
			supplier: 'supplier.name',
			'stock-movement': 'stock-movement.type',
			'material-purchase': 'material-purchase.material',
			'material-open-unit': 'material-open-unit.material',
			'material-consumption': 'material-consumption.work_order',
			tool: 'tool.name',
			employee: 'employee.username',
		}
		focusField(firstFocus[formModal.kind], formModal.kind !== 'customer')
	}, [formModal?.kind])

	useEffect(() => {
		if (quickReservationDay) {
			focusField('reservation.customer', true)
		}
	}, [quickReservationDay])

	useEffect(() => {
		if (!detailModal?.editing) return
		const firstFocus: Record<string, string> = {
			customer: 'detail.customer.name',
			vehicle: 'detail.vehicle.customer',
			reservation: 'detail.reservation.customer',
			workorder: 'detail.workorder.customer',
		}
		const target = firstFocus[detailModal.kind]
		if (target) {
			const openCustomerCombo =
				target.includes('.customer') && detailModal.kind !== 'reservation'
			focusField(target, openCustomerCombo)
		}
	}, [detailModal?.kind, detailModal?.data?.id, detailModal?.editing])

	useEffect(() => {
		if (!detailModal || detailModal.kind !== 'customer' || !canViewEconomy) {
			setCustomerHistory(null)
			setCustomerHistoryLoading(false)
			return
		}
		let ignore = false
		setCustomerHistory(null)
		setCustomerHistoryLoading(true)
		apiFetch<AnyRecord>(`/customers/${detailModal.data.id}/history/`)
			.then((history) => {
				if (!ignore) {
					setCustomerHistory(history)
				}
			})
			.catch((err) => {
				if (!ignore) {
					setError(
						formatApiError(err, {
							fallbackTitle: 'No se pudo cargar el historial',
							fallbackDescription:
								'El detalle del cliente sigue disponible, pero el historial economico no se pudo consultar.',
						}),
					)
				}
			})
			.finally(() => {
				if (!ignore) {
					setCustomerHistoryLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [canViewEconomy, detailModal?.kind, detailModal?.data?.id])

	useEffect(() => {
		if (!customerDashboard || !canViewEconomy) {
			setCustomerDashboardHistory(null)
			setCustomerDashboardLoading(false)
			return
		}
		let ignore = false
		setCustomerDashboardHistory(null)
		setCustomerDashboardLoading(true)
		apiFetch<AnyRecord>(`/customers/${customerDashboard.id}/history/`)
			.then((history) => {
				if (!ignore) {
					setCustomerDashboardHistory(history)
				}
			})
			.catch((err) => {
				if (!ignore) {
					setError(
						formatApiError(err, {
							fallbackTitle: 'No se pudo cargar el dashboard del cliente',
							fallbackDescription:
								'El listado sigue disponible, pero los datos economicos del cliente no se pudieron consultar.',
						}),
					)
				}
			})
			.finally(() => {
				if (!ignore) {
					setCustomerDashboardLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [canViewEconomy, customerDashboard?.id])

	useEffect(() => {
		if (!serviceDashboard || !canViewEconomy) {
			setServiceDashboardHistory(null)
			setServiceDashboardLoading(false)
			return
		}
		let ignore = false
		setServiceDashboardHistory(null)
		setServiceDashboardLoading(true)
		apiFetch<AnyRecord>(`/services/${serviceDashboard.id}/history/`)
			.then((history) => {
				if (!ignore) {
					setServiceDashboardHistory(history)
				}
			})
			.catch((err) => {
				if (!ignore) {
					setError(
						formatApiError(err, {
							fallbackTitle: 'No se pudo cargar el dashboard del servicio',
							fallbackDescription:
								'El listado sigue disponible, pero los datos operativos del servicio no se pudieron consultar.',
						}),
					)
				}
			})
			.finally(() => {
				if (!ignore) {
					setServiceDashboardLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [canViewEconomy, serviceDashboard?.id])

	useEffect(() => {
		if (!supplierDashboard || !canViewEconomy) {
			setSupplierDashboardHistory(null)
			setSupplierDashboardLoading(false)
			return
		}
		let ignore = false
		setSupplierDashboardHistory(null)
		setSupplierDashboardLoading(true)
		apiFetch<AnyRecord>(`/suppliers/${supplierDashboard.id}/history/`)
			.then((history) => {
				if (!ignore) {
					setSupplierDashboardHistory(history)
				}
			})
			.catch((err) => {
				if (!ignore) {
					setError(
						formatApiError(err, {
							fallbackTitle: 'No se pudo cargar el dashboard del proveedor',
							fallbackDescription:
								'El listado sigue disponible, pero los datos operativos del proveedor no se pudieron consultar.',
						}),
					)
				}
			})
			.finally(() => {
				if (!ignore) {
					setSupplierDashboardLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [canViewEconomy, supplierDashboard?.id])

	const customerVehicleSearchTextById = useMemo(() => {
		const grouped = new Map<string, string[]>()
		vehicles.forEach((vehicle) => {
			const customerId = String(vehicle.customer ?? '')
			if (!customerId) return
			const values = grouped.get(customerId) ?? []
			values.push(
				String(vehicle.license_plate ?? ''),
				String(vehicle.brand ?? ''),
				String(vehicle.model ?? ''),
			)
			grouped.set(customerId, values)
		})
		return grouped
	}, [vehicles])

	const customerVehicleCountById = useMemo(() => {
		const grouped = new Map<string, number>()
		vehicles.forEach((vehicle) => {
			const customerId = String(vehicle.customer ?? '')
			if (!customerId) return
			grouped.set(customerId, (grouped.get(customerId) ?? 0) + 1)
		})
		return grouped
	}, [vehicles])

	const filteredCustomers = useMemo(() => {
		const term = search.trim().toLowerCase()
		return customers.filter((item) => {
			const insights = customerListInsights(item)
			if (
				customerCardFilter === 'with_reservation' &&
				!insights.has_upcoming_reservation
			) {
				return false
			}
			if (customerCardFilter === 'birthday_soon' && !item.has_birthday_alert) {
				return false
			}
			if (customerCardFilter === 'no_upcoming' && insights.has_upcoming_reservation) {
				return false
			}
			if (customerCardFilter === 'with_balance' && !insights.has_balance_due) {
				return false
			}
			if (!term) return true
			const vehicleTerms = customerVehicleSearchTextById.get(String(item.id)) ?? []
			return [
				item.name,
				item.phone,
				item.email,
				...vehicleTerms,
				insights.last_vehicle_label,
				insights.last_service_name,
			].some((value) =>
				String(value ?? '')
					.toLowerCase()
					.includes(term),
			)
		})
	}, [customerCardFilter, customerVehicleSearchTextById, customers, search])

	const filteredVehicles = useMemo(() => {
		return vehicles.filter((item) => vehicleMatchesSearch(item, search))
	}, [vehicles, search])

	const filteredTools = useMemo(() => {
		const term = search.toLowerCase()
		if (!term) return tools
		return tools.filter((item) =>
			[
				item.name,
				toolStatusLabels[item.status],
				item.status,
				item.notes,
			].some((value) =>
				String(value ?? '')
					.toLowerCase()
					.includes(term),
			),
		)
	}, [tools, search])

	const filteredDebts = useMemo(() => {
		return debts.filter((item) => debtMatchesFilters(item, debtFilters, search))
	}, [debtFilters, debts, search])

	const filteredSuppliers = useMemo(() => {
		const term = search.trim().toLowerCase()
		if (!term) return suppliers
		return suppliers.filter((item) => {
			const insights = item.list_insights ?? {}
			return [
				item.name,
				item.legal_name,
				item.category,
				item.tax_condition,
				item.contact_name,
				item.phone,
				item.email,
				item.tax_id,
				item.website,
				insights.last_purchase_on,
			].some((value) =>
				String(value ?? '')
					.toLowerCase()
					.includes(term),
			)
		})
	}, [suppliers, search])

	const agendaHeaderDays = useMemo(
		() =>
			Array.from({ length: AGENDA_VISIBLE_DAYS }, (_, index) =>
				addDays(agendaStartDay, index),
			),
		[agendaStartDay],
	)
	const weekEndDay = agendaHeaderDays[agendaHeaderDays.length - 1] ?? agendaStartDay

	const workOrderByReservation = useMemo(
		() => buildWorkOrderByReservation(workOrders),
		[workOrders],
	)
	const serviceTypeById = useMemo(
		() =>
			services.reduce<Record<string, string>>((byId, service) => {
				byId[String(service.id)] = String(service.service_type ?? '')
				return byId
			}, {}),
		[services],
	)
	const visibleAgendaReservations = useMemo(
		() =>
			filterAgendaReservationsByBucket(
				reservations,
				serviceTypeById,
				agendaServiceBucket,
			),
		[agendaServiceBucket, reservations, serviceTypeById],
	)
	const workStatusGroups = useMemo(
		() =>
			groupReservationsByWorkOrderStatusColumns(
				visibleAgendaReservations,
				workOrders,
				workStatusColumns,
			),
		[visibleAgendaReservations, workOrders],
	)
	const workEntryDateGroups = useMemo(
		() => groupReservationsByEntryDate(visibleAgendaReservations, currentDay),
		[currentDay, visibleAgendaReservations],
	)
	const workFreeQuotesWithoutEntryDate = useMemo(
		() =>
			filterFreeQuotesByServiceBucket(
				quotes,
				serviceTypeById,
				agendaServiceBucket,
			),
		[agendaServiceBucket, quotes, serviceTypeById],
	)
	const agendaBoardModel = useMemo(() => {
		const rowsByDay = buildAgendaOperationalRows(
			visibleAgendaReservations,
			workOrders,
			agendaHeaderDays,
			{ showStayDays: showStayDaysInAgenda },
			workOrderByReservation,
		)
		const segments = buildAgendaCalendarSegments(
			visibleAgendaReservations,
			workOrders,
			agendaHeaderDays,
			{ showStayDays: showStayDaysInAgenda },
			workOrderByReservation,
		)
		const stackRows = segments.reduce(
			(maxRows, segment) => Math.max(maxRows, segment.stackRow),
			0,
		)
		const laneEndRow = stackRows + 3

		return {
			key: `agenda-board:${agendaStartDay}:${showStayDaysInAgenda ? 'stay' : 'entry-only'}`,
			startDay: agendaStartDay,
			days: agendaHeaderDays,
			rowsByDay,
			segments,
			dayCount: agendaHeaderDays.length,
			isInteractive: true,
			laneEndRow,
			stackRows,
		}
	}, [
		agendaHeaderDays,
		agendaStartDay,
		visibleAgendaReservations,
		workOrders,
		workOrderByReservation,
		showStayDaysInAgenda,
	])
	const agendaServiceBucketLabel =
		agendaServiceBuckets.find((item) => item.value === agendaServiceBucket)
			?.label ?? 'Agenda'
	const agendaRangeSummary = `${agendaServiceBucketLabel}: ${
		visibleAgendaReservations.length
	} ${
		visibleAgendaReservations.length === 1
			? 'reserva visible'
			: 'reservas visibles'
	}, ${agendaBoardModel.segments.length} ${
		agendaBoardModel.segments.length === 1
			? 'movimiento en rango'
			: 'movimientos en rango'
	}.`
	const weekDays = agendaBoardModel.days
	const activeAgendaRow = useMemo(() => {
		if (!activeAgendaReservationId) return null
		const reservation = reservations.find(
			(item) => String(item.id) === activeAgendaReservationId,
		)
		if (!reservation) return null
		const workOrder =
			reservation.work_order ??
			workOrderByReservation[activeAgendaReservationId] ??
			null
		return {
			key: `reservation:${activeAgendaReservationId}`,
			day: String(reservation.day ?? ''),
			displayDay: String(reservation.day ?? ''),
			phase: 'entry',
			kind: workOrder ? 'reservation-work-order' : 'reservation-only',
			reservation,
			workOrder,
		} satisfies AgendaOperationalRow
	}, [activeAgendaReservationId, reservations, workOrderByReservation])
	const activeWorkStatusRow = useMemo(() => {
		if (!activeWorkStatusReservationId) return null
		const reservation = reservations.find(
			(item) => String(item.id) === activeWorkStatusReservationId,
		)
		if (!reservation) return null
		const workOrder = workOrderForReservation(reservation, workOrderByReservation)
		return {
			key: `reservation:${activeWorkStatusReservationId}`,
			day: String(reservation.day ?? ''),
			displayDay: String(reservation.day ?? ''),
			phase: 'entry',
			kind: workOrder ? 'reservation-work-order' : 'reservation-only',
			reservation,
			workOrder,
		} satisfies AgendaOperationalRow
	}, [activeWorkStatusReservationId, reservations, workOrderByReservation])
	const quoteBoard = useMemo(() => {
		const draft = quotes.filter((item) => quoteLaneStatus(item) === 'draft')
		const sent = quotes.filter((item) => quoteLaneStatus(item) === 'sent')
		return { draft, sent }
	}, [quotes])
	const activeQuoteDrag = useMemo(() => {
		if (!activeQuoteDragId) return null
		return quotes.find((item) => String(item.id) === activeQuoteDragId) ?? null
	}, [activeQuoteDragId, quotes])

	function serviceForLine(item: AnyRecord) {
		return services.find(
			(serviceItem) => String(serviceItem.id) === String(item.service),
		)
	}

	function serviceNotesForLine(item: AnyRecord) {
		return item.service_notes ?? serviceForLine(item)?.notes ?? ''
	}

	function serviceNameForLine(item: AnyRecord) {
		const service = serviceForLine(item)
		return serviceDisplayName(
			{
				...service,
				...item,
				service_icon: item.service_icon ?? service?.icon,
				service_name: item.service_name ?? item.description ?? service?.name,
			},
			'Servicio',
		)
	}

	function serviceLinePayload(items: AnyRecord[]) {
		return items.map((item) => {
			const service = serviceForLine(item)
			return {
				service: item.service,
				description: item.description || service?.name || 'Servicio',
				quantity: item.quantity || '1',
				unit_price: item.unit_price || service?.base_price || '0',
			}
		})
	}

	function serviceLinesTotal(items: AnyRecord[]) {
		return items.reduce(
			(total: number, item: AnyRecord) =>
				total + Number(item.quantity || 0) * Number(item.unit_price || 0),
			0,
		)
	}

	function quoteDefaultsFromBusinessProfile() {
		const validityDays = Number(businessFormRef.current.default_quote_validity_days ?? 7)
		const validUntil = new Date()
		validUntil.setDate(
			validUntil.getDate() + (Number.isFinite(validityDays) ? validityDays : 7),
		)
		return {
			valid_until: toIsoDate(validUntil),
			tax_rate: String(businessFormRef.current.default_quote_tax_rate ?? '0'),
			discount_rate: String(
				businessFormRef.current.default_quote_discount_rate ?? '0',
			),
			terms: String(businessFormRef.current.default_quote_terms ?? ''),
			payment_instructions: String(
				businessFormRef.current.default_quote_payment_instructions ?? '',
			),
		}
	}

	function blankQuoteFormWithDefaults(reservationDay = '') {
		return {
			...blankQuoteForm(reservationDay),
			...quoteDefaultsFromBusinessProfile(),
		}
	}

	const quoteTotals = useMemo(() => {
		const subtotal = serviceLinesTotal(quoteForm.items ?? [])
		const discountRate = Number(quoteForm.discount_rate || 0)
		const taxRate = Number(quoteForm.tax_rate || 0)
		const discountAmount = subtotal * Math.max(discountRate, 0) / 100
		const taxableAmount = Math.max(subtotal - discountAmount, 0)
		const taxAmount = taxableAmount * Math.max(taxRate, 0) / 100
		return {
			subtotal,
			discountAmount,
			taxableAmount,
			taxAmount,
			total: taxableAmount + taxAmount,
		}
	}, [quoteForm.items, quoteForm.discount_rate, quoteForm.tax_rate])

	const auditModuleOptions = useMemo(
		() =>
			Array.from(new Set(auditLogs.map((item) => String(item.module ?? ''))))
				.filter(Boolean)
				.sort((left, right) =>
					auditModuleLabel(left).localeCompare(auditModuleLabel(right), 'es-AR'),
				),
		[auditLogs],
	)
	const auditActionOptions = useMemo(
		() =>
			Array.from(new Set(auditLogs.map((item) => String(item.action ?? ''))))
				.filter(Boolean)
				.sort((left, right) =>
					auditActionLabel(left).localeCompare(auditActionLabel(right), 'es-AR'),
				),
		[auditLogs],
	)
	const auditActorOptions = useMemo(
		() =>
			Array.from(
				new Set(
					auditLogs.map((item) => String(item.actor_username ?? '')).filter(Boolean),
				),
			).sort((left, right) => left.localeCompare(right, 'es-AR')),
		[auditLogs],
	)
	const auditFiltersActive = Object.values(auditFilters).some((value) =>
		String(value ?? '').trim(),
	)

	function auditActionLabel(action: string) {
		return auditActionLabels[action] ?? action
	}

	function auditModuleLabel(module: string) {
		return auditModuleLabels[module] ?? module
	}

	function updateAuditFilter(key: keyof AuditLogFilters, value: string) {
		setAuditFilters((current) => ({
			...current,
			[key]: value,
		}))
	}

	async function refreshAuditLogs(filters: AuditLogFilters = auditFilters) {
		if (!canViewEconomy) return
		const logs = await auditLogListOrEmpty<AnyRecord>(apiList, filters)
		auditLogsLoadedRef.current = true
		setAuditLogs(logs)
	}

	async function applyAuditFilters(event: FormEvent) {
		event.preventDefault()
		if (!canViewEconomy) return
		setLoading(true)
		try {
			await refreshAuditLogs(auditFilters)
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo cargar el historial',
					fallbackDescription:
						'Revisa los filtros o actualiza nuevamente.',
				}),
			)
		} finally {
			setLoading(false)
		}
	}

	async function clearAuditFilters() {
		const emptyFilters: AuditLogFilters = {}
		setAuditFilters(emptyFilters)
		if (!canViewEconomy) return
		setLoading(true)
		try {
			await refreshAuditLogs(emptyFilters)
		} finally {
			setLoading(false)
		}
	}

	type LoadDataOptions = {
		force?: boolean
		section?: Section
		settingsSection?: SettingsSection
	}

	const appDataAppliers: AppDataAppliers = {
		dashboard: setDashboard,
		cash: setCash,
		customers: setCustomers,
		vehicles: setVehicles,
		services: setServices,
		reservations: setReservations,
		workOrders: setWorkOrders,
		payments: setPayments,
		debts: setDebts,
		debtPayments: setDebtPayments,
		materials: setMaterials,
		suppliers: setSuppliers,
		stockMovements: setStockMovements,
		materialOpenUnits: setMaterialOpenUnits,
		purchases: setPurchases,
		consumptions: setConsumptions,
		tools: setTools,
		quotes: setQuotes,
		publicRequests: setPublicRequests,
		businessProfile: syncBusinessProfile,
		employees: setEmployees,
	}

	async function loadData(options: LoadDataOptions = {}) {
		const dataScope = { period, selectedDay }
		const keys = dataSetKeysForSection({
			section: options.section ?? displayedActive,
			settingsSection: options.settingsSection ?? settingsSection,
			canViewEconomy,
		})
		if (options.force) {
			loadedDataCacheRef.current.clear()
		}
		const keysToLoad = options.force
			? keys
			: keys.filter(
					(key) =>
						!loadedDataCacheRef.current.has(
							dataSetCacheKey(key, dataScope),
						),
				)

		if (!keysToLoad.length) return

		setLoading(true)
		setError(null)
		setAgendaLoadError(null)
		setLoadErrorNotice(null)
		try {
			const entries = await loadAppDataSets(keysToLoad, dataScope, {
				apiFetch,
				apiList,
			})
			for (const [key, data] of entries) {
				applyAppDataEntry(key, data, appDataAppliers)
				loadedDataCacheRef.current.add(dataSetCacheKey(key, dataScope))
			}
		} catch (err: any) {
			const notice = formatApiError(err, {
				fallbackTitle: 'No se pudieron cargar los datos',
				fallbackDescription:
					'Actualiza nuevamente o revisa la conexion con el servidor.',
			})
			setAgendaLoadError(notice)
			setLoadErrorNotice(notice)
			setError(notice)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		const stored = getStoredToken()
		if (stored) {
			setToken(stored)
		}
	}, [])

	useEffect(() => {
		if (!token) {
			loadedDataCacheRef.current.clear()
			setCurrentUser(null)
			syncBusinessProfile(null)
			setAuditLogs([])
			auditLogsLoadedRef.current = false
			setPublicRequests([])
			return
		}
		if (currentUser) return

		let ignore = false
		setLoading(true)
		apiFetch<AnyRecord>('/auth/me/')
			.then((user) => {
				if (!ignore) {
					setCurrentUser(user)
				}
			})
			.catch(() => {
				clearStoredToken()
				if (!ignore) {
					setToken(null)
					setCurrentUser(null)
				}
			})
			.finally(() => {
				if (!ignore) {
					setLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [currentUser, token])

	useEffect(() => {
		if (token && currentUser) {
			loadData()
		}
	}, [currentUser, displayedActive, selectedDay, settingsSection, token])

	useEffect(() => {
		if (
			!canViewEconomy ||
			displayedActive !== 'settings' ||
			settingsSection !== 'history' ||
			auditLogsLoadedRef.current
		) {
			return
		}

		let ignore = false
		setLoading(true)
		auditLogListOrEmpty<AnyRecord>(apiList, auditFilters)
			.then((logs) => {
				if (ignore) return
				auditLogsLoadedRef.current = true
				setAuditLogs(logs)
			})
			.catch((err: any) => {
				if (ignore) return
				setError(
					formatApiError(err, {
						fallbackTitle: 'No se pudo cargar el historial',
						fallbackDescription:
							'Actualiza nuevamente o revisa la conexion con el servidor.',
					}),
				)
			})
			.finally(() => {
				if (!ignore) {
					setLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [auditFilters, canViewEconomy, displayedActive, settingsSection])

	useEffect(() => {
		if (!currentUser || canViewEconomy || !sectionRequiresEmployer(active)) return
		navigationHistoryModeRef.current = 'replaceState'
		setActive('agenda')
	}, [active, canViewEconomy, currentUser])

	useEffect(() => {
		return () => {
			if (suppressAgendaClickTimeoutRef.current) {
				window.clearTimeout(suppressAgendaClickTimeoutRef.current)
			}
		}
	}, [])

	function recordFlashKey(kind: string, id: string | number | null | undefined) {
		return id === null || id === undefined || id === ''
			? null
			: `record:${kind}:${id}`
	}

	function fieldFlashKey(target: string) {
		return `field:${target}`
	}

	function flashClass(target: string | null) {
		return target && flashTarget === target ? 'motion-flash' : ''
	}

	function recordClass(kind: string, id: string | number, extraClass?: string) {
		return cx('record', extraClass, flashClass(recordFlashKey(kind, id)))
	}

	function focusField(focusKey: string, openCombo = false) {
		if (!focusKey) return
		window.setTimeout(() => {
			const container = document.querySelector(
				`[data-focus-key="${focusKey}"]`,
			) as HTMLElement | null
			if (!container) return
			const focusTarget = (
				container.matches('input, textarea, button, select')
					? container
					: container.querySelector('button, input, textarea, select')
			) as HTMLElement | null
			focusTarget?.focus()
			if (
				openCombo &&
				focusTarget instanceof HTMLButtonElement &&
				container.classList.contains('combo-field')
			) {
				focusTarget.click()
			}
		}, 0)
	}

	function focusNextOnEnter(nextFocusKey: string, openCombo = false) {
		return (event: KeyboardEvent<HTMLElement>) => {
			if (event.key !== 'Enter') return
			event.preventDefault()
			focusField(nextFocusKey, openCombo)
		}
	}

	function vehiclesForCustomerId(customerId: string) {
		if (!customerId) return []
		return vehicles.filter(
			(vehicle) => String(vehicle.customer) === String(customerId),
		)
	}

	function singleVehicleIdForCustomer(customerId: string) {
		const matches = vehiclesForCustomerId(customerId)
		return matches.length === 1 ? String(matches[0].id) : ''
	}

	function vehicleDescription(item: AnyRecord) {
		return vehicleDescriptionText(item)
	}

	function reservationVehicleModel(reservation: AnyRecord) {
		const vehicle = vehicles.find(
			(item) => String(item.id) === String(reservation.vehicle),
		)
		return [vehicle?.brand, vehicle?.model]
			.map((value) => String(value ?? '').trim())
			.filter(Boolean)
			.join(' ')
	}

	function reservationAgendaServices(reservation: AnyRecord) {
		const itemLines = Array.isArray(reservation.items)
			? reservation.items
					.map((item: AnyRecord, index: number) => ({
						key: String(item.id ?? item.service ?? item.description ?? index),
						name: serviceDisplayName(
							{
								service_icon: item.service_icon,
								service_name: item.service_name ?? item.description,
							},
							'',
						),
					}))
					.filter((item) => item.name)
			: []
		if (itemLines.length) return itemLines
		return String(reservation.service_name ?? '')
			.split(',')
			.map((name, index) => ({
				key: `${name.trim()}-${index}`,
				name: name.trim(),
			}))
			.filter((item) => item.name)
	}

	function reservationAgendaCardClass(status: string) {
		return cx(
			'agenda-operational-card',
			reservationAgendaClassNames[status] ?? '',
		)
	}

	function agendaCardFlashKey(rowKey: string) {
		return `agenda:${rowKey}`
	}

	function agendaColumnStyle(column: number): CSSProperties {
		return { gridColumn: String(column) }
	}

	function agendaLaneStyle(column: number, laneEndRow: number): CSSProperties {
		return {
			gridColumn: String(column),
			gridRow: `1 / ${laneEndRow}`,
		}
	}

	function agendaSegmentStyle(segment: AgendaCalendarSegment): CSSProperties {
		return {
			gridColumn: `${segment.startColumn} / span ${segment.spanDays}`,
			gridRow: String(segment.stackRow + 1),
		}
	}

	const shouldSuppressEnteringAgendaOverlap =
		agendaOverlapSuppressedStartDay === agendaBoardModel.startDay &&
		agendaSlideWindowsOverlap(agendaSlideMotion, AGENDA_VISIBLE_DAYS)

	function shouldHideEnteringAgendaColumn(column: number) {
		if (!shouldSuppressEnteringAgendaOverlap) return false
		const offset = Math.abs(agendaSlideMotion.offsetDays)
		if (offset <= 0 || offset >= AGENDA_VISIBLE_DAYS) return false

		return agendaSlideMotion.direction === 'forward'
			? column <= AGENDA_VISIBLE_DAYS - offset
			: column > offset
	}

	function shouldHideEnteringAgendaSegment(segment: AgendaCalendarSegment) {
		if (!shouldSuppressEnteringAgendaOverlap) return false
		const offset = Math.abs(agendaSlideMotion.offsetDays)
		if (offset <= 0 || offset >= AGENDA_VISIBLE_DAYS) return false

		const endColumn = segment.startColumn + segment.spanDays - 1
		return agendaSlideMotion.direction === 'forward'
			? segment.startColumn <= AGENDA_VISIBLE_DAYS - offset
			: endColumn > offset
	}

	function agendaBoardGridStyle(
		dayCount: number,
		stackRows: number,
	): CSSProperties {
		const rows = ['auto']
		for (let index = 0; index < stackRows; index += 1) {
			rows.push('auto')
		}
		rows.push('minmax(240px, 1fr)')
		return {
			'--agenda-board-days': String(dayCount),
			gridTemplateRows: rows.join(' '),
		} as CSSProperties
	}

	function agendaCardClass(row: AgendaOperationalRow) {
		const reservationStatus = row.reservation?.status
		return cx(
			reservationAgendaCardClass(reservationStatus),
			row.workOrder ? 'agenda-operational-card--with-order' : '',
		)
	}

	function reservationShowsWork(reservation: AnyRecord, workOrder: AnyRecord | null | undefined) {
		return Boolean(
			workOrder &&
				!['pending', 'canceled'].includes(String(reservation.status ?? '')),
		)
	}

	function reservationStartTimeLabel(
		reservation: AnyRecord | null | undefined,
		fallback = '',
	) {
		if (!useReservationTimes) return ''
		return formatTimeLabel(reservation?.start_time) || fallback
	}

	function reservationExitTimeLabel(reservation: AnyRecord | null | undefined) {
		if (!useReservationTimes) return ''
		return formatTimeLabel(reservation?.exit_time)
	}

	function reservationCustomerTitle(reservation: AnyRecord) {
		const startTime = reservationStartTimeLabel(reservation, 'Sin hora')
		return startTime
			? `${startTime} - ${reservation.customer_name}`
			: String(reservation.customer_name ?? '')
	}

	function quoteTentativeTimeLabel(value: any) {
		if (!useReservationTimes) return ''
		const time = formatTimeLabel(value)
		return time ? ` ${time}` : ''
	}

	function quoteCode(item: AnyRecord) {
		return item.public_code ?? `#${item.id}`
	}

	function quoteHasReservation(item: AnyRecord) {
		return Boolean(item.has_reservation ?? item.reservation)
	}

	function quoteReservationId(item: AnyRecord) {
		return item.reservation === null || item.reservation === undefined
			? ''
			: String(item.reservation)
	}

	function quoteLaneStatus(item: AnyRecord): 'draft' | 'sent' {
		return String(item.status ?? 'draft') === 'draft' ? 'draft' : 'sent'
	}

	function reservationRangeLabel(reservation: AnyRecord) {
		const entryDay = String(reservation.day ?? '')
		const exitDay = String(reservation.exit_day ?? '')
		const startTime = reservationStartTimeLabel(reservation)
		const exitTime = reservationExitTimeLabel(reservation)
		if (!entryDay) {
			return ''
		}
		if (!exitDay || exitDay === entryDay) {
			return exitTime ? `Egreso ${exitTime}` : ''
		}
		const entryLabel = `${formatDayLabel(entryDay)}${startTime ? ` ${startTime}` : ''}`
		const exitLabel = `${formatDayLabel(exitDay)}${exitTime ? ` ${exitTime}` : ''}`
		return `Ingresa ${entryLabel} - Egresa ${exitLabel}`
	}

	function renderWorkOrderSummary(
		workOrder: AnyRecord,
		options: { showDetailAction?: boolean } = {},
	) {
		return (
			<div className="agenda-workorder-summary">
				<div className="agenda-workorder-summary-head">
					<strong>Trabajo de la reserva</strong>
					<div className="record-actions">
						<StatusPill value={workOrder.status} labels={orderLabels} />
						{options.showDetailAction ? (
							<button
								type="button"
								className="ghost"
								onClick={() =>
									openDetailModal('Orden de trabajo', workOrder)
								}
							>
								Editar trabajo
							</button>
						) : null}
					</div>
				</div>
				{canViewEconomy ? (
					<div className="agenda-workorder-metrics">
						<div>
							<span>Total</span>
							<strong>{money(workOrder.total_amount)}</strong>
						</div>
						<div>
							<span>Pagado</span>
							<strong>{money(workOrder.paid_amount)}</strong>
						</div>
						<div>
							<span>Deuda</span>
							<strong className="debt">
								{money(workOrder.balance_due)}
							</strong>
						</div>
						<div>
							<span>Materiales</span>
							<strong>{money(workOrder.material_cost)}</strong>
						</div>
					</div>
				) : null}
			</div>
		)
	}

	function renderAgendaWorkDebt(workOrder: AnyRecord) {
		if (!canViewEconomy) return null
		const materialUsage = workOrderMaterialUsageSummary(workOrder)
		return (
			<div className="agenda-work-debt">
				<div className="agenda-work-debt-main">
					<span>Deuda</span>
					<strong className={Number(workOrder.balance_due) > 0 ? 'debt' : ''}>
						{money(workOrder.balance_due)}
					</strong>
				</div>
				{materialUsage ? (
					<span
						className="agenda-work-materials"
						title={`${materialUsage.label}${materialUsage.extra}`}
					>
						{materialUsage.label}
						{materialUsage.extra}
					</span>
				) : null}
			</div>
		)
	}

	function runAgendaReservationAction(
		action: AgendaReservationAction,
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
	) {
		if (action.kind === 'reservation') {
			const previousStatus = reservation.status
			return runAction(
				() =>
					apiFetch(`/reservations/${reservation.id}/${action.action}/`, {
						method: 'POST',
					}),
				{
					flashTarget: recordFlashKey('reservation', reservation.id),
					successTitle: entityFeedbackTitle('reservation', 'updated'),
					undo: undoPatchRecord(
						`/reservations/${reservation.id}/`,
						{ status: previousStatus },
						'Estado anterior restaurado',
					),
				},
			)
		}

		if (action.kind === 'work-order-status') {
			if (!workOrder) return undefined
			const previousStatus = workOrder.status ?? reservation.status
			return runAction(
				() =>
					apiFetch(`/work-orders/${workOrder.id}/status/`, {
						method: 'POST',
						body: JSON.stringify({
							status: action.status,
						}),
					}),
				{
					flashTarget: agendaCardFlashKey(row.key),
					successTitle: entityFeedbackTitle('workorder', 'updated'),
					undo: {
						execute: async () => {
							await apiFetch(`/work-orders/${workOrder.id}/status/`, {
								method: 'POST',
								body: JSON.stringify({
									status: previousStatus,
								}),
							})
						},
						successTitle: 'Estado anterior restaurado',
					},
				},
			)
		}

		if (workOrder) {
			openPaymentForOrder(workOrder)
		}
		return undefined
	}

	function agendaActionIcon(action: AgendaReservationAction) {
		if (action.kind === 'work-order-charge') return <CreditCard size={15} />
		if (action.kind === 'reservation' && action.action === 'cancel') {
			return <Trash2 size={15} />
		}
		return <CheckCircle2 size={15} />
	}

	function agendaActionTone(action: AgendaReservationAction): QuickAction['tone'] {
		if (action.kind === 'reservation' && action.action === 'cancel') {
			return 'danger'
		}
		return action.variant === 'filled' ? 'primary' : 'default'
	}

	function agendaReservationQuickActions(
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		actions: AgendaReservationAction[],
	) {
		const showWork = reservationShowsWork(reservation, workOrder)
		const workOrderForDetail: AnyRecord | null = workOrder
			? { ...workOrder, _agenda_day: row.day }
			: null
		const detailData = showWork
			? { ...reservation, work_order: workOrderForDetail }
			: reservation
		const customer = customerForRecord(reservation)
		const vehicle = vehicleForRecord(reservation)
		return [
			{
				id: `agenda:reservation:detail:${reservation.id}`,
				label: 'Detalle reserva',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Reserva', detailData),
			},
			{
				id: `agenda:workorder:detail:${workOrder?.id ?? reservation.id}`,
				label: 'Detalle trabajo',
				icon: <Wrench size={15} />,
				hidden: !showWork || !workOrder,
				onSelect: () =>
					workOrderForDetail &&
					openDetailModal('Orden de trabajo', workOrderForDetail),
			},
			{
				id: `agenda:customer:${reservation.id}`,
				label: 'Cliente',
				icon: <Users size={15} />,
				hidden: !customer,
				onSelect: () => customer && openCustomerDashboard(customer),
			},
			{
				id: `agenda:vehicle:${reservation.id}`,
				label: 'Vehiculo',
				icon: <Car size={15} />,
				hidden: !vehicle,
				onSelect: () => vehicle && openDetailModal('Vehiculo', vehicle),
			},
			{
				id: `agenda:quote:${reservation.id}`,
				label: 'Abrir cotizacion',
				icon: <FileText size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => createQuoteFromReservation(reservation),
			},
			{
				id: `agenda:quote-pdf:${reservation.id}`,
				label: 'PDF cotizacion',
				icon: <FileText size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => downloadQuotePdfFromReservation(reservation),
			},
			{
				id: `agenda:consume:${workOrder?.id ?? reservation.id}`,
				label: 'Consumir productos',
				icon: <Package size={15} />,
				hidden: !canViewEconomy || !showWork || !workOrder,
				onSelect: () => workOrder && openConsumptionForOrder(workOrder, row.day),
			},
			...actions.map((action) => ({
				id: `agenda:action:${reservation.id}:${action.kind}:${
					action.kind === 'reservation'
						? action.action
						: action.kind === 'work-order-status'
							? action.status
							: action.label
				}`,
				label: action.label,
				icon: agendaActionIcon(action),
				tone: agendaActionTone(action),
				requiresConfirm:
					action.kind === 'reservation' && action.action === 'cancel',
				onSelect: () =>
					runAgendaReservationAction(
						action,
						reservation,
						showWork ? (workOrder as AnyRecord) : null,
						row,
					),
			} satisfies QuickAction)),
		] satisfies QuickAction[]
	}

	function reservationWorkOrder(reservation: AnyRecord) {
		return workOrderForReservation(reservation, workOrderByReservation)
	}

	function workReservationRow(reservation: AnyRecord) {
		const reservationId = String(reservation.id ?? '')
		const workOrder = reservationWorkOrder(reservation)
		const entryDay = String(reservation.day ?? '')
		return {
			key: `reservation:${reservationId}`,
			day: entryDay,
			displayDay: entryDay,
			phase: 'entry',
			kind: workOrder ? 'reservation-work-order' : 'reservation-only',
			reservation,
			workOrder,
		} satisfies AgendaOperationalRow
	}

	function renderWorkReservationListCard(reservation: AnyRecord) {
		const row = workReservationRow(reservation)
		return (
			<MotionFlashSurface
				className={recordClass(
					'reservation',
					reservation.id,
					cx(
						'compact',
						agendaCardClass(row),
						flashClass(agendaCardFlashKey(row.key)),
					),
				)}
				key={`work-reservation-${reservation.id}`}
			>
				<div className="agenda-card-stack">
					{renderAgendaReservationCard(reservation, row.workOrder, row, {
						statusMode: 'work-order',
					})}
				</div>
			</MotionFlashSurface>
		)
	}

	function renderWorkFreeQuoteCard(item: AnyRecord) {
		const quickActions = quoteQuickActions(item)
		return (
			<MotionFlashSurface
				className={recordClass('quote', item.id, 'quote-board-card')}
				key={`work-free-quote-${item.id}`}
				{...detailRecordProps('Cotizacion', item)}
				{...quickActionTargetProps('Acciones de cotizacion', quickActions)}
			>
				{renderQuickActionsTrigger(
					'Acciones de cotizacion',
					quickActions,
					'Acciones rapidas de cotizacion',
				)}
				{renderQuoteCardContent(item)}
			</MotionFlashSurface>
		)
	}

	function WorkStatusDraggableReservation({
		reservation,
	}: {
		reservation: AnyRecord
	}) {
		const row = workReservationRow(reservation)
		const reservationId = String(reservation.id ?? '')
		const workOrder = row.workOrder
		const workOrderId = String(workOrder?.id ?? '')
		const status = workStatusForReservation(reservation, workOrderByReservation)
		const statusColumn = workStatusColumnForStatus(status, workStatusColumns)
		const canDrag = reservationCanMoveWorkStatus(
			reservation,
			workOrderByReservation,
		)
		const { listeners, setNodeRef, isDragging } = useDraggable({
			id: `work-status-reservation:${reservationId}`,
			data: {
				reservationId,
				status,
				statusGroup: statusColumn?.key,
				workOrderId,
			},
			disabled:
				!reservationId ||
				!canDrag ||
				Boolean(workStatusMovePendingId),
		})

		return (
			<MotionFlashSurface
				ref={setNodeRef}
				{...listeners}
				className={recordClass(
					'reservation',
					reservation.id,
					cx(
						'compact',
						agendaCardClass(row),
						flashClass(agendaCardFlashKey(row.key)),
						'work-status-card',
						'agenda-operational-card--draggable',
						!canDrag && 'agenda-operational-card--locked',
						isDragging && 'agenda-operational-card--dragging',
						workStatusMovePendingId === reservationId &&
							'agenda-operational-card--moving',
					),
				)}
			>
				<div className="agenda-card-stack">
					{renderAgendaReservationCard(reservation, row.workOrder, row, {
						statusMode: 'work-order',
					})}
				</div>
			</MotionFlashSurface>
		)
	}

	function WorkStatusDroppableLane({
		group,
	}: {
		group: {
			key: string
			label: string
			dropStatus?: string
			reservations: AnyRecord[]
		}
	}) {
		const { setNodeRef } = useDroppable({
			id: `work-status:${group.key}`,
			data: { status: group.dropStatus ?? group.key, statusGroup: group.key },
		})

		return (
			<section
				ref={setNodeRef}
				className={cx(
					'panel',
					'work-group-panel',
					'work-status-lane',
					workStatusDropStatus === group.key &&
						'work-status-lane--drop-target',
				)}
				key={group.key}
			>
				<div className="panel-head">
					<div>
						<h2>{group.label}</h2>
						<p>{group.reservations.length} reservas</p>
					</div>
				</div>
				<div className="records compact-records">
					{group.reservations.length ? (
						group.reservations.map((reservation) => (
							<WorkStatusDraggableReservation
								key={`work-status-${group.key}-${reservation.id}`}
								reservation={reservation}
							/>
						))
					) : (
						<Empty
							text={`Sin trabajos en ${group.label.toLowerCase()}.`}
							hint="La columna queda lista para recibir trabajos cuando cambie el avance operativo."
						/>
					)}
				</div>
			</section>
		)
	}

	function renderWorkReservationsByStatusView() {
		return (
			<DndContext
				sensors={agendaSensors}
				collisionDetection={closestCenter}
				onDragStart={handleWorkStatusDragStart}
				onDragOver={handleWorkStatusDragOver}
				onDragEnd={handleWorkStatusDragEnd}
				onDragCancel={handleWorkStatusDragCancel}
			>
				<div className="grid work-groups work-status-groups">
					{workStatusGroups.map((group) => (
						<WorkStatusDroppableLane group={group} key={group.key} />
					))}
				</div>
				<DragOverlay>
					{renderAgendaDragOverlay(activeWorkStatusRow, {
						statusMode: 'work-order',
					})}
				</DragOverlay>
			</DndContext>
		)
	}

	function renderWorkReservationsByEntryDateView() {
		const hasContent =
			workEntryDateGroups.length || workFreeQuotesWithoutEntryDate.length
		if (!hasContent) {
			return (
				<section className="panel">
					<Empty
						text="Sin reservas o cotizaciones para este filtro."
						hint="Crea una reserva o cambia el tipo de servicio para ver trabajos por fecha de ingreso."
						action={
							<button
								type="button"
								className="primary"
								onClick={() => openQuickReservation(selectedDay)}
							>
								<Plus size={16} />
								Crear reserva
							</button>
						}
					/>
				</section>
			)
		}

		return (
			<div className="grid work-groups work-groups--entry-date">
				{workEntryDateGroups.map((group) => (
					<section className="panel work-group-panel" key={group.key}>
						<div className="panel-head">
							<div>
								<h2>{formatDateLabel(group.entryDate)}</h2>
								<p>{group.reservations.length} reservas</p>
							</div>
						</div>
						<div className="records compact-records">
							{group.reservations.map((reservation) =>
								renderWorkReservationListCard(reservation),
							)}
						</div>
					</section>
				))}
				{workFreeQuotesWithoutEntryDate.length ? (
					<section
						className="panel work-group-panel"
						key="without-entry-date"
					>
						<div className="panel-head">
							<div>
								<h2>Sin fecha de ingreso</h2>
								<p>{workFreeQuotesWithoutEntryDate.length} cotizaciones libres</p>
							</div>
						</div>
						<div className="records compact-records">
							{workFreeQuotesWithoutEntryDate.map((quote) =>
								renderWorkFreeQuoteCard(quote),
							)}
						</div>
					</section>
				) : null}
			</div>
		)
	}

	function renderAgendaReservationCard(
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
		options: { statusMode?: 'reservation' | 'work-order' } = {},
	) {
		const showWork = reservationShowsWork(reservation, workOrder)
		const rangeLabel = reservationRangeLabel(reservation)
		const serviceLines = reservationAgendaServices(reservation)
		const vehicleModel = reservationVehicleModel(reservation)
		const workOrderForDetail = workOrder
			? { ...workOrder, _agenda_day: row.day }
			: workOrder
		const workStatusValue = String(
			workStatusForReservation(reservation, workOrderByReservation) ??
				reservation.status ??
				'',
		)
		const reservationStatusValue = String(reservation.status ?? '')
		const actions = buildAgendaReservationActions({
			balanceDue: showWork ? workOrder?.balance_due : undefined,
			canCharge: Boolean(showWork && workOrder && canViewEconomy),
			reservationStatus: reservation.status,
			workOrderStatus: showWork ? workOrder?.status : undefined,
		})
		const quickActions = agendaReservationQuickActions(
			reservation,
			workOrder,
			row,
			actions,
		)

		return (
			<AgendaReservationCard
				actions={actions}
				detailProps={{
					...detailRecordProps(
						'Reserva',
						showWork
							? { ...reservation, work_order: workOrderForDetail }
							: reservation,
					),
					...quickActionTargetProps('Acciones de agenda', quickActions),
				}}
				phase={row.phase}
				phaseLabel={agendaPhaseLabels[row.phase]}
				quickActionsTrigger={renderQuickActionsTrigger(
					'Acciones de agenda',
					quickActions,
					'Acciones rapidas de agenda',
				)}
				rangeLabel={rangeLabel}
				reservation={reservation}
				reservationStatusLabel={
					reservationLabels[reservationStatusValue] ?? reservationStatusValue
				}
				reservationStatusValue={reservationStatusValue}
				serviceLines={serviceLines}
				statusMode={options.statusMode}
				title={reservationCustomerTitle(reservation)}
				vehicleModel={vehicleModel}
				workDebt={
					showWork ? renderAgendaWorkDebt(workOrder as AnyRecord) : null
				}
				workStatusLabels={orderLabels}
				workStatusValue={workStatusValue}
				onAction={(action) =>
					runAgendaReservationAction(
						action,
						reservation,
						showWork ? (workOrder as AnyRecord) : null,
						row,
					)
				}
			/>
		)
	}

	function AgendaDraggableRecord({
		row,
		children,
		className,
		style,
		interactive = true,
		snapshotKey = 'active',
	}: {
		row: AgendaOperationalRow
		children: ReactNode
		className?: string
		style?: CSSProperties
		interactive?: boolean
		snapshotKey?: string
	}) {
		const reservationId = String(row.reservation?.id ?? '')
		const canDrag = interactive && row.phase === 'entry'
		const { listeners, setNodeRef, isDragging } = useDraggable({
			id: interactive ? row.key : `${snapshotKey}:drag:${row.key}`,
			data: {
				reservationId,
				day: String(row.reservation?.day ?? row.day),
			},
			disabled:
				!interactive || !reservationId || !canDrag || Boolean(agendaMovePendingId),
		})

		return (
			<MotionFlashSurface
				ref={setNodeRef}
				{...listeners}
				className={recordClass(
					row.workOrder ? 'workorder' : 'reservation',
					row.workOrder?.id ?? row.reservation?.id,
					cx(
						'compact',
						agendaCardClass(row),
						className,
						flashClass(agendaCardFlashKey(row.key)),
						'agenda-operational-card--draggable',
						!canDrag && 'agenda-operational-card--locked',
						isDragging && 'agenda-operational-card--dragging',
						agendaMovePendingId === reservationId &&
							'agenda-operational-card--moving',
					),
				)}
				style={style}
			>
				<div className="agenda-card-stack">{children}</div>
			</MotionFlashSurface>
		)
	}

	function AgendaDroppableDayLane({
		day,
		column,
		interactive,
		laneEndRow,
		snapshotKey,
	}: {
		day: string
		column: number
		interactive: boolean
		laneEndRow: number
		snapshotKey: string
	}) {
		const { setNodeRef } = useDroppable({
			id: interactive ? day : `${snapshotKey}:lane:${day}`,
			data: { day },
			disabled: !interactive,
		})
		const isToday = day === currentDay

		return (
			<div
				ref={setNodeRef}
				className={cx(
					'day-row',
					'agenda-day-lane',
					isToday && 'day-row--today',
					interactive && agendaDropDay === day && 'day-row--drop-target',
				)}
				style={agendaLaneStyle(column, laneEndRow)}
			/>
		)
	}

	function AgendaDayHeader({
		day,
		column,
		count,
		hiddenDuringEnter = false,
		interactive,
	}: {
		day: string
		column: number
		count: number
		hiddenDuringEnter?: boolean
		interactive: boolean
	}) {
		const isToday = day === currentDay
		const isSelected = selectedDay === day
		const fullDateLabel = formatFullDateLabel(day)

		return (
			<button
				type="button"
				className={cx(
					'agenda-day-head',
					isToday && 'agenda-day-head--today',
					isSelected && 'agenda-day-head--active',
					hiddenDuringEnter && 'agenda-entering-overlap-hidden',
				)}
				style={agendaColumnStyle(column)}
				aria-current={isToday ? 'date' : undefined}
				aria-disabled={!interactive}
				aria-label={`Crear reserva el ${fullDateLabel}`}
				title={`Crear reserva el ${fullDateLabel}`}
				onClick={interactive ? () => openQuickReservation(day, true) : undefined}
				tabIndex={interactive ? undefined : -1}
			>
				<span className="agenda-day-head-row">
					<span className="day-row-head agenda-day-select">
						<span className="day-row-date" aria-hidden="true">
							{formatDayName(day)} {formatDayLabel(day)}
							{isToday ? (
								<strong className="day-row-today-badge">Hoy</strong>
							) : null}
						</span>
						<span className="agenda-day-count">
							{count === 1 ? '1 movimiento' : `${count} movimientos`}
						</span>
					</span>
					<span className="agenda-day-add-button" aria-hidden="true">
						<Plus size={14} />
					</span>
				</span>
			</button>
		)
	}

	function renderAgendaDragOverlay(
		row: AgendaOperationalRow | null,
		options: { statusMode?: 'reservation' | 'work-order' } = {},
	) {
		if (!row?.reservation) return null
		const workOrder = row.workOrder
		const reservation = row.reservation
		const showWork = reservationShowsWork(reservation, workOrder)
		const showWorkStatus =
			options.statusMode === 'work-order' && Boolean(workOrder)
		const serviceLines = reservationAgendaServices(reservation)
		const vehicleModel = reservationVehicleModel(reservation)
		const workStatusValue = String(
			workStatusForReservation(reservation, workOrderByReservation) ??
				reservation.status ??
				'',
		)
		return (
			<div
				className={cx(
					'record',
					'compact',
					agendaCardClass(row),
					'agenda-operational-card--drag-overlay',
				)}
			>
				<div className="agenda-card-stack">
					<div className="agenda-entry-card agenda-entry-card--reservation">
						<div className="agenda-entry-head">
							<div className="agenda-entry-copy">
								<span className="agenda-entry-eyebrow">
									{showWorkStatus ? 'Trabajo' : 'Reserva'}
								</span>
								<div className="record-title">
									{reservationCustomerTitle(reservation)}
								</div>
								{serviceLines.length ? (
									<div className="agenda-service-stack" aria-label="Servicios">
										{serviceLines.map((service) => (
											<span className="agenda-service-name" key={service.key}>
												{service.name}
											</span>
										))}
									</div>
								) : null}
								{vehicleModel ? (
									<div className="agenda-vehicle-model">{vehicleModel}</div>
								) : null}
							</div>
							<StatusPill
								value={
									showWorkStatus
										? workStatusValue
										: reservation.status
								}
								labels={showWorkStatus ? orderLabels : reservationLabels}
							/>
						</div>
						{showWork ? renderAgendaWorkDebt(workOrder as AnyRecord) : null}
					</div>
				</div>
			</div>
		)
	}

	function renderQuoteCardContent(
		item: AnyRecord,
		options: { overlay?: boolean } = {},
	) {
		const code = quoteCode(item)
		const hasReservation = quoteHasReservation(item)
		const isDraft = quoteLaneStatus(item) === 'draft'
		return (
			<div className="record-head quote-card-head">
				<div className="quote-card-copy">
					<div className="record-title">
						Cotizacion {code} - {item.customer_name}
					</div>
					<div className="record-sub">
						{item.vehicle_label || 'Sin vehiculo'} - {money(item.total)}
					</div>
					{item.reservation_day ? (
						<div className="record-sub">
							Reserva tentativa: {item.reservation_day}
							{quoteTentativeTimeLabel(item.reservation_start_time)}
						</div>
					) : null}
					{item.items?.length ? (
						<div className="quote-card-services" aria-label="Servicios">
							{item.items.map((quoteItem: AnyRecord) => (
								<span
									className="quote-card-service-name"
									key={quoteItem.id ?? `${item.id}-${quoteItem.service}`}
								>
									{serviceDisplayName({
										service_icon: quoteItem.service_icon,
										service_name:
											quoteItem.service_name ?? quoteItem.description,
									})}
								</span>
							))}
						</div>
					) : null}
				</div>
				{options.overlay ? null : (
					<div className="record-actions quote-card-actions">
						{hasReservation ? (
							<button
								type="button"
								className="ghost quote-action-button quote-action-button--outline"
								aria-label="Ver reserva en agenda"
								onClick={() => openQuoteReservationInAgenda(item)}
							>
								<CalendarDays size={16} />
								Agenda
							</button>
						) : (
							<button
								type="button"
								className="ghost quote-action-button quote-action-button--outline"
								aria-label="Crear reserva desde cotizacion"
								onClick={() => createReservationFromQuote(item)}
							>
								<CalendarDays size={16} />
								Reserva
							</button>
						)}
						<button
							type="button"
							className="ghost quote-action-button quote-action-button--outline"
							aria-label="Bajar PDF"
							onClick={() => downloadQuotePdf(item)}
						>
							<FileText size={16} />
							PDF
						</button>
						{isDraft ? (
							<button
								type="button"
								className="primary quote-action-button quote-action-button--filled"
								aria-label="Bajar PDF y marcar cotizacion como enviada"
								onClick={() => downloadQuotePdfAndMarkSent(item)}
							>
								<FileText size={16} />
								Enviar
							</button>
						) : null}
					</div>
				)}
			</div>
		)
	}

	function QuoteDraggableRecord({ item }: { item: AnyRecord }) {
		const quoteId = String(item.id ?? '')
		const laneStatus = quoteLaneStatus(item)
		const canDrag = laneStatus === 'draft'
		const quickActions = quoteQuickActions(item)
		const { listeners, setNodeRef, isDragging } = useDraggable({
			id: `quote:${quoteId}`,
			data: {
				quoteId,
				status: laneStatus,
			},
			disabled: !quoteId || !canDrag || Boolean(quoteMovePendingId),
		})

		return (
			<MotionFlashSurface
				ref={setNodeRef}
				{...listeners}
				className={recordClass(
					'quote',
					item.id,
					cx(
						'quote-board-card',
						'quote-board-card--draggable',
						!canDrag && 'quote-board-card--locked',
						isDragging && 'quote-board-card--dragging',
						quoteMovePendingId === quoteId && 'quote-board-card--moving',
					),
				)}
				{...detailRecordProps('Cotizacion', item)}
				{...quickActionTargetProps('Acciones de cotizacion', quickActions)}
			>
				{renderQuickActionsTrigger(
					'Acciones de cotizacion',
					quickActions,
					'Acciones rapidas de cotizacion',
				)}
				{renderQuoteCardContent(item)}
			</MotionFlashSurface>
		)
	}

	function QuoteDroppableLane({
		status,
		children,
	}: {
		status: 'draft' | 'sent'
		children: ReactNode
	}) {
		const { setNodeRef } = useDroppable({
			id: `quote-lane:${status}`,
			data: { status },
		})
		const count = status === 'draft' ? quoteBoard.draft.length : quoteBoard.sent.length

		return (
			<section
				ref={setNodeRef}
				className={cx(
					'quote-lane',
					`quote-lane--${status}`,
					quoteDropStatus === status && 'quote-lane--drop-target',
				)}
			>
				<div className="quote-lane-head">
					<div>
						<h3>{status === 'draft' ? 'Sin enviar' : 'Enviados'}</h3>
						<span>
							{status === 'draft'
								? 'Por fecha de creacion'
								: 'Por fecha de envio'}
						</span>
					</div>
					<strong>{count}</strong>
				</div>
				<div className="records quote-lane-records">{children}</div>
			</section>
		)
	}

	function renderQuoteDragOverlay(item: AnyRecord | null) {
		if (!item) return null
		return (
			<div className="record quote-board-card quote-board-card--drag-overlay">
				{renderQuoteCardContent(item, { overlay: true })}
			</div>
		)
	}

	function moveAgenda(offset: number) {
		const slideMotion = agendaSlideMotionFromOffset(offset, AGENDA_VISIBLE_DAYS)
		const nextStartDay = addDays(agendaStartDay, offset)
		setAgendaSlideMotion(slideMotion)
		setAgendaOverlapSuppressedStartDay(
			agendaSlideWindowsOverlap(slideMotion, AGENDA_VISIBLE_DAYS)
				? nextStartDay
				: null,
		)
		setAgendaStartDay(nextStartDay)
		setSelectedDay((current) => addDays(current, offset))
	}

	function goToToday() {
		const currentToday = toIsoDate(new Date())
		const currentDate = new Date(`${agendaStartDay}T00:00:00`).getTime()
		const targetDate = new Date(`${currentToday}T00:00:00`).getTime()
		const offsetDays = Math.round((targetDate - currentDate) / 86_400_000)
		if (offsetDays !== 0) {
			const slideMotion = agendaSlideMotionFromOffset(
				offsetDays,
				AGENDA_VISIBLE_DAYS,
			)
			setAgendaSlideMotion(slideMotion)
			setAgendaOverlapSuppressedStartDay(
				agendaSlideWindowsOverlap(slideMotion, AGENDA_VISIBLE_DAYS)
					? currentToday
					: null,
			)
		} else {
			setAgendaOverlapSuppressedStartDay(null)
		}
		setAgendaStartDay(currentToday)
		setSelectedDay(currentToday)
	}

	function openQuickReservation(day: string, prefillDay = false) {
		setSelectedDay(day)
		setQuickReservationPrefillDay(prefillDay)
		setReservationForm(blankReservationForm(prefillDay ? day : ''))
		setQuickReservationDay(day)
	}

	async function runAction<T>(
		action: () => Promise<T>,
		options?: RunActionOptions<T>,
	) {
		setError(null)
		try {
			const result = await action()
			await loadData({ force: true })
			const target =
				typeof options?.flashTarget === 'function'
					? options.flashTarget(result)
					: options?.flashTarget
			flash(target)
			const successTitle =
				resolveActionMessage(options?.successTitle, result) ??
				(target ? 'Cambio guardado' : null)
			if (successTitle) {
				const successDescription =
					resolveActionMessage(options?.successDescription, result) ??
					successToastDescription(successTitle)
				if (options?.undo) {
					registerUndoAction(
						result,
						options.undo,
						successTitle,
						successDescription,
					)
				} else {
					clearPendingUndo()
					showToast({
						tone: 'success',
						title: successTitle,
						description: successDescription,
					})
				}
			} else {
				clearPendingUndo()
			}
			return result
		} catch (err: any) {
			setError(formatApiError(err))
		}
	}

	function apiPathForRecord(kind: string, id: string | number | null | undefined) {
		if (id === null || id === undefined || id === '') return ''
		const detailPath = detailEndpoint(kind, id)
		if (detailPath) return detailPath
		const paths: Record<string, string> = {
			payment: `/payments/${id}/`,
			'stock-movement': `/stock-movements/${id}/`,
			'material-open-unit': `/material-open-units/${id}/`,
		}
		return paths[kind] ?? ''
	}

	function undoCreatedRecord<T extends AnyRecord = AnyRecord>(
		kind: string,
		options: {
			beforeDelete?: (result: T) => Promise<void>
		} = {},
	): UndoAction<T> {
		return {
			execute: async (result: T) => {
				const path = apiPathForRecord(kind, result?.id)
				if (!path) {
					throw new Error('No se pudo encontrar el registro para deshacer.')
				}
				if (options.beforeDelete) {
					await options.beforeDelete(result)
				}
				await apiFetch(path, { method: 'DELETE' })
			},
			successTitle: 'Creacion deshecha',
		}
	}

	function undoPatchRecord(
		path: string,
		payload: AnyRecord,
		successTitle = 'Cambio deshecho',
	): UndoAction<any> {
		return {
			execute: async () => {
				if (!path) {
					throw new Error('No se pudo encontrar el registro para deshacer.')
				}
				await apiFetch(path, {
					method: 'PATCH',
					body: JSON.stringify(payload),
				})
			},
			successTitle,
		}
	}

	function undoRestoreActiveRecord(kind: string, data: AnyRecord): UndoAction<any> {
		return undoPatchRecord(
			apiPathForRecord(kind, data?.id),
			{ is_active: true },
			'Registro restaurado',
		)
	}

	async function ensureQuoteFromReservation(item: AnyRecord) {
		return runAction(
			() =>
				apiFetch(`/reservations/${item.id}/quote/`, {
					method: 'POST',
				}),
			{
				flashTarget: (created: AnyRecord) => recordFlashKey('quote', created?.id),
				successTitle: entityFeedbackTitle('quote', 'created'),
			},
		)
	}

	async function createQuoteFromReservation(item: AnyRecord) {
		const createdQuote = await ensureQuoteFromReservation(item)
		if (createdQuote) {
			setActive('quotes')
			openDetailModal('Cotizacion', createdQuote)
		}
		return createdQuote
	}

	async function downloadQuotePdfFromReservation(item: AnyRecord) {
		const quote = await ensureQuoteFromReservation(item)
		if (quote) {
			await downloadQuotePdf(quote)
		}
		return quote
	}

	function downloadQuotePdf(item: AnyRecord) {
		return runAction(
			() =>
				downloadApiFile(
					`/quotes/${item.id}/pdf/`,
					`cotizacion-${item.public_code ?? item.id}.pdf`,
				),
			{ successTitle: 'PDF descargado' },
		)
	}

	function downloadQuotePdfAndMarkSent(item: AnyRecord) {
		return runAction(
			() =>
				downloadApiFile(
					`/quotes/${item.id}/pdf-mark-sent/`,
					`cotizacion-${item.public_code ?? item.id}.pdf`,
				),
			{
				flashTarget: recordFlashKey('quote', item.id),
				successTitle: 'PDF descargado y cotizacion enviada',
				undo: {
					execute: async () => {
						await apiFetch(`/quotes/${item.id}/`, {
							method: 'PATCH',
							body: JSON.stringify({
								status: item.status ?? 'draft',
							}),
						})
					},
					successTitle: 'Cotizacion restaurada',
				},
			},
		)
	}

	function releaseAgendaClickSuppression() {
		if (suppressAgendaClickTimeoutRef.current) {
			window.clearTimeout(suppressAgendaClickTimeoutRef.current)
		}
		suppressAgendaClickTimeoutRef.current = window.setTimeout(() => {
			suppressAgendaClickRef.current = false
			suppressAgendaClickTimeoutRef.current = null
		}, 0)
	}

	function releaseQuoteClickSuppression() {
		if (suppressQuoteClickTimeoutRef.current) {
			window.clearTimeout(suppressQuoteClickTimeoutRef.current)
		}
		suppressQuoteClickTimeoutRef.current = window.setTimeout(() => {
			suppressQuoteClickRef.current = false
			suppressQuoteClickTimeoutRef.current = null
		}, 0)
	}

	function resolveAgendaDropDay(value: unknown) {
		if (value === null || value === undefined) return null
		const day = String(value)
		return weekDays.includes(day) ? day : null
	}

	function resolveQuoteDropStatus(value: any): 'draft' | 'sent' | null {
		if (value === null || value === undefined) return null
		const raw = String(value)
		const status = raw.startsWith('quote-lane:')
			? raw.replace('quote-lane:', '')
			: raw
		return status === 'draft' || status === 'sent' ? status : null
	}

	function parseWorkStatusDropValue(value: any) {
		if (value === null || value === undefined) return null
		const raw = String(value)
		return raw.startsWith('work-status:')
			? raw.replace('work-status:', '')
			: raw
	}

	function resolveWorkStatusColumnKey(value: any) {
		const status = parseWorkStatusDropValue(value)
		if (!status) return null
		if (workStatusColumns.some((column) => column.key === status)) {
			return status
		}
		const column = workStatusColumnForStatus(status, workStatusColumns)
		if (column) return column.key
		return Object.prototype.hasOwnProperty.call(orderLabels, status)
			? status
			: null
	}

	function resolveWorkStatusDropTarget(over: any) {
		return resolveWorkStatusColumnKey(
			over?.data?.current?.statusGroup ??
				over?.data?.current?.status ??
				over?.id,
		)
	}

	function workStatusDropStatusForColumn(columnKey: string | null) {
		if (!columnKey) return null
		const column = workStatusColumns.find((item) => item.key === columnKey)
		if (column) return column.dropStatus ?? column.statuses[0] ?? null
		return Object.prototype.hasOwnProperty.call(orderLabels, columnKey)
			? columnKey
			: null
	}

	function updateReservationWorkOrder(
		reservation: AnyRecord,
		workOrder: AnyRecord,
	) {
		const status = String(workOrder?.status ?? reservation.status ?? '')
		return {
			...reservation,
			...(status
				? { status, status_label: orderLabels[status] ?? status }
				: {}),
			work_order: workOrder,
		}
	}

	function upsertWorkOrderRecord(records: AnyRecord[], workOrder: AnyRecord) {
		const workOrderId = String(workOrder?.id ?? '')
		if (!workOrderId) return records
		const exists = records.some((item) => String(item.id) === workOrderId)
		if (!exists) return [workOrder, ...records]
		return records.map((item) =>
			String(item.id) === workOrderId ? workOrder : item,
		)
	}

	function handleAgendaDragStart(event: DragStartEvent) {
		const reservationId = String(
			event.active.data.current?.reservationId ?? '',
		)
		if (!reservationId) return
		setError(null)
		suppressAgendaClickRef.current = true
		setActiveAgendaReservationId(reservationId)
	}

	function handleAgendaDragCancel() {
		setActiveAgendaReservationId(null)
		setAgendaDropDay(null)
		releaseAgendaClickSuppression()
	}

	function handleAgendaDragOver(event: any) {
		setAgendaDropDay(resolveAgendaDropDay(event.over?.id))
	}

	async function handleAgendaDragEnd(event: DragEndEvent) {
		const reservationId = String(
			event.active.data.current?.reservationId ?? activeAgendaReservationId ?? '',
		)
		const originDay = String(event.active.data.current?.day ?? '')
		const nextDay = resolveAgendaDropDay(event.over?.id)
		const previousReservations = reservations
		const activeReservation = reservations.find(
			(item) => String(item.id) === reservationId,
		)
		const exitOffset = reservationExitOffset(activeReservation)
		const nextExitDay =
			nextDay && exitOffset !== null ? addDays(nextDay, exitOffset) : undefined

		setActiveAgendaReservationId(null)
		setAgendaDropDay(null)
		releaseAgendaClickSuppression()

		if (
			!reservationId ||
			!originDay ||
			!nextDay ||
			!activeReservation ||
			nextDay === originDay ||
			agendaMovePendingId
		) {
			return
		}

		setAgendaMovePendingId(reservationId)
		setReservations((current) =>
			moveReservationToDay(current, reservationId, nextDay, nextExitDay),
		)

		try {
			const payload: AnyRecord = { day: nextDay }
			if (nextExitDay !== undefined) {
				payload.exit_day = nextExitDay
			}
			const saved = await apiFetch<AnyRecord>(`/reservations/${reservationId}/`, {
				method: 'PATCH',
				body: JSON.stringify(payload),
			})
			setReservations((current) => replaceReservationRecord(current, saved))
			flash(agendaCardFlashKey(`reservation:${reservationId}`))
			registerUndoAction(
				saved,
				undoPatchRecord(
					`/reservations/${reservationId}/`,
					{
						day: originDay,
						exit_day: activeReservation.exit_day || null,
					},
					'Movimiento deshecho',
				),
				'Reserva movida',
				successToastDescription('Reserva movida'),
			)
		} catch (err: any) {
			setReservations(previousReservations)
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo mover la reserva',
					fallbackDescription:
						'La reserva volvio a su dia anterior. Revisa los datos e intenta nuevamente.',
				}),
			)
		} finally {
			setAgendaMovePendingId(null)
		}
	}

	function handleWorkStatusDragStart(event: DragStartEvent) {
		const reservationId = String(
			event.active.data.current?.reservationId ?? '',
		)
		if (!reservationId) return
		setError(null)
		suppressAgendaClickRef.current = true
		setActiveWorkStatusReservationId(reservationId)
	}

	function handleWorkStatusDragCancel() {
		setActiveWorkStatusReservationId(null)
		setWorkStatusDropStatus(null)
		releaseAgendaClickSuppression()
	}

	function handleWorkStatusDragOver(event: any) {
		setWorkStatusDropStatus(resolveWorkStatusDropTarget(event.over))
	}

	async function handleWorkStatusDragEnd(event: DragEndEvent) {
		const reservationId = String(
			event.active.data.current?.reservationId ??
				activeWorkStatusReservationId ??
				'',
		)
		const activeReservation = reservations.find(
			(item) => String(item.id) === reservationId,
		)
		const workOrder = activeReservation
			? reservationWorkOrder(activeReservation)
			: null
		const workOrderId = String(
			event.active.data.current?.workOrderId ?? workOrder?.id ?? '',
		)
		const canMoveStatus = activeReservation
			? reservationCanMoveWorkStatus(activeReservation, workOrderByReservation)
			: false
		const originColumn = resolveWorkStatusColumnKey(
			event.active.data.current?.statusGroup ??
				event.active.data.current?.status ??
				workOrder?.status,
		)
		const targetColumn = resolveWorkStatusDropTarget(event.over)
		const nextStatus = workStatusDropStatusForColumn(targetColumn)
		const previousReservations = reservations
		const previousWorkOrders = workOrders
		const previousStatus = workOrder?.status ?? activeReservation?.status

		setActiveWorkStatusReservationId(null)
		setWorkStatusDropStatus(null)
		releaseAgendaClickSuppression()

		if (
			!reservationId ||
			!activeReservation ||
			!canMoveStatus ||
			!workOrderId ||
			!originColumn ||
			!targetColumn ||
			!nextStatus ||
			targetColumn === originColumn ||
			workStatusMovePendingId
		) {
			return
		}

		const optimisticWorkOrder = {
			...workOrder,
			id: workOrderId,
			status: nextStatus,
			status_label: orderLabels[nextStatus] ?? nextStatus,
		}

		setWorkStatusMovePendingId(reservationId)
		setWorkOrders((current) =>
			current.map((item) =>
				String(item.id) === workOrderId ? optimisticWorkOrder : item,
			),
		)
		setReservations((current) =>
			current.map((item) =>
				String(item.id) === reservationId
					? updateReservationWorkOrder(item, optimisticWorkOrder)
					: item,
			),
		)

		try {
			const saved = await apiFetch<AnyRecord>(
				`/work-orders/${workOrderId}/status/`,
				{
					method: 'POST',
					body: JSON.stringify({
						status: nextStatus,
					}),
				},
			)
			const savedWorkOrder = saved ?? optimisticWorkOrder
			setWorkOrders((current) =>
				upsertWorkOrderRecord(current, savedWorkOrder as AnyRecord),
			)
			setReservations((current) =>
				current.map((item) =>
					String(item.id) === reservationId
						? updateReservationWorkOrder(
								item,
								savedWorkOrder as AnyRecord,
							)
						: item,
				),
			)
			flash(agendaCardFlashKey(`reservation:${reservationId}`))
			registerUndoAction(
				savedWorkOrder,
				{
					execute: async () => {
						await apiFetch(`/work-orders/${workOrderId}/status/`, {
							method: 'POST',
							body: JSON.stringify({
								status: previousStatus,
							}),
						})
					},
					successTitle: 'Estado anterior restaurado',
				},
				'Estado actualizado',
				successToastDescription('Estado actualizado'),
			)
		} catch (err: any) {
			setReservations(previousReservations)
			setWorkOrders(previousWorkOrders)
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo cambiar el estado',
					fallbackDescription:
						'La reserva volvio a su estado anterior. Revisa los datos e intenta nuevamente.',
				}),
			)
		} finally {
			setWorkStatusMovePendingId(null)
		}
	}

	function handleQuoteDragStart(event: DragStartEvent) {
		const quoteId = String(event.active.data.current?.quoteId ?? '')
		if (!quoteId) return
		setError(null)
		suppressQuoteClickRef.current = true
		setActiveQuoteDragId(quoteId)
	}

	function handleQuoteDragCancel() {
		setActiveQuoteDragId(null)
		setQuoteDropStatus(null)
		releaseQuoteClickSuppression()
	}

	function handleQuoteDragOver(event: any) {
		setQuoteDropStatus(resolveQuoteDropStatus(event.over?.id))
	}

	async function handleQuoteDragEnd(event: DragEndEvent) {
		const quoteId = String(
			event.active.data.current?.quoteId ?? activeQuoteDragId ?? '',
		)
		const originStatus = resolveQuoteDropStatus(
			event.active.data.current?.status,
		)
		const nextStatus = resolveQuoteDropStatus(event.over?.id)
		const previousQuotes = quotes
		const activeQuote = quotes.find((item) => String(item.id) === quoteId)

		setActiveQuoteDragId(null)
		setQuoteDropStatus(null)
		releaseQuoteClickSuppression()

		if (
			!quoteId ||
			!activeQuote ||
			originStatus !== 'draft' ||
			nextStatus !== 'sent' ||
			quoteMovePendingId
		) {
			return
		}

		setQuoteMovePendingId(quoteId)
		setQuotes((current) =>
			current.map((item) =>
				String(item.id) === quoteId
					? {
							...item,
							status: 'sent',
							status_label: quoteStatusLabels.sent,
							sent_at: item.sent_at ?? new Date().toISOString(),
						}
					: item,
			),
		)

		try {
			await downloadApiFile(
				`/quotes/${quoteId}/pdf-mark-sent/`,
				`cotizacion-${activeQuote.public_code ?? activeQuote.id}.pdf`,
			)
			await loadData({ force: true })
			flash(recordFlashKey('quote', quoteId))
			registerUndoAction(
				activeQuote,
				undoPatchRecord(
					`/quotes/${quoteId}/`,
					{ status: originStatus },
					'Cotizacion restaurada',
				),
				'PDF descargado y cotizacion enviada',
				successToastDescription('PDF descargado y cotizacion enviada'),
			)
		} catch (err: any) {
			setQuotes(previousQuotes)
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo enviar la cotizacion',
					fallbackDescription:
						'La cotizacion volvio a Sin enviar. Revisa la descarga e intenta nuevamente.',
				}),
			)
		} finally {
			setQuoteMovePendingId(null)
		}
	}

	function openQuoteReservationInAgenda(item: AnyRecord) {
		const reservationId = quoteReservationId(item)
		const reservation = reservations.find(
			(record) => String(record.id) === reservationId,
		)
		const targetDay = String(
			reservation?.day ?? item.reservation_day ?? '',
		)
		if (!reservationId || !targetDay) {
			showToast({
				tone: 'error',
				title: 'Reserva no disponible',
				description:
					'No encontramos una fecha de agenda para esta cotizacion.',
			})
			return
		}

		const currentDate = new Date(`${agendaStartDay}T00:00:00`).getTime()
		const targetDate = new Date(`${targetDay}T00:00:00`).getTime()
		const offsetDays = Math.round((targetDate - currentDate) / 86_400_000)
		if (Number.isFinite(offsetDays) && offsetDays !== 0) {
			setAgendaSlideMotion(
				agendaSlideMotionFromOffset(offsetDays, AGENDA_VISIBLE_DAYS),
			)
		}
		setAgendaStartDay(targetDay)
		setSelectedDay(targetDay)
		setActive('agenda')
		flash(agendaCardFlashKey(`reservation:${reservationId}`))
		showToast({
			tone: 'success',
			title: 'Reserva ubicada en agenda',
			description: successToastDescription('Reserva ubicada en agenda'),
		})
	}

	async function logout() {
		try {
			await apiFetch('/auth/logout/', { method: 'POST' })
		} catch {
			// Token cleanup must happen even if the server already discarded it.
		}
		setProfileModalOpen(false)
		clearStoredToken()
		setToken(null)
		setCurrentUser(null)
	}

	async function handleProfileLogout() {
		closeProfileModal()
		await logout()
	}

	function handleLogin(nextToken: string, user: AnyRecord) {
		setCurrentUser(null)
		setToken(nextToken)
		if (!user.can_view_economy && sectionRequiresEmployer(active)) {
			navigationHistoryModeRef.current = 'replaceState'
			setActive('agenda')
		}
	}

	function restoreSidebarMobileFocus() {
		window.requestAnimationFrame(() => {
			if (focusElementIfAvailable(sidebarReturnFocusRef.current)) return
			sidebarMobileToggleRef.current?.focus()
		})
	}

	function closeSidebarMobileMenu(
		options: { restoreFocus?: boolean } = { restoreFocus: true },
	) {
		setSidebarMobileOpen(false)
		if (options.restoreFocus !== false) {
			restoreSidebarMobileFocus()
		}
	}

	function toggleSidebarMobileMenu() {
		if (sidebarMobileOpen) {
			closeSidebarMobileMenu()
			return
		}
		sidebarReturnFocusRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: sidebarMobileToggleRef.current
		setSidebarCollapsed(false)
		setSidebarMobileOpen(true)
	}

	function handleSectionChange(key: string) {
		setActive(key as Section)
		setSidebarMobileOpen(false)
	}

	const pendingPublicRequests = publicRequests.filter(
		(item) => item.status === 'pending',
	)
	const managedPublicRequests = publicRequests.filter(
		(item) => item.status !== 'pending',
	)
	const pendingPublicRequestsCount = pendingPublicRequests.length
	const activeEmployeeCount = employees.filter(
		(item) => item.is_active !== false,
	).length
	const inactiveEmployeeCount = employees.length - activeEmployeeCount
	const title = sectionMeta[displayedActive]
	const navItems: SidebarNavItem[] = (Object.keys(sectionMeta) as Section[])
		.filter((key) => canViewEconomy || !sectionRequiresEmployer(key))
		.map((key) => ({
			key,
			label: sectionMeta[key].label,
			icon: sectionMeta[key].icon,
			badge:
				key === 'notifications' && pendingPublicRequestsCount
					? pendingPublicRequestsCount
					: undefined,
		}))
	const customerVehicles = vehicles.filter(
		(vehicle) =>
			String(vehicle.customer) === String(reservationForm.customer),
	)
	const quoteVehicleOptions = quoteForm.customer
		? vehicles.filter(
				(vehicle) =>
					String(vehicle.customer) === String(quoteForm.customer),
			)
		: vehicles
	const customerOptions = customers.map((item) => ({
		value: String(item.id),
		label: item.name,
		meta: joinDisplayParts([item.phone, item.email]),
	}))
	const customerFilterOptions = [
		{ value: 'all', label: 'Todos' },
		{ value: 'with_reservation', label: 'Con reserva' },
		{ value: 'birthday_soon', label: 'Cumple pronto' },
		{ value: 'no_upcoming', label: 'Sin proxima visita' },
		{ value: 'with_balance', label: 'Con saldo' },
	] as Array<{
		value: CustomerCardFilter
		label: string
	}>
	const visibleCustomerFilterOptions = customerFilterOptions.filter(
		(option) => canViewEconomy || option.value !== 'with_balance',
	)
	const vehicleOptions = vehicles.map((item) => ({
		value: String(item.id),
		label: item.label,
		meta: item.customer_name,
	}))
	const customerVehicleOptions = customerVehicles.map((item) => ({
		value: String(item.id),
		label: item.label,
		meta: item.customer_name,
	}))
	const serviceOptions = services.map((item) => ({
		value: String(item.id),
		label: serviceDisplayName(item),
		meta: canViewEconomy
			? joinDisplayParts([
					serviceTypeLabels[item.service_type] ?? item.service_type,
					money(item.base_price),
				])
			: serviceTypeLabels[item.service_type] ?? item.service_type,
	}))
	const reservationOptions = reservations
		.filter((item) => item.status !== 'canceled')
		.map((item) => ({
			value: String(item.id),
			label: (() => {
				const startTime = reservationStartTimeLabel(item, 'Sin hora')
				return startTime
					? `${item.day} ${startTime} - ${item.customer_name}`
					: `${item.day} - ${item.customer_name}`
			})(),
			meta: `${item.vehicle_label} - ${serviceDisplayName(item)} - ${reservationLabels[item.status] ?? item.status}`,
		}))
	const workOrderOptions = workOrders.map((item) => ({
		value: String(item.id),
		label: `${item.customer_name} - ${item.vehicle_label}`,
		meta: canViewEconomy
			? `${serviceDisplayName(item)} - deuda ${money(item.balance_due)}`
			: serviceDisplayName(item),
	}))
	const allDebtOptions = debts.map((item) => ({
		value: String(item.id),
		label: item.concept,
		meta: `${debtStatusLabels[item.status] ?? item.status} - saldo ${money(item.balance_due)}`,
	}))
	const debtOptions = allDebtOptions.filter((option) => {
		const debt = debts.find((item) => String(item.id) === option.value)
		return numberValue(debt?.balance_due) > 0
	})
	const materialOptions = materials.map((item) => ({
		value: String(item.id),
		label: item.name,
		meta: `stock ${item.stock_quantity} ${item.unit} - costo ${money(item.estimated_unit_cost)}`,
	}))
	const supplierOptions = suppliers.map((item) => ({
		value: String(item.id),
		label: item.name,
		meta: [item.legal_name, item.category, item.contact_name, item.phone, item.email]
			.filter(Boolean)
			.join(' - '),
	}))
	const openMaterialUnitOptions = materialOpenUnits
		.filter((item) => item.status === 'open')
		.map((item) => ({
			value: String(item.id),
			label: item.material_name ?? 'Unidad abierta',
			meta: `abierta ${item.opened_at} - ${item.consumptions_count ?? 0} usos`,
		}))
	const quoteVehicleSearchOptions = quoteVehicleOptions.map((item) => ({
		value: String(item.id),
		label: item.label,
		meta: item.customer_name,
	}))
	const quoteReservationVehicleOptions = reservationForQuote
		? vehicles
				.filter(
					(vehicle) =>
						String(vehicle.customer) ===
						String(reservationForQuote.customer),
				)
				.map((item) => ({
					value: String(item.id),
					label: item.label,
					meta: item.customer_name,
				}))
		: vehicleOptions
	const customerNameValues = uniqueValues(customers, 'name')
	const customerPhoneValues = uniqueValues(customers, 'phone')
	const customerEmailValues = uniqueValues(customers, 'email')
	const vehiclePlateValues = uniqueValues(vehicles, 'license_plate')
	const vehicleBrandValues = uniqueValues(vehicles, 'brand')
	const vehicleColorValues = uniqueValues(vehicles, 'color')
	const vehicleBrandSelectOptions = selectOptionsFromValues(
		vehicleBrandOptions(vehicleBrandValues),
		vehicleForm.brand,
	)
	const vehicleModelSelectOptions = selectOptionsFromValues(
		vehicleModelOptionsForBrand(vehicleForm.brand, vehicles, [
			vehicleForm.model,
		]),
		vehicleForm.model,
	)
	const serviceNameValues = uniqueValues(services, 'name')
	const materialNameValues = uniqueValues(materials, 'name')
	const materialUnitValues = uniqueValues(materials, 'unit')
	const materialCategoryValues = uniqueValues(materials, 'category')
	const supplierNameValues = uniqueValues(suppliers, 'name')
	const supplierLegalNameValues = uniqueValues(suppliers, 'legal_name')
	const supplierCategoryValues = uniqueValues(suppliers, 'category')
	const supplierTaxConditionValues = uniqueValues(suppliers, 'tax_condition')
	const debtConceptValues = uniqueValues(debts, 'concept')
	const debtCreditorValues = mergeStringValues(
		uniqueValues(debts, 'creditor'),
		supplierNameValues,
		supplierLegalNameValues,
	)
	const toolNameValues = uniqueValues(tools, 'name')
	const cashMovements = cash.movements ?? []
	const historicalIncomeCategoryValues = uniqueValues(
		cashMovements.filter(
			(item: AnyRecord) => item.movement_type === 'income',
		),
		'category',
	)
	const historicalExpenseCategoryValues = uniqueValues(
		cashMovements.filter(
			(item: AnyRecord) => item.movement_type === 'expense',
		),
		'category',
	)
	const expenseCategoryTree = normalizeExpenseCategoryTree(
		businessForm.expense_category_tree ??
			businessProfile?.expense_category_tree ??
			cash.expense_category_tree ??
			DEFAULT_EXPENSE_CATEGORY_TREE,
	)
	const incomeCategoryTree = normalizeIncomeCategoryTree(
		businessForm.income_category_tree ??
			businessProfile?.income_category_tree ??
			cash.income_category_tree ??
			DEFAULT_INCOME_CATEGORY_TREE,
	)
	const cashIncomeCategoryValues = mergeStringValues(
		Object.keys(incomeCategoryTree),
		CASH_CATEGORY_FALLBACKS.income,
		cash.category_options?.income,
		historicalIncomeCategoryValues,
	)
	const cashExpenseCategoryValues = mergeStringValues(
		Object.keys(expenseCategoryTree),
		CASH_CATEGORY_FALLBACKS.expense,
		cash.category_options?.expense,
		historicalExpenseCategoryValues,
	)
	const cashCategoryValues = mergeStringValues(
		cashIncomeCategoryValues,
		cashExpenseCategoryValues,
		uniqueValues(cashMovements, 'category'),
	)
	const expenseClassificationPairs = useMemo(
		() =>
			expenseCategoryPairs(expenseCategoryTree).sort(
				compareExpenseClassificationPair,
			),
		[expenseCategoryTree],
	)
	const incomeClassificationPairs = useMemo(
		() =>
			incomeCategoryPairs(incomeCategoryTree).sort(
				compareExpenseClassificationPair,
			),
		[incomeCategoryTree],
	)
	const cashClassificationPairs = useMemo(
		() => [
			...incomeClassificationPairs.map((item) => ({
				...item,
				movement_type: 'income',
			})),
			...expenseClassificationPairs.map((item) => ({
				...item,
				movement_type: 'expense',
			})),
		],
		[incomeClassificationPairs, expenseClassificationPairs],
	)
	const incomeCategorySelectOptions = selectOptionsFromValues(
		cashIncomeCategoryValues,
		movementForm.category,
	)
	const expenseCategorySelectOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		movementForm.category,
	)
	const debtExpenseCategorySelectOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		debtForm.expense_category,
	)
	const settingsExpenseCategoryOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		expenseClassificationForm.category,
	)
	const settingsIncomeCategoryOptions = selectOptionsFromValues(
		cashIncomeCategoryValues,
		expenseClassificationForm.category,
	)
	const settingsClassificationCategoryOptions =
		expenseClassificationForm.movement_type === 'income'
			? settingsIncomeCategoryOptions
			: settingsExpenseCategoryOptions
	const selectedMovementSubcategoryValues = mergeStringValues(
		movementForm.movement_type === 'income'
			? incomeSubcategoriesForCategory(
					incomeCategoryTree,
					movementForm.category,
				)
			: expenseSubcategoriesForCategory(
					expenseCategoryTree,
					movementForm.category,
				),
		uniqueValues(
			cashMovements.filter(
				(item: AnyRecord) =>
					String(item.category ?? '') === String(movementForm.category ?? ''),
			),
			'subcategory',
		),
	)
	const movementSubcategorySelectOptions = selectOptionsFromValues(
		selectedMovementSubcategoryValues,
		movementForm.subcategory,
	)
	const debtExpenseSubcategoryValues = mergeStringValues(
		expenseSubcategoriesForCategory(
			expenseCategoryTree,
			debtForm.expense_category,
		),
		uniqueValues(
			debts.filter(
				(item: AnyRecord) =>
					String(item.expense_category ?? '') ===
					String(debtForm.expense_category ?? ''),
			),
			'expense_subcategory',
		),
	)
	const debtExpenseSubcategorySelectOptions = selectOptionsFromValues(
		debtExpenseSubcategoryValues,
		debtForm.expense_subcategory,
	)
	const settingsExpenseSubcategoryOptions = selectOptionsFromValues(
		expenseSubcategoriesForCategory(
			expenseCategoryTree,
			expenseClassificationForm.category,
		),
		expenseClassificationForm.subcategory,
	)
	const settingsIncomeSubcategoryOptions = selectOptionsFromValues(
		incomeSubcategoriesForCategory(
			incomeCategoryTree,
			expenseClassificationForm.category,
		),
		expenseClassificationForm.subcategory,
	)
	const settingsClassificationSubcategoryOptions =
		expenseClassificationForm.movement_type === 'income'
			? settingsIncomeSubcategoryOptions
			: settingsExpenseSubcategoryOptions
	const cashSubcategoryValues = mergeStringValues(
		Object.values(incomeCategoryTree).flat(),
		Object.values(expenseCategoryTree).flat(),
		uniqueValues(cashMovements, 'subcategory'),
		uniqueValues(debts, 'expense_subcategory'),
	)
	const economicTotals = cash.economic_totals ?? {
		income: cash.income,
		expense: cash.expense,
		balance: cash.balance,
	}
	const cashflowTotals = cash.cashflow_totals ?? economicTotals
	const cashEntries = cash.entries ?? cashMovements
	const cashFilterCategoryValues = mergeStringValues(
		cashCategoryValues,
		uniqueValues(cashEntries, 'category'),
	)
	const cashFilterSubcategoryValues = mergeStringValues(
		cashFilters.category
			? mergeStringValues(
					incomeSubcategoriesForCategory(
						incomeCategoryTree,
						cashFilters.category,
					),
					expenseSubcategoriesForCategory(
						expenseCategoryTree,
						cashFilters.category,
					),
				)
			: cashSubcategoryValues,
		uniqueValues(
			cashEntries.filter(
				(item: AnyRecord) =>
					!cashFilters.category ||
					String(item.category ?? '') === cashFilters.category,
			),
			'subcategory',
		),
	)
	const cashSourceKindValues = mergeStringValues(
		uniqueValues(cashEntries, 'source_kind'),
		cashFilters.sourceKind ? [cashFilters.sourceKind] : undefined,
	)
	const cashSourceKindOptions = cashSourceKindValues.map((value) => ({
		value,
		label: cashSourceKindLabel(value),
	}))
	const cashFlowSummary = useMemo(
		() => buildCashFlowSummary(cashEntries, cashSummaryMode),
		[cashEntries, cashSummaryMode],
	)
	const filteredCashEntries = useMemo(
		() =>
			cashEntries.filter((item: AnyRecord) =>
				cashEntryMatchesFilters(item, cashFilters),
			),
		[cashEntries, cashFilters],
	)

	if (!token) {
		return <LoginScreen onLogin={handleLogin} />
	}

	if (!currentUser) {
		return (
			<main className="login-screen">
				<div className="login-card">
					<AppBrand
						className="login-brand"
						subtitle="Cargando acceso..."
						themeMode={themeMode}
						titleAs="h1"
					/>
				</div>
			</main>
		)
	}

	const cashFiltersActive = hasCashFilters(cashFilters)
	const debtFiltersActive = Boolean(search.trim()) || hasDebtFilters(debtFilters)
	const settingsSectionLabel =
		settingsSectionOptions.find((option) => option.value === settingsSection)
			?.label ?? 'Configuracion'
	const cashIsClosed = cash.is_closed === true
	const selectedPurchaseMaterial = materials.find(
		(item) => String(item.id) === String(purchaseForm.material),
	)
	const selectedConsumptionMaterial = materials.find(
		(item) => String(item.id) === String(consumptionForm.material),
	)
	const selectedOpenUnit = materialOpenUnits.find(
		(item) => String(item.id) === String(consumptionForm.open_unit),
	)
	const selectedOpenUnitFormMaterial = materials.find(
		(item) => String(item.id) === String(openUnitForm.material),
	)
	const stockMovementRequiresSupplier =
		stockMovementForm.movement_type === 'purchase'
	const stockMovementRequiresCustomer =
		stockMovementForm.movement_type === 'sale'
	const stockMovementRequiresReservation =
		stockMovementForm.movement_type === 'consumption'
	const stockMovementLines = stockMovementForm.lines ?? []
	const stockMovementTotal = stockMovementLines.reduce(
		(total: number, line: AnyRecord) =>
			total + numberValue(line.quantity) * numberValue(line.unit_price),
		0,
	)
	const selectedWorkOrderForPayment = workOrders.find(
		(item) => String(item.id) === String(paymentForm.work_order),
	)
	const selectedDebtForPayment = debts.find(
		(item) => String(item.id) === String(debtPaymentForm.debt),
	)
	const debtSummary = debts.reduce<DebtSummary>(
		(summary, debt) => ({
			original: summary.original + numberValue(debt.principal_amount),
			paid: summary.paid + numberValue(debt.total_paid),
			pending: summary.pending + numberValue(debt.balance_due),
			open: summary.open + (numberValue(debt.balance_due) > 0 ? 1 : 0),
		}),
		{ original: 0, paid: 0, pending: 0, open: 0 },
	)
	const cashLoadBlocked = Boolean(loadErrorNotice && !cashEntries.length)
	const debtLoadBlocked = Boolean(
		loadErrorNotice && !debts.length && !debtPayments.length,
	)

	function materialUsageRows(material: AnyRecord) {
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

	function materialOpenUnitRows(material: AnyRecord) {
		return materialOpenUnits.filter(
			(item) => String(item.material) === String(material.id),
		)
	}

	function workOrderMaterialUsageSummary(workOrder: AnyRecord) {
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

	function renderBirthdayBadge(customer: AnyRecord) {
		if (!customer?.birthday_label) return null
		return (
			<span
				className={cx(
					'birthday-badge',
					customer.has_birthday_alert ? 'birthday-badge--alert' : '',
				)}
			>
				{birthdayText(customer)}
			</span>
		)
	}

	function renderBirthdayAlerts() {
		const alerts = dashboard.birthday_alerts ?? []
		return (
			<Panel>
				<div className="panel-head">
					<h2>Cumpleanos proximos</h2>
					<span className="panel-kicker">
						{dashboard.birthday_alert_days ?? 3} dias
					</span>
				</div>
				<div className="records compact-records">
					{alerts.length ? (
						alerts.map((customer: AnyRecord) => (
							<MotionFlashSurface
								className={recordClass('customer', customer.id)}
								key={`birthday-${customer.id}`}
								{...detailRecordProps('Cliente', customer)}
							>
								<div className="record-head">
									<div>
										<div className="record-title">{customer.name}</div>
										<div className="record-sub">
											{customer.phone || 'Sin telefono'}
										</div>
										{renderBirthdayBadge(customer)}
									</div>
								</div>
							</MotionFlashSurface>
						))
					) : (
						<Empty
							text="Sin cumpleanos en los proximos dias."
							hint="La alerta vuelve a aparecer aca cuando un cliente entre en la ventana configurada."
						/>
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerHistory() {
		if (!canViewEconomy) return null
		if (customerHistoryLoading) {
			return <LoadingState text="Cargando historial del cliente..." />
		}
		if (!customerHistory) {
			return <div className="info-note">Historial economico no disponible.</div>
		}
		const summary = customerHistory.summary ?? {}
		const orders = customerHistory.work_orders ?? []
		return (
			<div className="customer-history">
				<div className="material-summary">
					<div className="material-kpi">
						<span>Trabajos</span>
						<strong>{summary.work_orders_count ?? 0}</strong>
					</div>
					<div className="material-kpi">
						<span>Cobrado</span>
						<strong>{money(summary.paid_total)}</strong>
					</div>
					<div className="material-kpi">
						<span>Gastado</span>
						<strong>{money(summary.material_cost_total)}</strong>
					</div>
					<div className="material-kpi">
						<span>Margen</span>
						<strong>{money(summary.margin_total)}</strong>
					</div>
				</div>
				<div className="linked-records">
					<div className="linked-records-head">
						<strong>Historial de trabajos</strong>
						<span>{orders.length} registros</span>
					</div>
					{orders.length ? (
						orders.map((order: AnyRecord) => (
							<button
								className="linked-record"
								key={`customer-history-${order.id}`}
								onClick={() => openDetailModal('Orden de trabajo', order)}
								type="button"
							>
								<strong>
									{order.service} - {order.vehicle}
								</strong>
								<small>
									{orderLabels[order.status] ?? order.status} -{' '}
									{formatDateLabel(order.received_at)} - cobrado{' '}
									{money(order.paid_amount)} - materiales{' '}
									{money(order.material_cost)}
								</small>
							</button>
						))
					) : (
						<Empty text="Este cliente todavia no tiene trabajos." />
					)}
				</div>
			</div>
		)
	}

	function renderCustomerRankingPanel(
		title: string,
		rows: AnyRecord[],
		labelKey: string,
		emptyText: string,
	) {
		return (
			<Panel title={title}>
				<div className="customer-ranking-list">
					{rows.length ? (
						rows.slice(0, 6).map((item: AnyRecord, index: number) => (
							<div
								className="customer-ranking-row"
								key={`${title}-${item.id ?? item.name ?? item[labelKey]}`}
							>
								<div className="customer-ranking-main">
									<div className="customer-ranking-title">
										<span className="customer-ranking-position">
											#{index + 1}
										</span>
										<strong>{item[labelKey] || 'Sin dato'}</strong>
									</div>
									<span>
										{item.work_orders_count ?? 0}{' '}
										{item.work_orders_count === 1 ? 'trabajo' : 'trabajos'}
									</span>
								</div>
								<div className="customer-ranking-values">
									<span>
										Ventas <strong>{money(item.billed_total)}</strong>
									</span>
									<span>
										Cobrado <strong>{money(item.paid_total)}</strong>
									</span>
									<span>
										Margen <strong>{money(item.margin_total)}</strong>
									</span>
								</div>
							</div>
						))
					) : (
						<Empty text={emptyText} />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerSalesHistory(orders: AnyRecord[]) {
		return (
			<Panel
				title="Ventas del cliente"
				subtitle={`${orders.length} trabajos registrados`}
			>
				<div className="records compact-records">
					{orders.length ? (
						orders.map((order: AnyRecord) => {
							const detailOrder =
								workOrders.find((item) => String(item.id) === String(order.id)) ??
								order
							return (
							<button
								className="record compact"
								key={`customer-sale-${order.id}`}
								onClick={() =>
									openDetailModal('Orden de trabajo', detailOrder)
								}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{order.service} - {order.vehicle}
										</div>
										<div className="record-sub">
											{formatDateTimeLabel(order.received_at)} - cobrado{' '}
											{money(order.paid_amount)} - saldo{' '}
											{money(order.balance_due)} - materiales{' '}
											{money(order.material_cost)}
										</div>
									</div>
									<div className="record-actions">
										<StatusPill value={order.status} labels={orderLabels} />
										<span className="status payment">
											{money(order.total_amount)}
										</span>
									</div>
								</div>
							</button>
							)
						})
					) : (
						<Empty text="Este cliente todavia no tiene ventas." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerOperationalSnapshot(
		history: AnyRecord,
		upcomingReservations: AnyRecord[],
		recentQuotes: AnyRecord[],
	) {
		const insights = history.insights ?? {}
		const summary = history.summary ?? {}
		const nextReservation =
			insights.next_reservation ?? upcomingReservations[0] ?? null
		const latestQuote = recentQuotes[0] ?? null
		return (
			<Panel
				title="Estado del cliente"
				subtitle="Actividad, cobranza y oportunidades en una sola vista"
			>
				<div className="customer-dashboard-insights">
					<div className="customer-dashboard-card">
						<span>Ultima visita</span>
						<strong>
							{insights.last_visit_at
								? formatDateLabel(insights.last_visit_at)
								: 'Sin trabajos'}
						</strong>
						<small>
							{insights.last_visit_at
								? `${customerDaysAgoText(
										insights.days_since_last_visit,
									)} · ${insights.last_service_name || 'Sin servicio'} · ${
										insights.last_vehicle_label || 'Sin vehiculo'
									}`
								: 'Todavia no tiene trabajos registrados.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Proxima reserva</span>
						<strong>
							{customerScheduleLabel(nextReservation, useReservationTimes)}
						</strong>
						<small>
							{nextReservation
								? `${nextReservation.services} · ${nextReservation.vehicle}`
								: 'Sin agenda futura para este cliente.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Cotizaciones abiertas</span>
						<strong>{insights.open_quotes_count ?? 0}</strong>
						<small>
							{latestQuote
								? `Ultima ${formatDateLabel(latestQuote.quote_date)} · ${money(
										latestQuote.total,
									)}`
								: `${insights.quotes_total ?? 0} cotizaciones registradas`}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Trabajos con saldo</span>
						<strong>{insights.balance_due_work_orders_count ?? 0}</strong>
						<small>{`Saldo total ${money(summary.balance_due_total)}`}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Ticket promedio</span>
						<strong>{money(insights.average_ticket)}</strong>
						<small>{customerAverageGapText(insights.average_days_between_visits)}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Patron principal</span>
						<strong>
							{insights.preferred_service_name || 'Sin servicio frecuente'}
						</strong>
						<small>
							{insights.preferred_vehicle_label
								? `${insights.preferred_vehicle_label} · ${
										insights.preferred_brand_name || 'Sin marca'
									}`
								: 'Todavia no hay recurrencia suficiente.'}
						</small>
					</div>
				</div>
			</Panel>
		)
	}

	function renderCustomerUpcomingReservations(reservationRows: AnyRecord[]) {
		return (
			<Panel
				title="Agenda del cliente"
				subtitle={`${reservationRows.length} reservas futuras visibles`}
			>
				<div className="records compact-records">
					{reservationRows.length ? (
						reservationRows.map((reservation: AnyRecord) => {
							const detailReservation =
								reservations.find(
									(item) => String(item.id) === String(reservation.id),
								) ?? reservation
							return (
							<button
								className="record compact"
								key={`customer-reservation-${reservation.id}`}
								onClick={() =>
									openDetailModal('Reserva', detailReservation)
								}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{reservation.services} - {reservation.vehicle}
										</div>
										<div className="record-sub">
											{customerScheduleLabel(
												reservation,
												useReservationTimes,
											)} -{' '}
											{reservationRangeLabel(reservation) ||
												'sin salida extendida'}
										</div>
									</div>
									<div className="record-actions">
										<StatusPill
											value={reservation.status}
											labels={reservationLabels}
										/>
									</div>
								</div>
							</button>
							)
						})
					) : (
						<Empty text="Este cliente no tiene reservas futuras." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerRecentQuotes(quotesRows: AnyRecord[]) {
		return (
			<Panel
				title="Cotizaciones recientes"
				subtitle={`${quotesRows.length} cotizaciones registradas`}
			>
				<div className="records compact-records">
					{quotesRows.length ? (
						quotesRows.map((quote: AnyRecord) => {
							const quoteCode = quote.public_code ?? `#${quote.id}`
							const detailQuote =
								quotes.find((item) => String(item.id) === String(quote.id)) ??
								quote
							return (
								<button
									className="record compact"
									key={`customer-quote-${quote.id}`}
									onClick={() => openDetailModal('Cotizacion', detailQuote)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												Cotizacion {quoteCode} -{' '}
												{quote.vehicle || 'Sin vehiculo'}
											</div>
											<div className="record-sub">
												{formatDateLabel(quote.quote_date)} - {quote.services}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill
												value={quote.status}
												labels={quoteStatusLabels}
											/>
											<span className="status payment">{money(quote.total)}</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este cliente todavia no tiene cotizaciones." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerPaymentHistory(payments: AnyRecord[]) {
		return (
			<Panel
				title="Historial de pagos"
				subtitle={`${payments.length} pagos registrados`}
			>
				<div className="records compact-records">
					{payments.length ? (
						payments.map((payment: AnyRecord) => (
							<div
								className="record compact"
								key={`customer-payment-${payment.id}`}
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{payment.service} - {payment.vehicle}
										</div>
										<div className="record-sub">
											{formatDateTimeLabel(payment.paid_at)} -{' '}
											{payment.payment_type === 'deposit' ? 'Sena' : 'Pago'} -{' '}
											{debtPaymentMethodLabels[payment.method] ?? payment.method}
										</div>
										{payment.notes ? (
											<div className="record-sub">{payment.notes}</div>
										) : null}
									</div>
									<span className="status payment">
										{money(payment.amount)}
									</span>
								</div>
							</div>
						))
					) : (
						<Empty text="Este cliente todavia no tiene pagos." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerVehicles(customerVehicles: AnyRecord[]) {
		return (
			<Panel
				title="Vehiculos del cliente"
				subtitle={`${customerVehicles.length} ${
					customerVehicles.length === 1 ? 'vehiculo vinculado' : 'vehiculos vinculados'
				}`}
			>
				<div className="records compact-records">
					{customerVehicles.length ? (
						customerVehicles.map((vehicle: AnyRecord) => {
							const detailVehicle =
								vehicles.find((item) => String(item.id) === String(vehicle.id)) ??
								vehicle
							const title =
								vehicle.label ||
								vehicle.license_plate ||
								joinDisplayParts([vehicle.brand, vehicle.model]) ||
								'Vehiculo sin identificar'
							return (
								<button
									className="record compact"
									key={`customer-vehicle-${vehicle.id ?? title}`}
									onClick={() => openDetailModal('Vehiculo', detailVehicle)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">{title}</div>
											<div className="record-sub">
												{joinDisplayParts([
													vehicle.brand,
													vehicle.model,
													vehicle.color,
												]) || 'Sin detalle tecnico'}
											</div>
										</div>
										<div className="record-actions">
											<span className="status draft">
												{vehicle.license_plate || 'Sin patente'}
											</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este cliente todavia no tiene vehiculos." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCustomerDashboard() {
		if (!customerDashboard || !canViewEconomy) return null
		const hasDashboardHistory = Boolean(customerDashboardHistory)
		const history = customerDashboardHistory ?? {}
		const customer = history.customer ?? customerDashboard
		const summary = history.summary ?? {}
		const customerVehicles = history.vehicles ?? []
		const servicesRanking = history.services ?? []
		const vehiclesRanking = history.vehicles_ranking ?? []
		const brandsRanking = history.brands_ranking ?? []
		const orders = history.work_orders ?? []
		const payments = history.payments_history ?? []
		const upcomingReservations = history.upcoming_reservations ?? []
		const recentQuotes = history.recent_quotes ?? []
		const profileItems: CustomerDashboardProfileItem[] = [
			{
				key: 'phone',
				label: 'Telefono',
				value: customer.phone || 'Sin telefono',
			},
			{ key: 'email', label: 'Email', value: customer.email || 'Sin email' },
			{
				key: 'birthday',
				label: 'Cumpleanos',
				value: customer.birthday_label || 'Sin cumpleanos',
			},
			{
				key: 'vehicles',
				label: 'Vehiculos',
				value: customerVehicles.length,
			},
		]
		const dashboardMetrics: CustomerDashboardMetric[] = [
			{
				key: 'sales',
				label: 'Ventas',
				value: money(summary.sales_total ?? summary.billed_total),
			},
			{ key: 'paid', label: 'Cobrado', value: money(summary.paid_total) },
			{
				key: 'balance',
				label: 'Saldo',
				value: money(summary.balance_due_total),
			},
			{
				key: 'materials',
				label: 'Materiales',
				value: money(summary.material_cost_total),
			},
			{ key: 'margin', label: 'Margen', value: money(summary.margin_total) },
			{
				key: 'orders',
				label: 'Trabajos',
				value: summary.work_orders_count ?? 0,
			},
		]
		return (
			<CustomerDashboardShell
				title={customer.name}
				subtitle="Historial, vehiculos, agenda, deuda y pagos disponibles"
				birthdayBadge={renderBirthdayBadge(customer)}
				profileItems={profileItems}
				metrics={dashboardMetrics}
				isLoading={customerDashboardLoading}
				hasHistory={hasDashboardHistory}
				onBack={() => setCustomerDashboard(null)}
				onEdit={() => openDetailModal('Cliente', customer)}
			>
				{renderCustomerOperationalSnapshot(
					history,
					upcomingReservations,
					recentQuotes,
				)}

				<div className="grid two">
					{renderCustomerVehicles(customerVehicles)}
					{renderCustomerUpcomingReservations(upcomingReservations)}
				</div>

				<div className="grid three customer-dashboard-rankings">
					{renderCustomerRankingPanel(
						'Ranking de servicios',
						servicesRanking,
						'name',
						'Sin servicios vendidos para este cliente.',
					)}
					{renderCustomerRankingPanel(
						'Ranking de vehiculos',
						vehiclesRanking,
						'label',
						'Sin vehiculos con trabajos.',
					)}
					{renderCustomerRankingPanel(
						'Ranking de marcas',
						brandsRanking,
						'name',
						'Sin marcas con trabajos.',
					)}
				</div>

				<div className="grid two">
					{renderCustomerRecentQuotes(recentQuotes)}
					{renderCustomerSalesHistory(orders)}
				</div>

				<div className="grid">
					{renderCustomerPaymentHistory(payments)}
				</div>
			</CustomerDashboardShell>
		)
	}

	function renderServiceOperationalSnapshot(
		history: AnyRecord,
		upcomingReservations: AnyRecord[],
		recentQuotes: AnyRecord[],
	) {
		const insights = history.insights ?? {}
		const summary = history.summary ?? {}
		const nextReservation =
			insights.next_reservation ?? upcomingReservations[0] ?? null
		const latestQuote = recentQuotes[0] ?? null
		return (
			<Panel
				title="Estado del servicio"
				subtitle="Carga operativa, venta y apariciones adicionales"
			>
				<div className="customer-dashboard-insights">
					<div className="customer-dashboard-card">
						<span>Ultimo uso</span>
						<strong>
							{insights.last_used_at
								? formatDateLabel(insights.last_used_at)
								: 'Sin trabajos'}
						</strong>
						<small>
							{insights.last_used_at
								? `${customerDaysAgoText(
										insights.days_since_last_use,
										'Sin dato',
									)} · ${insights.last_customer_name || 'Sin cliente'} · ${
										insights.last_vehicle_label || 'Sin vehiculo'
									}`
								: 'Todavia no tiene ordenes principales registradas.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Proxima reserva</span>
						<strong>{customerScheduleLabel(nextReservation)}</strong>
						<small>
							{nextReservation
								? `${nextReservation.customer} · ${nextReservation.vehicle}`
								: 'Sin agenda futura como servicio principal.'}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Trabajos activos</span>
						<strong>{summary.active_work_orders_count ?? 0}</strong>
						<small>{`Facturado ${money(summary.sales_total)}`}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Cotizaciones abiertas</span>
						<strong>{summary.open_quotes_count ?? 0}</strong>
						<small>
							{latestQuote
								? `Ultima ${formatDateLabel(latestQuote.quote_date)} · ${money(
										latestQuote.total,
									)}`
								: `${summary.quotes_total ?? 0} cotizaciones con este servicio`}
						</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Ticket promedio</span>
						<strong>{money(insights.average_ticket)}</strong>
						<small>{`${summary.work_orders_count ?? 0} trabajos historicos`}</small>
					</div>
					<div className="customer-dashboard-card">
						<span>Uso adicional/combo</span>
						<strong>
							{(summary.additional_reservation_items_count ?? 0) +
								(summary.quote_item_usages_count ?? 0)}
						</strong>
						<small>{`Reservas ${summary.additional_reservation_items_count ?? 0} · Cotizaciones ${
							summary.quote_item_usages_count ?? 0
						}`}</small>
					</div>
				</div>
			</Panel>
		)
	}

	function renderServiceUpcomingReservations(reservationsRows: AnyRecord[]) {
		return (
			<Panel
				title="Proximas reservas"
				subtitle={`${reservationsRows.length} reservas visibles`}
			>
				<div className="records compact-records">
					{reservationsRows.length ? (
						reservationsRows.map((reservation: AnyRecord) => {
							const detailReservation =
								reservations.find(
									(item) => String(item.id) === String(reservation.id),
								) ?? reservation
							return (
								<button
									className="record compact"
									key={`service-reservation-${reservation.id}`}
									onClick={() =>
										openDetailModal('Reserva', detailReservation)
									}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												{reservation.customer} - {reservation.vehicle}
											</div>
											<div className="record-sub">
												{customerScheduleLabel(reservation)} -{' '}
												{reservation.services}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill
												value={reservation.status}
												labels={reservationLabels}
											/>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio no tiene reservas futuras." />
					)}
				</div>
			</Panel>
		)
	}

	function renderServiceActiveWorkOrders(orders: AnyRecord[]) {
		return (
			<Panel
				title="Trabajos activos"
				subtitle={`${orders.length} trabajos principales en curso`}
			>
				<div className="records compact-records">
					{orders.length ? (
						orders.map((order: AnyRecord) => {
							const detailOrder =
								workOrders.find((item) => String(item.id) === String(order.id)) ??
								order
							return (
								<button
									className="record compact"
									key={`service-workorder-${order.id}`}
									onClick={() =>
										openDetailModal('Orden de trabajo', detailOrder)
									}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												{order.customer_name} - {order.vehicle_label}
											</div>
											<div className="record-sub">
												{formatDateTimeLabel(order.received_at)} - cobrado{' '}
												{money(order.paid_amount)} - saldo{' '}
												{money(order.balance_due)} - materiales{' '}
												{money(order.material_cost)}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill value={order.status} labels={orderLabels} />
											<span className="status payment">
												{money(order.total_amount)}
											</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio no tiene trabajos activos." />
					)}
				</div>
			</Panel>
		)
	}

	function renderServiceRecentQuotes(quotesRows: AnyRecord[]) {
		return (
			<Panel
				title="Cotizaciones recientes"
				subtitle={`${quotesRows.length} cotizaciones con este servicio`}
			>
				<div className="records compact-records">
					{quotesRows.length ? (
						quotesRows.map((quote: AnyRecord) => {
							const detailQuote =
								quotes.find((item) => String(item.id) === String(quote.id)) ??
								quote
							return (
								<button
									className="record compact"
									key={`service-quote-${quote.id}`}
									onClick={() => openDetailModal('Cotizacion', detailQuote)}
									type="button"
								>
									<div className="record-head">
										<div>
											<div className="record-title">
												Cotizacion {quote.public_code ?? `#${quote.id}`} -{' '}
												{quote.customer}
											</div>
											<div className="record-sub">
												{formatDateLabel(quote.quote_date)} -{' '}
												{quote.vehicle || 'Sin vehiculo'} - {quote.services}
											</div>
										</div>
										<div className="record-actions">
											<StatusPill
												value={quote.status}
												labels={quoteStatusLabels}
											/>
											<span className="status payment">
												{money(quote.total)}
											</span>
										</div>
									</div>
								</button>
							)
						})
					) : (
						<Empty text="Este servicio todavia no tiene cotizaciones." />
					)}
				</div>
			</Panel>
		)
	}

	function renderServiceDashboard() {
		if (!serviceDashboard || !canViewEconomy) return null
		const hasDashboardHistory = Boolean(serviceDashboardHistory)
		const history = serviceDashboardHistory ?? {}
		const service = history.service ?? serviceDashboard
		const summary = history.summary ?? {}
		const topCustomers = history.top_customers ?? []
		const topVehicles = history.top_vehicles ?? []
		const upcomingReservations = history.upcoming_reservations ?? []
		const activeOrders = history.active_work_orders ?? []
		const recentQuotes = history.recent_quotes ?? []
		return (
			<div className="grid customer-dashboard service-dashboard">
				<Panel>
					<div className="customer-dashboard-head service-dashboard-head">
						<button
							type="button"
							className="ghost"
							onClick={() => setServiceDashboard(null)}
						>
							<ChevronLeft size={16} />
							Servicios
						</button>
						<div>
							<h2>{serviceDisplayName(service)}</h2>
							<p>Dashboard especifico del servicio</p>
						</div>
						<button
							type="button"
							className="ghost"
							onClick={() => openDetailModal('Servicio', service)}
						>
							Editar servicio
						</button>
					</div>
					<div className="customer-dashboard-profile service-dashboard-profile">
						<div>
							<span>Tipo</span>
							<strong>
								{serviceTypeLabels[service.service_type] ??
									service.service_type ??
									'Sin tipo'}
							</strong>
						</div>
						<div>
							<span>Precio base</span>
							<strong>{money(service.base_price)}</strong>
						</div>
						<div>
							<span>Duracion estimada</span>
							<strong>{service.estimated_duration_minutes ?? 0} min</strong>
						</div>
						<div>
							<span>Estado</span>
							<strong>{service.is_active === false ? 'Inactivo' : 'Activo'}</strong>
						</div>
						<div>
							<span>Notas</span>
							<strong>{service.notes || 'Sin notas'}</strong>
						</div>
					</div>
				</Panel>

				{serviceDashboardLoading ? (
					<LoadingState text="Cargando dashboard del servicio..." />
				) : null}

				{!serviceDashboardLoading && !hasDashboardHistory ? (
					<div className="info-note">
						No se pudo cargar el historial operativo del servicio. El
						listado sigue disponible para evitar datos incompletos.
					</div>
				) : null}

				{hasDashboardHistory ? (
					<>
						<div className="customer-dashboard-metrics service-dashboard-metrics">
							<MetricCard
								label="Ventas"
								value={money(summary.sales_total ?? summary.billed_total)}
							/>
							<MetricCard label="Cobrado" value={money(summary.paid_total)} />
							<MetricCard
								label="Saldo"
								value={money(summary.balance_due_total)}
							/>
							<MetricCard
								label="Materiales"
								value={money(summary.material_cost_total)}
							/>
							<MetricCard label="Margen" value={money(summary.margin_total)} />
							<MetricCard
								label="Trabajos"
								value={summary.work_orders_count ?? 0}
							/>
						</div>

						{renderServiceOperationalSnapshot(
							history,
							upcomingReservations,
							recentQuotes,
						)}

						<div className="grid two">
							{renderCustomerRankingPanel(
								'Clientes frecuentes',
								topCustomers,
								'name',
								'Este servicio todavia no tiene clientes frecuentes.',
							)}
							{renderCustomerRankingPanel(
								'Vehiculos frecuentes',
								topVehicles,
								'label',
								'Este servicio todavia no tiene vehiculos frecuentes.',
							)}
						</div>

						<div className="grid two">
							{renderServiceUpcomingReservations(upcomingReservations)}
							{renderServiceRecentQuotes(recentQuotes)}
						</div>

						{renderServiceActiveWorkOrders(activeOrders)}
					</>
				) : null}
			</div>
		)
	}

	function supplierProfileSubtitle(supplier: AnyRecord) {
		return [
			supplier.legal_name,
			supplier.category,
			supplier.tax_condition,
		]
			.filter(Boolean)
			.join(' - ')
	}

	function supplierListInsight(supplier: AnyRecord) {
		return supplier.list_insights ?? {}
	}

	function renderSupplierMaterials(rows: AnyRecord[]) {
		return (
			<Panel
				title="Productos frecuentes"
				subtitle="Materiales comprados, volumen y precios recientes"
			>
				<div className="customer-ranking-list">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord, index: number) => (
							<div
								className="customer-ranking-row"
								key={`supplier-material-${item.material ?? item.material_name}`}
							>
								<div className="customer-ranking-main">
									<div className="customer-ranking-title">
										<span className="customer-ranking-position">
											#{index + 1}
										</span>
										<strong>{item.material_name || 'Material sin nombre'}</strong>
									</div>
									<span>
										{item.purchase_count ?? 0}{' '}
										{item.purchase_count === 1 ? 'compra' : 'compras'}
									</span>
								</div>
								<div className="customer-ranking-values">
									<span>
										Cantidad{' '}
										<strong>
											{quantity(item.total_quantity, item.material_unit)}
										</strong>
									</span>
									<span>
										Comprado <strong>{money(item.total_purchased)}</strong>
									</span>
									<span>
										Ultimo precio{' '}
										<strong>{money(item.last_unit_price)}</strong>
									</span>
								</div>
								<div className="record-sub">
									{(item.recent_unit_prices ?? []).length
										? (item.recent_unit_prices ?? [])
												.slice(0, 3)
												.map(
													(price: AnyRecord) =>
														`${formatDateLabel(price.occurred_on)}: ${money(price.unit_price)}`,
												)
												.join(' - ')
										: 'Sin precios unitarios recientes.'}
								</div>
							</div>
						))
					) : (
						<Empty text="Este proveedor todavia no tiene materiales comprados." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierPurchases(rows: AnyRecord[]) {
		return (
			<Panel title="Historial de compras" subtitle={`${rows.length} movimientos`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 10).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-purchase-${item.id}`}
								onClick={() => openDetailModal('Movimiento de stock', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
										<div className="record-sub">
											{(item.lines ?? []).length} producto
											{(item.lines ?? []).length === 1 ? '' : 's'} -{' '}
											{item.products_received
												? 'recibido'
												: 'pendiente de recepcion'}
										</div>
										{item.document_number || item.document_type_label ? (
											<div className="record-sub">
												{item.document_type_label || 'Comprobante'}{' '}
												{item.document_number || ''}
											</div>
										) : null}
									</div>
									<div className="record-actions">
										<span className="status">
											{item.payment_method_label || item.payment_method}
										</span>
									</div>
								</div>
							</button>
						))
					) : (
						<Empty text="Este proveedor no tiene compras registradas." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierPendingReceipts(rows: AnyRecord[]) {
		return (
			<Panel
				title="Recepcion pendiente"
				subtitle={`${rows.length} compras sin ingreso de stock`}
			>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 6).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-pending-${item.id}`}
								onClick={() => openDetailModal('Movimiento de stock', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
										<div className="record-sub">
											{(item.lines ?? [])
												.map((line: AnyRecord) => line.material_name)
												.filter(Boolean)
												.slice(0, 4)
												.join(' - ') || 'Sin detalle de materiales'}
										</div>
									</div>
									<span className="status warning">Pendiente</span>
								</div>
							</button>
						))
					) : (
						<Empty text="No hay compras pendientes de recepcion." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierDocuments(rows: AnyRecord[]) {
		return (
			<Panel title="Comprobantes" subtitle={`${rows.length} asociados`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<div className="record compact" key={`supplier-document-${item.id}`}>
								<div className="record-head">
									<div>
										<div className="record-title">
											{item.document_type_label || 'Comprobante'}{' '}
											{item.document_number || `#${item.id}`}
										</div>
										<div className="record-sub">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
									</div>
									<div className="record-actions">
										{item.document_file_url ? (
											<a
												className="ghost inline-link-button"
												href={item.document_file_url}
												rel="noreferrer"
												target="_blank"
											>
												<FileText size={16} />
												Abrir
											</a>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<Empty text="Sin comprobantes asociados." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierCashMovements(rows: AnyRecord[]) {
		return (
			<Panel title="Caja asociada" subtitle={`${rows.length} egresos por compras`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-cash-${item.id}`}
								onClick={() => openDetailModal('Movimiento de caja', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{item.description || item.category}
										</div>
										<div className="record-sub">
											{formatDateTimeLabel(item.occurred_at)} -{' '}
											{item.category || 'Sin categoria'}
											{item.subcategory ? ` - ${item.subcategory}` : ''}
										</div>
									</div>
									<span className="status expense">{money(item.amount)}</span>
								</div>
							</button>
						))
					) : (
						<Empty text="Este proveedor no genero egresos de caja." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierDebts(rows: AnyRecord[]) {
		return (
			<Panel title="Deudas vinculadas" subtitle={`${rows.length} registros`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-debt-${item.id}`}
								onClick={() => openDetailModal('Deuda', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">{item.concept}</div>
										<div className="record-sub">
											{formatDateLabel(item.origin_date)} - original{' '}
											{money(item.principal_amount)} - saldo{' '}
											{money(item.balance_due)}
										</div>
									</div>
									<span className={`status ${item.status}`}>
										{debtStatusLabels[item.status] ?? item.status}
									</span>
								</div>
							</button>
						))
					) : (
						<Empty text="Sin deudas vinculadas a este proveedor." />
					)}
				</div>
			</Panel>
		)
	}

	function renderSupplierDashboard() {
		if (!supplierDashboard || !canViewEconomy) return null
		const hasDashboardHistory = Boolean(supplierDashboardHistory)
		const history = supplierDashboardHistory ?? {}
		const supplier = history.supplier ?? supplierDashboard
		const summary = history.summary ?? {}
		const purchases = history.purchases ?? []
		const pendingReceipts = history.pending_receipts ?? []
		const materials = history.materials ?? []
		const documents = history.documents ?? []
		const cashMovements = history.cash_movements ?? []
		const debts = history.debts ?? []
		return (
			<div className="grid customer-dashboard supplier-dashboard">
				<Panel>
					<div className="customer-dashboard-head supplier-dashboard-head">
						<button
							type="button"
							className="ghost"
							onClick={() => setSupplierDashboard(null)}
						>
							<ChevronLeft size={16} />
							Proveedores
						</button>
						<div>
							<h2>{supplier.name}</h2>
							<p>{supplierProfileSubtitle(supplier) || 'Dashboard operativo del proveedor'}</p>
						</div>
						<div className="record-actions">
							<button
								type="button"
								className="primary"
								onClick={() => openStockPurchaseForSupplier(supplier)}
							>
								<Package size={16} />
								Nueva compra
							</button>
							<button
								type="button"
								className="ghost"
								onClick={() => openDebtForSupplier(supplier)}
							>
								<ReceiptText size={16} />
								Nueva deuda
							</button>
							<button
								type="button"
								className="ghost"
								onClick={() => openDetailModal('Proveedor', supplier)}
							>
								Editar proveedor
							</button>
						</div>
					</div>
					<div className="customer-dashboard-profile supplier-dashboard-profile">
						<div>
							<span>Contacto</span>
							<strong>{supplier.contact_name || 'Sin contacto'}</strong>
						</div>
						<div>
							<span>Telefono</span>
							<strong>{supplier.phone || 'Sin telefono'}</strong>
						</div>
						<div>
							<span>Email</span>
							<strong>{supplier.email || 'Sin email'}</strong>
						</div>
						<div>
							<span>CUIT</span>
							<strong>{supplier.tax_id || 'Sin CUIT'}</strong>
						</div>
						<div>
							<span>Website</span>
							<strong>{supplier.website || 'Sin web'}</strong>
						</div>
						<div>
							<span>Estado</span>
							<strong>{supplier.is_active === false ? 'Inactivo' : 'Activo'}</strong>
						</div>
					</div>
				</Panel>

				{supplierDashboardLoading ? (
					<LoadingState text="Cargando dashboard del proveedor..." />
				) : null}

				{!supplierDashboardLoading && !hasDashboardHistory ? (
					<div className="info-note">
						No se pudo cargar el historial operativo del proveedor. El listado
						sigue disponible para evitar datos incompletos.
					</div>
				) : null}

				{hasDashboardHistory ? (
					<>
						<div className="customer-dashboard-metrics supplier-dashboard-metrics">
							<MetricCard
								label="Comprado"
								value={money(summary.total_purchased)}
							/>
							<MetricCard
								label="Compras"
								value={summary.purchase_count ?? 0}
							/>
							<MetricCard
								label="Ultima compra"
								value={
									summary.last_purchase_on
										? formatDateLabel(summary.last_purchase_on)
										: 'Sin compras'
								}
							/>
							<MetricCard
								label="Pendiente recepcion"
								value={summary.pending_reception_count ?? 0}
							/>
							<MetricCard
								label="Egresos caja"
								value={money(summary.cash_expense_total)}
							/>
							<MetricCard
								label="Deuda vinculada"
								value={money(summary.debt_balance_due_total)}
							/>
						</div>

						<Panel title="Perfil operativo" subtitle="Datos fiscales, contacto y notas internas">
							<div className="customer-dashboard-insights">
								<div className="customer-dashboard-card">
									<span>Razon social</span>
									<strong>{supplier.legal_name || supplier.name}</strong>
									<small>{supplier.tax_condition || 'Sin condicion fiscal'}</small>
								</div>
								<div className="customer-dashboard-card">
									<span>Rubro</span>
									<strong>{supplier.category || 'Sin rubro'}</strong>
									<small>{supplier.address || 'Sin direccion fiscal'}</small>
								</div>
								<div className="customer-dashboard-card">
									<span>Notas internas</span>
									<strong>{supplier.notes || 'Sin notas'}</strong>
									<small>
										{summary.materials_count ?? 0} materiales comprados
									</small>
								</div>
							</div>
						</Panel>

						<div className="grid two">
							{renderSupplierMaterials(materials)}
							{renderSupplierPendingReceipts(pendingReceipts)}
						</div>

						<div className="grid two">
							{renderSupplierPurchases(purchases)}
							{renderSupplierDocuments(documents)}
						</div>

						<div className="grid two">
							{renderSupplierCashMovements(cashMovements)}
							{renderSupplierDebts(debts)}
						</div>
					</>
				) : null}
			</div>
		)
	}

	function materialUnitValue(material: AnyRecord) {
		return numberValue(
			material.last_purchase_unit_cost ?? material.estimated_unit_cost,
		)
	}

	function materialStockValue(material: AnyRecord) {
		if (material.stock_value !== undefined && material.stock_value !== null) {
			return numberValue(material.stock_value)
		}
		return numberValue(material.stock_quantity) * materialUnitValue(material)
	}

	function materialUsageSummary(material: AnyRecord) {
		const rows = materialUsageRows(material)
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
							(total, item) =>
								total + numberValue(item.estimated_total_cost),
							0,
						),
			lastConsumedAt:
				material.last_consumed_at ?? rows[0]?.consumed_at ?? null,
			rows,
		}
	}

	const inventorySummary = materials.reduce(
		(summary, material) => {
			const usage = materialUsageSummary(material)
			return {
				stockValue: summary.stockValue + materialStockValue(material),
				usageCount: summary.usageCount + usage.count,
				consumedCost: summary.consumedCost + usage.totalCost,
				openUnits:
					summary.openUnits +
					numberValue(material.open_units_active_count),
			}
		},
		{ stockValue: 0, usageCount: 0, consumedCost: 0, openUnits: 0 },
	)

	function toolTotalValue(tool: AnyRecord) {
		if (tool.total_value !== undefined && tool.total_value !== null) {
			return numberValue(tool.total_value)
		}
		return numberValue(tool.quantity) * numberValue(tool.unit_value)
	}

	const toolSummary = tools.reduce(
		(summary, tool) => ({
			records: summary.records + 1,
			quantity: summary.quantity + numberValue(tool.quantity),
			value: summary.value + toolTotalValue(tool),
		}),
		{ records: 0, quantity: 0, value: 0 },
	)

	function updateQuoteItem(index: number, patch: AnyRecord) {
		setQuoteForm((current: AnyRecord) => {
			const items = [...(current.items ?? [])]
			items[index] = { ...items[index], ...patch }
			return { ...current, items }
		})
	}

	function selectQuoteService(index: number, serviceId: string) {
		const service = services.find((item) => String(item.id) === serviceId)
		updateQuoteItem(index, {
			service: serviceId,
			unit_price: service?.base_price ?? '',
		})
		if (serviceId) {
			focusField(`quote.item.${index}.quantity`)
		}
	}

	function addQuoteItem() {
		setQuoteForm((current: AnyRecord) => ({
			...current,
			items: [...(current.items ?? []), blankQuoteItem()],
		}))
	}

	function removeQuoteItem(index: number) {
		setQuoteForm((current: AnyRecord) => {
			const items = (current.items ?? []).filter(
				(_: AnyRecord, itemIndex: number) => itemIndex !== index,
			)
			return {
				...current,
				items: items.length ? items : [blankQuoteItem()],
			}
		})
	}

	function updateReservationItem(index: number, patch: AnyRecord) {
		setReservationForm((current: AnyRecord) => {
			const items = [...(current.items ?? [])]
			items[index] = { ...items[index], ...patch }
			return {
				...current,
				service: index === 0 && patch.service !== undefined ? patch.service : current.service,
				items,
			}
		})
	}

	function selectReservationService(index: number, serviceId: string) {
		const service = services.find((item) => String(item.id) === serviceId)
		updateReservationItem(index, {
			service: serviceId,
			unit_price: service?.base_price ?? '',
		})
		if (serviceId) {
			focusField(`reservation.item.${index}.quantity`)
		}
	}

	function addReservationItem() {
		setReservationForm((current: AnyRecord) => ({
			...current,
			items: [...(current.items ?? []), blankQuoteItem()],
		}))
	}

	function removeReservationItem(index: number) {
		setReservationForm((current: AnyRecord) => {
			const items = (current.items ?? []).filter(
				(_: AnyRecord, itemIndex: number) => itemIndex !== index,
			)
			const nextItems = items.length ? items : [blankQuoteItem()]
			return {
				...current,
				service: nextItems[0]?.service ?? '',
				items: nextItems,
			}
		})
	}

	function updateReservationCustomer(value: string) {
		const vehicle = singleVehicleIdForCustomer(value)
		setReservationForm({
			...reservationForm,
			customer: value,
			vehicle,
		})
		focusField(vehicle ? 'reservation.service.0' : 'reservation.vehicle', !vehicle)
	}

	function updateQuoteCustomer(value: string) {
		const vehicle = singleVehicleIdForCustomer(value)
		setQuoteForm({
			...quoteForm,
			customer: value,
			vehicle,
		})
		focusField(vehicle ? 'quote.service.0' : 'quote.vehicle', !vehicle)
	}

	function updateVehicleCustomer(value: string) {
		setVehicleForm({ ...vehicleForm, customer: value })
		focusField('vehicle.brand')
	}

	function validVehicleModelForBrand(brand: string, model: any) {
		const currentModel = String(model ?? '').trim()
		if (!brand || !currentModel) return ''
		return vehicleModelOptionsForBrand(brand, vehicles).includes(currentModel)
			? currentModel
			: ''
	}

	function updateVehicleBrand(value: string) {
		setVehicleForm((current: AnyRecord) => ({
			...current,
			brand: value,
			model: validVehicleModelForBrand(value, current.model),
		}))
		focusField('vehicle.model')
	}

	function updateDetailVehicleBrand(value: string) {
		updateDetailEdit({
			brand: value,
			model: validVehicleModelForBrand(value, detailModal?.editData?.model),
		})
		focusField('detail.vehicle.model')
	}

	function validExpenseSubcategoryForCategory(category: string, subcategory: any) {
		const currentSubcategory = String(subcategory ?? '').trim()
		if (!category || !currentSubcategory) return ''
		return expenseSubcategoriesForCategory(expenseCategoryTree, category).includes(
			currentSubcategory,
		)
			? currentSubcategory
			: ''
	}

	function validCashSubcategoryForCategory(
		movementType: string,
		category: string,
		subcategory: any,
	) {
		const currentSubcategory = String(subcategory ?? '').trim()
		if (!category || !currentSubcategory) return ''
		const subcategories =
			movementType === 'income'
				? incomeSubcategoriesForCategory(incomeCategoryTree, category)
				: expenseSubcategoriesForCategory(expenseCategoryTree, category)
		return subcategories.includes(currentSubcategory) ? currentSubcategory : ''
	}

	function updateMovementCashCategory(value: string) {
		setMovementForm((current: AnyRecord) => ({
			...current,
			category: value,
			subcategory: validCashSubcategoryForCategory(
				current.movement_type,
				value,
				current.subcategory,
			),
		}))
		focusField('cash-movement.subcategory')
	}

	function updateDebtExpenseCategory(value: string) {
		setDebtForm((current: AnyRecord) => ({
			...current,
			expense_category: value,
			expense_subcategory: validExpenseSubcategoryForCategory(
				value,
				current.expense_subcategory,
			),
		}))
		focusField('debt.expense_subcategory')
	}

	function updateExpenseCategoryTreeLocal(
		category: string,
		subcategory: string,
		previous?: { category?: string; subcategory?: string },
	) {
		const nextTree = upsertExpenseCategoryPair(
			businessFormRef.current.expense_category_tree,
			category,
			subcategory,
			previous,
		)
		patchBusinessForm({ expense_category_tree: nextTree })
		return nextTree
	}

	function updateIncomeCategoryTreeLocal(
		category: string,
		subcategory: string,
		previous?: { category?: string; subcategory?: string },
	) {
		const nextTree = upsertIncomeCategoryPair(
			businessFormRef.current.income_category_tree,
			category,
			subcategory,
			previous,
		)
		patchBusinessForm({ income_category_tree: nextTree })
		return nextTree
	}

	function updateCashCategoryTreeLocal(
		movementType: string,
		category: string,
		subcategory: string,
		previous?: { category?: string; subcategory?: string },
	) {
		return movementType === 'income'
			? updateIncomeCategoryTreeLocal(category, subcategory, previous)
			: updateExpenseCategoryTreeLocal(category, subcategory, previous)
	}

	function registerMovementSubcategory(value: string) {
		updateCashCategoryTreeLocal(
			movementForm.movement_type,
			movementForm.category,
			value,
		)
		setMovementForm({
			...movementForm,
			subcategory: value,
		})
		focusField('cash-movement.amount')
	}

	function registerDebtSubcategory(value: string) {
		updateExpenseCategoryTreeLocal(debtForm.expense_category, value)
		setDebtForm({
			...debtForm,
			expense_subcategory: value,
		})
		focusField('debt.notes')
	}

	function resetExpenseClassificationForm() {
		setExpenseClassificationForm({
			movement_type: 'expense',
			category: '',
			subcategory: '',
			originalCategory: '',
			originalSubcategory: '',
		})
	}

	function openExpenseClassificationEditor(item: {
		movement_type?: string
		category: string
		subcategory: string
	}) {
		setExpenseClassificationForm({
			movement_type: item.movement_type ?? 'expense',
			category: item.category,
			subcategory: item.subcategory,
			originalCategory: item.category,
			originalSubcategory: item.subcategory,
		})
		setFormModal({ kind: 'expense-classification' })
	}

	async function saveExpenseClassification(event: FormEvent) {
		event.preventDefault()
		if (!canViewEconomy) return
		const category = String(expenseClassificationForm.category ?? '').trim()
		const subcategory = String(expenseClassificationForm.subcategory ?? '').trim()
		if (!category || !subcategory) return
		const previous = expenseClassificationForm.originalCategory
			? {
					category: String(expenseClassificationForm.originalCategory),
					subcategory: String(expenseClassificationForm.originalSubcategory),
				}
			: undefined
		const movementType =
			expenseClassificationForm.movement_type === 'income'
				? 'income'
				: 'expense'
		const nextTree =
			movementType === 'income'
				? upsertIncomeCategoryPair(
						businessFormRef.current.income_category_tree,
						category,
						subcategory,
						previous,
					)
				: upsertExpenseCategoryPair(
						businessFormRef.current.expense_category_tree,
						category,
						subcategory,
						previous,
					)
		const saved = await persistBusinessProfile(
			{
				...businessFormRef.current,
				[movementType === 'income'
					? 'income_category_tree'
					: 'expense_category_tree']: nextTree,
			},
			{
				successTitle: previous
					? 'Clasificacion actualizada'
					: 'Clasificacion creada',
			},
		)
		if (saved) {
			resetExpenseClassificationForm()
			formModalExit.close()
		}
	}

	async function deleteExpenseClassification(
		movementType: string,
		category: string,
		subcategory: string,
	) {
		if (!canViewEconomy) return
		const isIncome = movementType === 'income'
		const nextTree = isIncome
			? removeIncomeCategoryPair(
					businessFormRef.current.income_category_tree,
					category,
					subcategory,
				)
			: removeExpenseCategoryPair(
					businessFormRef.current.expense_category_tree,
					category,
					subcategory,
				)
		resetExpenseClassificationForm()
		await persistBusinessProfile(
			{
				...businessFormRef.current,
				[isIncome ? 'income_category_tree' : 'expense_category_tree']:
					nextTree,
			},
			{ successTitle: 'Clasificacion eliminada' },
		)
	}

	function updateDetailCustomer(kind: string, value: string) {
		const vehicle = singleVehicleIdForCustomer(value)
		updateDetailEdit({ customer: value, vehicle })
		focusField(
			vehicle ? `detail.${kind}.service` : `detail.${kind}.vehicle`,
			!vehicle,
		)
	}

	function cashMovementPayload() {
		const payload = { ...movementForm }
		if (!payload.adjusts_closed_day) {
			delete payload.adjusts_closed_day
		}
		if (!payload.subcategory) {
			delete payload.subcategory
		}
		return payload
	}

	function openAdjustmentForClosedDay(day: string) {
		setMovementForm(
			blankMovementForm(today, {
				category: 'Ajustes',
				subcategory: 'Ajuste de cierre',
				amount: '',
				adjusts_closed_day: day,
				description: `Ajuste compensatorio por cierre ${formatDateLabel(day)}.`,
			}),
		)
		setFormModal({ kind: 'cash-movement' })
	}

	function cashEntryTitle(item: AnyRecord) {
		return cashEntryTitleText(item)
	}

	function cashEntryDescription(item: AnyRecord) {
		return cashEntryDescriptionText(item)
	}

	function cashEntryKey(item: AnyRecord) {
		return `${item.source_kind ?? 'cash'}-${item.source_id ?? item.id}`
	}

	function updateCashFilter(
		key: keyof CashFilterState,
		value: string,
	) {
		setCashFilters((current) => ({
			...current,
			[key]: value,
			...(key === 'category' ? { subcategory: '' } : {}),
		}))
	}

	function updateDebtFilter(key: keyof DebtFilterState, value: string) {
		setDebtFilters((current) => ({
			...current,
			[key]: value,
		}))
	}

	function clearDebtFilters() {
		setSearch('')
		setDebtFilters(DEBT_FILTER_DEFAULTS)
	}

	function debtPaymentDetailData(item: AnyRecord) {
		const sourceId = item.source_id ?? item.id
		const payment = debtPayments.find(
			(current) => String(current.id) === String(sourceId),
		)
		if (payment) return payment
		return {
			...item,
			id: sourceId,
			debt: item.debt,
			paid_at: String(item.occurred_at ?? '').slice(0, 10),
			notes: item.description ?? '',
		}
	}

	function openCashEntryDetail(item: AnyRecord) {
		if (item.source_kind === 'debt_payment') {
			openDetailModal('Pago de deuda', debtPaymentDetailData(item))
			return
		}
		openDetailModal('Movimiento de caja', item)
	}

	function openDebtPaymentForDebt(debt: AnyRecord) {
		setDebtPaymentForm({
			...blankDebtPaymentForm(today),
			debt: String(debt.id),
			amount: normalizedAmountInput(debt.balance_due),
		})
		setFormModal({ kind: 'debt-payment' })
	}

	function moveSelectedCashDay(offset: number) {
		setSelectedDay((current) => addDays(current || today, offset))
	}

	function closeCashDay() {
		return runAction(
			() =>
				apiFetch('/cash/close/', {
					method: 'POST',
					body: JSON.stringify({ date: selectedDay }),
				}),
			{
				successTitle: 'Caja cerrada',
				successDescription: () =>
					`El cierre de ${formatDateLabel(selectedDay)} quedo guardado.`,
			},
		)
	}

	function openFormModal(kind: FormModalKind) {
		if (!canViewEconomy && !['customer', 'vehicle'].includes(kind)) return
		if (kind === 'customer') {
			setCustomerForm(blankCustomerForm())
		}
		if (kind === 'vehicle') {
			setVehicleForm({
				id: '',
				customer: '',
				license_plate: '',
				brand: '',
				model: '',
				color: '',
				notes: '',
			})
		}
		if (kind === 'quote') {
			setQuoteForm(blankQuoteFormWithDefaults())
		}
		if (kind === 'service') {
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				service_type: 'wash',
				base_price: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
		}
		if (kind === 'payment') {
			setPaymentForm(blankPaymentForm())
		}
		if (kind === 'cash-movement') {
			setMovementForm(blankMovementForm(selectedDay))
		}
		if (kind === 'expense-classification') {
			resetExpenseClassificationForm()
		}
		if (kind === 'debt') {
			setDebtForm(blankDebtForm(today))
		}
		if (kind === 'debt-payment') {
			setDebtPaymentForm(blankDebtPaymentForm(today))
		}
		if (kind === 'material') {
			setMaterialForm({
				id: '',
				name: '',
				unit: 'ml',
				category: '',
				sku: '',
				presentation: '',
				stock_quantity: '0',
				minimum_stock: '0',
				estimated_unit_cost: '0',
				notes: '',
			})
		}
		if (kind === 'supplier') {
			setSupplierForm(blankSupplierForm())
		}
		if (kind === 'stock-movement') {
			setStockMovementForm(blankStockMovementForm(selectedDay))
			setStockMovementDocumentFile(null)
		}
		if (kind === 'material-purchase') {
			setPurchaseForm({
				material: '',
				purchased_at: selectedDay,
				quantity: '',
				total_cost: '',
				affects_cash: true,
				observations: '',
			})
		}
		if (kind === 'material-open-unit') {
			setOpenUnitForm({
				material: '',
				opened_at: selectedDay,
				opened_by_work_order: '',
				stock_quantity_to_decrement: '1',
				observations: '',
			})
		}
		if (kind === 'material-consumption') {
			setConsumptionForm({
				mode: 'direct',
				work_order: '',
				material: '',
				open_unit: '',
				consumed_at: selectedDay,
				quantity: '',
				observations: '',
			})
		}
		if (kind === 'tool') {
			setToolForm({
				id: '',
				name: '',
				quantity: '1',
				status: 'in_use',
				unit_value: '0',
				purchased_at: '',
				notes: '',
			})
		}
		if (kind === 'employee') {
			setEmployeeForm({
				username: '',
				email: '',
				password: '',
			})
		}
		setFormModal({ kind })
	}

	function applyQuickSelection(target: string, value: string) {
		if (target === 'reservation.customer') {
			const vehicle = singleVehicleIdForCustomer(value)
			setReservationForm({ ...reservationForm, customer: value, vehicle })
			focusField(vehicle ? 'reservation.service.0' : 'reservation.vehicle', !vehicle)
		}
		if (target === 'reservation.vehicle') {
			setReservationForm({ ...reservationForm, vehicle: value })
			focusField('reservation.service.0', true)
		}
		if (target === 'reservation.service') {
			selectReservationService(0, value)
			focusField('reservation.day')
		}
		if (target.startsWith('reservation.service.')) {
			selectReservationService(Number(target.replace('reservation.service.', '')), value)
		}
		if (target === 'quote.customer') {
			const vehicle = singleVehicleIdForCustomer(value)
			setQuoteForm({ ...quoteForm, customer: value, vehicle })
			focusField(vehicle ? 'quote.service.0' : 'quote.vehicle', !vehicle)
		}
		if (target === 'quote.vehicle') {
			setQuoteForm({ ...quoteForm, vehicle: value })
			focusField('quote.service.0', true)
		}
		if (target.startsWith('quote.service.')) {
			selectQuoteService(Number(target.replace('quote.service.', '')), value)
		}
		if (target === 'purchase.material') {
			setPurchaseForm({ ...purchaseForm, material: value })
		}
		if (target === 'consumption.material') {
			setConsumptionForm({ ...consumptionForm, material: value })
		}
		if (target === 'open-unit.material') {
			setOpenUnitForm({ ...openUnitForm, material: value })
		}
		if (target === 'stock-movement.supplier') {
			setStockMovementForm((current: AnyRecord) => ({
				...current,
				supplier: value,
			}))
		}
		if (target === 'vehicle.customer') {
			updateVehicleCustomer(value)
		}
	}

	function openQuickCreate(kind: string, target: string) {
		if (
			!canViewEconomy &&
			(kind === 'service' || kind === 'material' || kind === 'supplier')
		) {
			return
		}
		setQuickCreate({ kind, target })
	if (kind === 'customer') {
		setCustomerForm(blankCustomerForm())
	}
	if (kind === 'vehicle') {
		const customer =
			target.startsWith('reservation')
				? reservationForm.customer
				: target.startsWith('quote')
					? quoteForm.customer
					: vehicleForm.customer
		setVehicleForm({
			id: '',
			customer,
				license_plate: '',
				brand: '',
				model: '',
				color: '',
				notes: '',
			})
		}
		if (kind === 'service') {
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				service_type: 'wash',
				base_price: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
		}
		if (kind === 'material') {
			setMaterialForm({
				id: '',
				name: '',
				unit: 'ml',
				stock_quantity: '0',
				estimated_unit_cost: '0',
				notes: '',
			})
		}
		if (kind === 'supplier') {
			setSupplierForm(blankSupplierForm())
		}
	}

	async function saveQuickCustomer(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/customers/', {
				method: 'POST',
				body: JSON.stringify(cleanCustomerPayload(customerForm)),
			})
			applyQuickSelection(quickCreate.target, String(created.id))
			setCustomerForm(blankCustomerForm())
			quickCreateExit.close()
			return created
		}, {
			flashTarget: fieldFlashKey(quickCreate.target),
			successTitle: entityFeedbackTitle('customer', 'created'),
			undo: undoCreatedRecord('customer'),
		})
	}

	async function saveQuickVehicle(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/vehicles/', {
				method: 'POST',
				body: JSON.stringify(asPayload(vehicleForm)),
			})
			applyQuickSelection(quickCreate.target, String(created.id))
			setVehicleForm({
				id: '',
				customer: '',
				license_plate: '',
				brand: '',
				model: '',
				color: '',
				notes: '',
			})
			quickCreateExit.close()
			return created
		}, {
			flashTarget: fieldFlashKey(quickCreate.target),
			successTitle: entityFeedbackTitle('vehicle', 'created'),
			undo: undoCreatedRecord('vehicle'),
		})
	}

	async function saveQuickService(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate || !canViewEconomy) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/services/', {
				method: 'POST',
				body: JSON.stringify(asPayload(serviceForm)),
			})
			applyQuickSelection(quickCreate.target, String(created.id))
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				service_type: 'wash',
				base_price: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
			quickCreateExit.close()
			return created
		}, {
			flashTarget: fieldFlashKey(quickCreate.target),
			successTitle: entityFeedbackTitle('service', 'created'),
			undo: undoCreatedRecord('service'),
		})
	}

	async function saveQuickMaterial(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate || !canViewEconomy) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/materials/', {
				method: 'POST',
				body: JSON.stringify(asPayload(materialForm)),
			})
			applyQuickSelection(quickCreate.target, String(created.id))
			setMaterialForm({
				id: '',
				name: '',
				unit: 'ml',
				stock_quantity: '0',
				estimated_unit_cost: '0',
				notes: '',
			})
			quickCreateExit.close()
			return created
		}, {
			flashTarget: fieldFlashKey(quickCreate.target),
			successTitle: entityFeedbackTitle('material', 'created'),
			undo: undoCreatedRecord('material'),
		})
	}

	async function saveQuickSupplier(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate || !canViewEconomy) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/suppliers/', {
				method: 'POST',
				body: JSON.stringify(asPayload(supplierForm)),
			})
			applyQuickSelection(quickCreate.target, String(created.id))
			setSupplierForm(blankSupplierForm())
			quickCreateExit.close()
			return created
		}, {
			flashTarget: fieldFlashKey(quickCreate.target),
			successTitle: entityFeedbackTitle('supplier', 'created'),
			undo: undoCreatedRecord('supplier'),
		})
	}

	async function createSupplierFromName(name: string, target: string) {
		const trimmedName = name.trim()
		if (!trimmedName || !canViewEconomy) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/suppliers/', {
				method: 'POST',
				body: JSON.stringify({ name: trimmedName }),
			})
			applyQuickSelection(target, String(created.id))
			return created
		}, {
			flashTarget: fieldFlashKey(target),
			successTitle: entityFeedbackTitle('supplier', 'created'),
			undo: undoCreatedRecord('supplier'),
		})
	}

	function buildBusinessProfilePayload(
		currentBusinessForm: AnyRecord,
		options: { includeLogo?: boolean } = {},
	) {
		const payload = new FormData()
		payload.append('name', String(currentBusinessForm.name ?? '').trim())
		payload.append('cuit', String(currentBusinessForm.cuit ?? ''))
		payload.append(
			'vat_condition',
			String(currentBusinessForm.vat_condition ?? ''),
		)
		payload.append(
			'contact_phone',
			String(currentBusinessForm.contact_phone ?? ''),
		)
		payload.append(
			'contact_email',
			String(currentBusinessForm.contact_email ?? ''),
		)
		payload.append('address', String(currentBusinessForm.address ?? ''))
		payload.append(
			'default_quote_validity_days',
			String(currentBusinessForm.default_quote_validity_days ?? '7'),
		)
		payload.append(
			'default_quote_tax_rate',
			String(currentBusinessForm.default_quote_tax_rate ?? '0'),
		)
		payload.append(
			'default_quote_discount_rate',
			String(currentBusinessForm.default_quote_discount_rate ?? '0'),
		)
		payload.append(
			'default_quote_terms',
			String(currentBusinessForm.default_quote_terms ?? ''),
		)
		payload.append(
			'default_quote_payment_instructions',
			String(currentBusinessForm.default_quote_payment_instructions ?? ''),
		)
		payload.append(
			'use_reservation_times',
			String(currentBusinessForm.use_reservation_times !== false),
		)
		payload.append(
			'show_stay_days_in_agenda',
			String(currentBusinessForm.show_stay_days_in_agenda !== false),
		)
		payload.append(
			'public_landing_enabled',
			String(currentBusinessForm.public_landing_enabled !== false),
		)
		payload.append(
			'public_landing_intro',
			String(currentBusinessForm.public_landing_intro ?? ''),
		)
		payload.append(
			'allow_public_booking_requests',
			String(currentBusinessForm.allow_public_booking_requests !== false),
		)
		payload.append(
			'allow_public_quote_requests',
			String(currentBusinessForm.allow_public_quote_requests !== false),
		)
		payload.append(
			'income_category_tree',
			JSON.stringify(
				normalizeIncomeCategoryTree(
					currentBusinessForm.income_category_tree,
				),
			),
		)
		payload.append(
			'expense_category_tree',
			JSON.stringify(
				normalizeExpenseCategoryTree(
					currentBusinessForm.expense_category_tree,
				),
			),
		)
		if (options.includeLogo && businessLogoFile) {
			payload.append('logo', businessLogoFile)
		}
		return payload
	}

	async function persistBusinessProfile(
		nextBusinessForm: AnyRecord,
		options: { includeLogo?: boolean; successTitle?: string } = {},
	) {
		syncBusinessForm(nextBusinessForm)
		return runAction(
			async () => {
				const saved = await apiFetch<AnyRecord>(
					'/settings/business-profile/',
					{
						method: 'PATCH',
						body: buildBusinessProfilePayload(nextBusinessForm, options),
					},
				)
				syncBusinessProfile(saved)
				return saved
			},
			{
				successTitle: options.successTitle ?? 'Configuracion guardada',
			},
		)
	}

	async function saveBusinessProfile(event: FormEvent) {
		event.preventDefault()
		if (!canViewEconomy) return
		await persistBusinessProfile(businessFormRef.current, {
			includeLogo: true,
		})
	}

	async function saveEmployee(event: FormEvent) {
		event.preventDefault()
		if (!canViewEconomy) return
		await runAction(
			async () => {
				const created = await apiFetch<AnyRecord>('/auth/employees/', {
					method: 'POST',
					body: JSON.stringify(asPayload(employeeForm)),
				})
				setEmployeeForm({
					username: '',
					email: '',
					password: '',
				})
				formModalExit.close()
				return created
			},
			{
				successTitle: (created) => `Empleado ${created.username} creado`,
			},
		)
	}

	async function saveProfile(event: FormEvent) {
		event.preventDefault()
		if (!currentUser) return
		setError(null)
		const payload = new FormData()
		payload.append('email', String(profileForm.email ?? '').trim())
		payload.append(
			'phone_country_code',
			String(profileForm.phone_country_code ?? '+54'),
		)
		payload.append(
			'phone_number',
			String(profileForm.phone_number ?? '').trim(),
		)
		if (canViewEconomy) {
			payload.append(
				'subscription_type',
				String(profileForm.subscription_type ?? 'trial'),
			)
		}
		try {
			const saved = await apiFetch<AnyRecord>('/auth/me/', {
				method: 'PATCH',
				body: payload,
			})
			setCurrentUser(saved)
			syncProfileForm(saved)
			showToast({
				tone: 'success',
				title: 'Perfil actualizado',
				description: successToastDescription('Perfil actualizado'),
			})
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo guardar el perfil',
					fallbackDescription:
						'Revisa los datos e intenta nuevamente.',
				}),
			)
		}
	}

	function detailKindFromTitle(title: string) {
		return (
			{
				Cliente: 'customer',
				Vehiculo: 'vehicle',
				Servicio: 'service',
				Reserva: 'reservation',
				'Orden de trabajo': 'workorder',
				Material: 'material',
				Proveedor: 'supplier',
				'Movimiento de stock': 'stock-movement',
				'Unidad abierta': 'material-open-unit',
				'Compra de material': 'material-purchase',
				'Consumo de material': 'material-consumption',
				Herramienta: 'tool',
				Cotizacion: 'quote',
				'Movimiento de caja': 'cash-movement',
				Deuda: 'debt',
				'Pago de deuda': 'debt-payment',
			}[title] ?? ''
		)
	}

	function openDetailModal(title: string, data: AnyRecord) {
		const kind = detailKindFromTitle(title)
		if (!canViewEconomy && detailRequiresEconomy(kind)) return
		setDetailModal({
			title,
			kind,
			data,
			editData: { ...data },
			editing: editableDetailKind(kind),
		})
	}

	function openDetailFromEvent(event: any, title: string, data: AnyRecord) {
		if (suppressAgendaClickRef.current || suppressQuoteClickRef.current) return
		const target = event.target as HTMLElement
		if (target.closest(AGENDA_INTERACTIVE_SELECTOR)) return
		openDetailModal(title, data)
	}

	function openCustomerDashboard(customer: AnyRecord) {
		if (!canViewEconomy) {
			openDetailModal('Cliente', customer)
			return
		}
		setCustomerDashboard(customer)
	}

	function openServiceDashboard(service: AnyRecord) {
		if (!canViewEconomy) {
			openDetailModal('Servicio', service)
			return
		}
		setServiceDashboard(service)
	}

	function openSupplierDashboard(supplier: AnyRecord) {
		if (!canViewEconomy) return
		setSupplierDashboard(supplier)
	}

	function availableQuickActions(actions: QuickAction[]) {
		return actions.filter((action) => !action.hidden)
	}

	function openQuickActionsAt(
		anchorPoint: { x: number; y: number },
		title: string,
		actions: QuickAction[],
		returnFocusElement?: HTMLElement | null,
	) {
		const visibleActions = availableQuickActions(actions)
		if (!visibleActions.length) return
		quickActionsReturnFocusRef.current = returnFocusElement ?? null
		setQuickActionsMenu({
			title,
			actions: visibleActions,
			anchorPoint,
		})
	}

	function openQuickActionsFromContext(
		event: MouseEvent<HTMLElement>,
		title: string,
		actions: QuickAction[],
	) {
		event.preventDefault()
		event.stopPropagation()
		openQuickActionsAt(
			{ x: event.clientX, y: event.clientY },
			title,
			actions,
			event.currentTarget,
		)
	}

	function openQuickActionsFromTrigger(
		event: MouseEvent<HTMLButtonElement>,
		title: string,
		actions: QuickAction[],
	) {
		event.preventDefault()
		event.stopPropagation()
		const rect = event.currentTarget.getBoundingClientRect()
		openQuickActionsAt(
			{ x: rect.right, y: rect.bottom },
			title,
			actions,
			event.currentTarget,
		)
	}

	function quickActionTargetProps(title: string, actions: QuickAction[]) {
		return {
			onContextMenu: (event: MouseEvent<HTMLElement>) =>
				openQuickActionsFromContext(event, title, actions),
		}
	}

	function renderQuickActionsTrigger(
		title: string,
		actions: QuickAction[],
		ariaLabel = 'Abrir acciones rapidas',
	) {
		if (!availableQuickActions(actions).length) return null
		return (
			<button
				type="button"
				className="ghost icon-button quick-actions-trigger"
				aria-label={ariaLabel}
				title={ariaLabel}
				onClick={(event) => openQuickActionsFromTrigger(event, title, actions)}
			>
				<MoreHorizontal size={16} />
			</button>
		)
	}

	function interactiveRecordProps(onOpen: () => void) {
		return {
			role: 'button',
			tabIndex: 0,
			onClick: () => onOpen(),
			onKeyDown: (event: any) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onOpen()
				}
			},
		}
	}

	function openStockPurchaseForSupplier(supplier: AnyRecord) {
		setStockMovementForm({
			...blankStockMovementForm(selectedDay),
			movement_type: 'purchase',
			supplier: String(supplier.id),
		})
		setStockMovementDocumentFile(null)
		setFormModal({ kind: 'stock-movement' })
	}

	function openDebtForSupplier(supplier: AnyRecord) {
		setDebtForm({
			...blankDebtForm(selectedDay),
			creditor: supplier.name ?? '',
			supplier: String(supplier.id),
			expense_category: 'Materiales e insumos',
			expense_subcategory: 'Compra de materiales',
		})
		setFormModal({ kind: 'debt' })
	}

	function openUnitForMaterial(material: AnyRecord) {
		setOpenUnitForm({
			material: String(material.id),
			opened_at: selectedDay,
			opened_by_work_order: '',
			stock_quantity_to_decrement: '1',
			observations: '',
		})
		setFormModal({ kind: 'material-open-unit' })
	}

	function customerForRecord(record: AnyRecord | null | undefined) {
		const customerId =
			record?.customer ?? record?.customer_id ?? record?.customerId ?? null
		if (customerId === null || customerId === undefined || customerId === '') {
			return null
		}
		return (
			customers.find((customer) => String(customer.id) === String(customerId)) ??
			null
		)
	}

	function vehicleForRecord(record: AnyRecord | null | undefined) {
		const vehicleId =
			record?.vehicle ?? record?.vehicle_id ?? record?.vehicleId ?? null
		if (vehicleId === null || vehicleId === undefined || vehicleId === '') {
			return null
		}
		return (
			vehicles.find((vehicle) => String(vehicle.id) === String(vehicleId)) ??
			null
		)
	}

	function deleteRecordQuickAction(
		kind: string,
		data: AnyRecord,
		label = 'Eliminar',
	): QuickAction {
		const path = data?.id ? detailEndpoint(kind, data.id) : ''
		const undo =
			data && 'is_active' in data ? undoRestoreActiveRecord(kind, data) : null
		return {
			id: `${kind}:delete:${data?.id ?? 'new'}`,
			label,
			icon: <Trash2 size={15} />,
			tone: 'danger',
			requiresConfirm: true,
			hidden: !path,
			onSelect: () =>
				runAction(
					() =>
						apiFetch(path, {
							method: 'DELETE',
						}),
					{
						successTitle: entityFeedbackTitle(kind, 'deleted'),
						...(undo ? { undo } : {}),
					},
				),
		}
	}

	function customerQuickActions(customer: AnyRecord): QuickAction[] {
		const customerName = serviceDisplayName(customer)
		const actions: QuickAction[] = [
			{
				id: `customer:dashboard:${customer.id}`,
				label: canViewEconomy ? 'Dashboard cliente' : 'Detalle cliente',
				icon: <Eye size={15} />,
				onSelect: () => openCustomerDashboard(customer),
			},
			{
				id: `customer:edit:${customer.id}`,
				label: 'Editar cliente',
				icon: <Pencil size={15} />,
				onSelect: () => openDetailModal('Cliente', customer),
			},
			deleteRecordQuickAction('customer', customer, 'Baja cliente'),
		]
		return actions.map((action) => ({
			...action,
			description: action.description ?? customerName,
		}))
	}

	function vehicleQuickActions(vehicle: AnyRecord): QuickAction[] {
		const customer = customerForRecord(vehicle)
		return [
			{
				id: `vehicle:detail:${vehicle.id}`,
				label: 'Detalle vehiculo',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Vehiculo', vehicle),
			},
			{
				id: `vehicle:customer:${vehicle.id}`,
				label: 'Cliente',
				icon: <Users size={15} />,
				hidden: !customer,
				onSelect: () => customer && openCustomerDashboard(customer),
			},
			deleteRecordQuickAction('vehicle', vehicle, 'Baja vehiculo'),
		]
	}

	function supplierQuickActions(supplier: AnyRecord): QuickAction[] {
		return [
			{
				id: `supplier:dashboard:${supplier.id}`,
				label: 'Dashboard proveedor',
				icon: <Eye size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => openSupplierDashboard(supplier),
			},
			{
				id: `supplier:purchase:${supplier.id}`,
				label: 'Nueva compra',
				icon: <Package size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => openStockPurchaseForSupplier(supplier),
			},
			{
				id: `supplier:debt:${supplier.id}`,
				label: 'Nueva deuda',
				icon: <ReceiptText size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => openDebtForSupplier(supplier),
			},
			{
				id: `supplier:edit:${supplier.id}`,
				label: 'Editar proveedor',
				icon: <Pencil size={15} />,
				onSelect: () => openDetailModal('Proveedor', supplier),
			},
			deleteRecordQuickAction('supplier', supplier, 'Inactivar proveedor'),
		]
	}

	function serviceQuickActions(service: AnyRecord): QuickAction[] {
		return [
			{
				id: `service:dashboard:${service.id}`,
				label: 'Dashboard servicio',
				icon: <Eye size={15} />,
				onSelect: () => openServiceDashboard(service),
			},
			{
				id: `service:edit:${service.id}`,
				label: 'Editar servicio',
				icon: <Pencil size={15} />,
				onSelect: () => openDetailModal('Servicio', service),
			},
			deleteRecordQuickAction('service', service, 'Inactivar servicio'),
		]
	}

	function materialQuickActions(material: AnyRecord): QuickAction[] {
		return [
			{
				id: `material:open-unit:${material.id}`,
				label: 'Abrir unidad',
				icon: <Package size={15} />,
				hidden: !canViewEconomy,
				onSelect: () => openUnitForMaterial(material),
			},
			{
				id: `material:edit:${material.id}`,
				label: 'Editar material',
				icon: <Pencil size={15} />,
				onSelect: () => openDetailModal('Material', material),
			},
			deleteRecordQuickAction('material', material, 'Inactivar material'),
		]
	}

	function toolQuickActions(tool: AnyRecord): QuickAction[] {
		return [
			{
				id: `tool:edit:${tool.id}`,
				label: 'Editar herramienta',
				icon: <Pencil size={15} />,
				onSelect: () => openDetailModal('Herramienta', tool),
			},
			deleteRecordQuickAction('tool', tool, 'Inactivar herramienta'),
		]
	}

	function debtQuickActions(debt: AnyRecord): QuickAction[] {
		const hasBalance = numberValue(debt.balance_due) > 0
		return [
			{
				id: `debt:pay:${debt.id}`,
				label: 'Registrar pago',
				icon: <CreditCard size={15} />,
				hidden: !hasBalance,
				onSelect: () => openDebtPaymentForDebt(debt),
			},
			{
				id: `debt:detail:${debt.id}`,
				label: 'Detalle deuda',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Deuda', debt),
			},
			deleteRecordQuickAction('debt', debt, 'Eliminar deuda'),
		]
	}

	function debtPaymentQuickActions(payment: AnyRecord): QuickAction[] {
		return [
			{
				id: `debt-payment:detail:${payment.id}`,
				label: 'Detalle pago',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Pago de deuda', payment),
			},
			deleteRecordQuickAction('debt-payment', payment, 'Eliminar pago'),
		]
	}

	function cashEntryQuickActions(entry: AnyRecord): QuickAction[] {
		const sourceKind = String(entry.source_kind ?? '')
		const isDebtPayment = sourceKind === 'debt_payment'
		const isEditableCashMovement =
			sourceKind === 'manual' || sourceKind === 'adjustment'
		const sourceId = entry.source_id ?? entry.id
		const deleteKind = isDebtPayment ? 'debt-payment' : 'cash-movement'
		const deleteData = isDebtPayment
			? debtPaymentDetailData(entry)
			: { ...entry, id: sourceId }
		const actions: QuickAction[] = [
			{
				id: `cash-entry:detail:${cashEntryKey(entry)}`,
				label: 'Detalle movimiento',
				icon: <Eye size={15} />,
				onSelect: () => openCashEntryDetail(entry),
			},
			deleteRecordQuickAction(
				deleteKind,
				deleteData,
				isDebtPayment ? 'Eliminar pago' : 'Eliminar movimiento',
			),
		]
		return actions.map((action) => ({
			...action,
			hidden:
				action.hidden ||
				(action.id.startsWith(`${deleteKind}:delete:`) &&
					!isDebtPayment &&
					!isEditableCashMovement),
		}))
	}

	function quoteQuickActions(quote: AnyRecord): QuickAction[] {
		const customer = customerForRecord(quote)
		const vehicle = vehicleForRecord(quote)
		const hasReservation = quoteHasReservation(quote)
		const isDraft = quoteLaneStatus(quote) === 'draft'
		return [
			{
				id: `quote:detail:${quote.id}`,
				label: 'Detalle cotizacion',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Cotizacion', quote),
			},
			{
				id: `quote:pdf:${quote.id}`,
				label: 'Bajar PDF',
				icon: <FileText size={15} />,
				onSelect: () => downloadQuotePdf(quote),
			},
			{
				id: `quote:send:${quote.id}`,
				label: 'Bajar y marcar enviada',
				icon: <FileText size={15} />,
				hidden: !isDraft,
				onSelect: () => downloadQuotePdfAndMarkSent(quote),
			},
			{
				id: `quote:agenda:${quote.id}`,
				label: hasReservation ? 'Ver en agenda' : 'Crear reserva',
				icon: <CalendarDays size={15} />,
				onSelect: () =>
					hasReservation
						? openQuoteReservationInAgenda(quote)
						: createReservationFromQuote(quote),
			},
			{
				id: `quote:customer:${quote.id}`,
				label: 'Cliente',
				icon: <Users size={15} />,
				hidden: !customer,
				onSelect: () => customer && openCustomerDashboard(customer),
			},
			{
				id: `quote:vehicle:${quote.id}`,
				label: 'Vehiculo',
				icon: <Car size={15} />,
				hidden: !vehicle,
				onSelect: () => vehicle && openDetailModal('Vehiculo', vehicle),
			},
			deleteRecordQuickAction('quote', quote, 'Eliminar cotizacion'),
		]
	}

	function materialOpenUnitQuickActions(unit: AnyRecord): QuickAction[] {
		return [
			{
				id: `material-open-unit:detail:${unit.id}`,
				label: 'Detalle unidad',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Unidad abierta', unit),
			},
			{
				id: `material-open-unit:finish:${unit.id}`,
				label: 'Finalizar unidad',
				icon: <CheckCircle2 size={15} />,
				hidden: unit.status !== 'open',
				onSelect: () => finishOpenUnit(unit),
			},
		]
	}

	function materialPurchaseQuickActions(purchase: AnyRecord): QuickAction[] {
		return [
			{
				id: `material-purchase:detail:${purchase.id}`,
				label: 'Detalle compra',
				icon: <Eye size={15} />,
				onSelect: () => openDetailModal('Compra de material', purchase),
			},
			deleteRecordQuickAction(
				'material-purchase',
				purchase,
				'Eliminar compra',
			),
		]
	}

	function materialConsumptionQuickActions(consumption: AnyRecord): QuickAction[] {
		return [
			{
				id: `material-consumption:detail:${consumption.id}`,
				label: 'Detalle consumo',
				icon: <Eye size={15} />,
				onSelect: () =>
					openDetailModal('Consumo de material', consumption),
			},
			deleteRecordQuickAction(
				'material-consumption',
				consumption,
				'Eliminar consumo',
			),
		]
	}

	function detailRecordProps(title: string, data: AnyRecord) {
		return {
			role: 'button',
			tabIndex: 0,
			onClick: (event: any) => openDetailFromEvent(event, title, data),
			onKeyDown: (event: any) => {
				const target = event.target as HTMLElement
				if (target.closest(AGENDA_INTERACTIVE_SELECTOR)) {
					return
				}
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					openDetailFromEvent(event, title, data)
				}
			},
		}
	}

	function updateDetailEdit(patch: AnyRecord) {
		setDetailModal((current) =>
			current
				? { ...current, editData: { ...current.editData, ...patch } }
				: current,
		)
	}

	function detailReservationItems(data: AnyRecord) {
		return data.items?.length
			? data.items
			: [
					{
						service: data.service ?? '',
						quantity: '1',
						unit_price:
							services.find(
								(item) => String(item.id) === String(data.service),
							)?.base_price ?? '',
					},
				]
	}

	function updateDetailReservationItem(index: number, patch: AnyRecord) {
		setDetailModal((current) => {
			if (!current) return current
			const items = [...detailReservationItems(current.editData)]
			items[index] = { ...items[index], ...patch }
			return {
				...current,
				editData: {
					...current.editData,
					service:
						index === 0 && patch.service !== undefined
							? patch.service
							: current.editData.service,
					items,
				},
			}
		})
	}

	function selectDetailReservationService(index: number, serviceId: string) {
		const service = services.find((item) => String(item.id) === serviceId)
		updateDetailReservationItem(index, {
			service: serviceId,
			unit_price: service?.base_price ?? '',
		})
	}

	function addDetailReservationItem() {
		setDetailModal((current) =>
			current
				? {
						...current,
						editData: {
							...current.editData,
							items: [...detailReservationItems(current.editData), blankQuoteItem()],
						},
					}
				: current,
		)
	}

	function removeDetailReservationItem(index: number) {
		setDetailModal((current) => {
			if (!current) return current
			const items = detailReservationItems(current.editData).filter(
				(_: AnyRecord, itemIndex: number) => itemIndex !== index,
			)
			const nextItems = items.length ? items : [blankQuoteItem()]
			return {
				...current,
				editData: {
					...current.editData,
					service: nextItems[0]?.service ?? '',
					items: nextItems,
				},
			}
		})
	}

	function openConsumptionForOrder(
		order: AnyRecord,
		defaultDay?: string | null,
	) {
		if (!canViewEconomy) return
		setConsumptionForm({
			mode: 'direct',
			work_order: String(order.id),
			material: '',
			open_unit: '',
			consumed_at: defaultDay || selectedDay,
			quantity: '',
			observations: '',
		})
		setConsumeForOrder(order)
	}

	function openPaymentForOrder(order: AnyRecord) {
		if (!canViewEconomy) return
		setPaymentForOrder(order)
		setAgendaPaymentForm(
			blankAgendaPaymentForm(
				String(order.id),
				fullPaymentAmountForOrder(order),
			),
		)
	}

	function openReservationFromQuote(quote: AnyRecord) {
		setReservationForQuote(quote)
		setQuoteReservationForm({
			quote: String(quote.id),
			vehicle: quote.vehicle ? String(quote.vehicle) : '',
			day: quote.reservation_day ?? '',
			start_time: quote.reservation_start_time
				? String(quote.reservation_start_time).slice(0, 5)
				: '',
			exit_time: '',
		})
	}

	async function createReservationFromQuote(quote: AnyRecord) {
		if (!quote.vehicle || !quote.reservation_day) {
			openReservationFromQuote(quote)
			return
		}
		await runAction(
			() =>
				apiFetch(`/quotes/${quote.id}/reservation/`, {
					method: 'POST',
					body: JSON.stringify({
						day: quote.reservation_day,
						start_time: useReservationTimes
							? quote.reservation_start_time || null
							: null,
						exit_time: null,
						vehicle: quote.vehicle,
					}),
				}),
			{
				flashTarget: (created: AnyRecord) =>
					recordFlashKey('reservation', created?.id),
				successTitle: entityFeedbackTitle('reservation', 'created'),
			},
		)
	}

	async function saveReservationFromQuote(event: FormEvent) {
		event.preventDefault()
		if (!reservationForQuote) return
		await runAction(
			async () => {
				const created = await apiFetch<AnyRecord>(
					`/quotes/${reservationForQuote.id}/reservation/`,
					{
						method: 'POST',
						body: JSON.stringify({
							day: quoteReservationForm.day,
							start_time: useReservationTimes
								? quoteReservationForm.start_time || null
								: null,
							exit_time: useReservationTimes
								? quoteReservationForm.exit_time || null
								: null,
							vehicle: quoteReservationForm.vehicle || null,
						}),
					},
				)
				quoteReservationExit.close()
				return created
			},
			{
				flashTarget: (created: AnyRecord) =>
					recordFlashKey('reservation', created?.id),
				successTitle: entityFeedbackTitle('reservation', 'created'),
			},
		)
	}

	function editableDetailKind(kind: string) {
		if (!canViewEconomy && detailRequiresEconomy(kind)) return false
		return [
			'customer',
			'vehicle',
			'service',
			'reservation',
			'workorder',
			'material',
			'supplier',
			'material-purchase',
			'material-consumption',
			'tool',
			'quote',
			'cash-movement',
			'debt',
			'debt-payment',
		].includes(kind)
	}

	function cleanDetailPayload(kind: string, data: AnyRecord) {
		const allowed: Record<string, string[]> = {
			customer: [
				'name',
				'phone',
				'email',
				'birthday_month',
				'birthday_day',
				'notes',
			],
			vehicle: [
				'customer',
				'license_plate',
				'brand',
				'model',
				'color',
				'notes',
			],
			service: serviceDetailPayloadFields,
			reservation: [
				'customer',
				'vehicle',
				'service',
				'items',
				'day',
				'exit_day',
				'start_time',
				'exit_time',
				'status',
				'notes',
			],
			workorder: [
				'customer',
				'vehicle',
				'service',
				'status',
				'total_amount',
				'internal_notes',
				'estimated_delivery_at',
			],
			material: ['name', 'unit', 'stock_quantity', 'notes', 'is_active'],
			supplier: [
				'name',
				'legal_name',
				'category',
				'tax_condition',
				'website',
				'contact_name',
				'phone',
				'email',
				'tax_id',
				'address',
				'notes',
				'is_active',
			],
			tool: [
				'name',
				'quantity',
				'status',
				'unit_value',
				'purchased_at',
				'notes',
				'is_active',
			],
			'material-purchase': [
				'material',
				'purchased_at',
				'quantity',
				'total_cost',
				'affects_cash',
				'observations',
			],
			'material-consumption': [
				'work_order',
				'material',
				'consumed_at',
				'quantity',
				'observations',
			],
			quote: [
				'status',
				'observations',
				'valid_until',
				'tax_rate',
				'discount_rate',
				'terms',
				'payment_instructions',
			],
			'cash-movement': [
				'movement_type',
				'category',
				'subcategory',
				'amount',
				'occurred_at',
				'adjusts_closed_day',
				'description',
			],
			debt: [
				'concept',
				'creditor',
				'supplier',
				'principal_amount',
				'origin_date',
				'due_date',
				'expense_category',
				'expense_subcategory',
				'notes',
			],
			'debt-payment': ['debt', 'amount', 'paid_at', 'method', 'notes'],
		}
		const payload = Object.fromEntries(
			(allowed[kind] ?? [])
				.filter((key) => key in data)
				.map((key) => [key, data[key]]),
		)
		if (kind === 'reservation') {
			payload.start_time = payload.start_time || null
			payload.exit_day = payload.exit_day || null
			payload.exit_time = payload.exit_time || null
			payload.items = serviceLinePayload(payload.items ?? [])
			payload.service = payload.items[0]?.service ?? payload.service
		}
		if (kind === 'quote') {
			payload.valid_until = payload.valid_until || null
			payload.tax_rate = payload.tax_rate || '0'
			payload.discount_rate = payload.discount_rate || '0'
		}
		if (kind === 'customer') {
			payload.birthday_month = payload.birthday_month
				? Number(payload.birthday_month)
				: null
			payload.birthday_day = payload.birthday_day
				? Number(payload.birthday_day)
				: null
		}
		if (kind === 'workorder') {
			payload.estimated_delivery_at = payload.estimated_delivery_at || null
		}
		if (kind === 'tool') {
			payload.purchased_at = payload.purchased_at || null
		}
		if (kind === 'debt') {
			payload.due_date = payload.due_date || null
			payload.supplier = payload.supplier || null
		}
		return payload
	}

	function detailEndpoint(kind: string, id: string | number) {
		const paths: Record<string, string> = {
			customer: `/customers/${id}/`,
			vehicle: `/vehicles/${id}/`,
			service: `/services/${id}/`,
			reservation: `/reservations/${id}/`,
			workorder: `/work-orders/${id}/`,
			material: `/materials/${id}/`,
			supplier: `/suppliers/${id}/`,
			tool: `/tools/${id}/`,
			'material-purchase': `/material-purchases/${id}/`,
			'material-consumption': `/material-consumptions/${id}/`,
			quote: `/quotes/${id}/`,
			'cash-movement': `/cash-movements/${id}/`,
			debt: `/debts/${id}/`,
			'debt-payment': `/debt-payments/${id}/`,
		}
		return paths[kind]
	}

	function normalizedDetailPayload(kind: string, data: AnyRecord) {
		return Object.fromEntries(
			Object.entries(cleanDetailPayload(kind, data)).map(([key, value]) => {
				if (value === null || value === undefined) return [key, '']
				if (key === 'items') return [key, JSON.stringify(value)]
				if (key === 'start_time' || key === 'exit_time') {
					return [key, String(value).slice(0, 5)]
				}
				if (key === 'estimated_delivery_at') {
					return [key, String(value).slice(0, 16)]
				}
				if (key === 'occurred_at') return [key, String(value).slice(0, 16)]
				return [key, String(value)]
			}),
		)
	}

	function isDetailDirty() {
		if (!detailModal) return false
		return (
			JSON.stringify(
				normalizedDetailPayload(detailModal.kind, detailModal.editData),
			) !==
			JSON.stringify(
				normalizedDetailPayload(detailModal.kind, detailModal.data),
			)
		)
	}

	async function saveDetailEdit(event: FormEvent) {
		event.preventDefault()
		if (!detailModal) return
		if (!canViewEconomy && detailRequiresEconomy(detailModal.kind)) return
		if (!isDetailDirty()) return
		const path = detailEndpoint(detailModal.kind, detailModal.data.id)
		if (!path) return
		const currentDetail = detailModal
		await runAction(async () => {
			await apiFetch(path, {
				method: 'PATCH',
				body: JSON.stringify(
					cleanDetailPayload(detailModal.kind, detailModal.editData),
				),
			})
			detailExit.close()
		}, {
			flashTarget: recordFlashKey(
				currentDetail.kind,
				currentDetail.data.id,
			),
			successTitle: entityFeedbackTitle(currentDetail.kind, 'updated'),
			undo: undoPatchRecord(
				path,
				cleanDetailPayload(currentDetail.kind, currentDetail.data),
			),
		})
	}

	async function deleteDetail() {
		if (!detailModal) return
		const path = detailEndpoint(detailModal.kind, detailModal.data.id)
		if (!path) return
		const currentDetail = detailModal
		await runAction(async () => {
			await apiFetch(path, { method: 'DELETE' })
			detailExit.close()
		}, {
			successTitle: entityFeedbackTitle(currentDetail.kind, 'deleted'),
			...('is_active' in currentDetail.data
				? {
						undo: undoRestoreActiveRecord(
							currentDetail.kind,
							currentDetail.data,
						),
				  }
				: {}),
		})
	}

	function renderDetailEditActions(beforeSubmit?: ReactNode) {
		if (!detailModal) return null
		const canDelete = Boolean(
			detailModal.data.id &&
				detailEndpoint(detailModal.kind, detailModal.data.id),
		)
		return (
			<div className="modal-actions split">
				{canDelete ? (
					<button
						type="button"
						className="danger"
						onClick={deleteDetail}
					>
						<Trash2 size={16} />
						Eliminar
					</button>
				) : (
					<span />
				)}
				<div className="modal-actions detail-save-actions">
					{beforeSubmit}
					<button className="primary" disabled={!isDetailDirty()}>
						Editar
					</button>
				</div>
			</div>
		)
	}

	function renderDetailEditForm() {
		if (!detailModal) return null
		const data = detailModal.editData
		const vehicleOptionsForDetail =
			detailModal.kind === 'reservation' || detailModal.kind === 'workorder'
				? vehicleOptions.filter(
						(option) =>
							!data.customer ||
							String(
								vehicles.find(
									(item) => String(item.id) === option.value,
								)?.customer,
							) === String(data.customer),
					)
				: vehicleOptions

		if (detailModal.kind === 'customer') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<Field label="Nombre">
						<input
							data-focus-key="detail.customer.name"
							required
							value={data.name ?? ''}
							onChange={(event) =>
								updateDetailEdit({ name: event.target.value })
							}
							onKeyDown={focusNextOnEnter('detail.customer.phone')}
						/>
					</Field>
					<Field label="Telefono">
						<input
							data-focus-key="detail.customer.phone"
							value={data.phone ?? ''}
							onChange={(event) =>
								updateDetailEdit({ phone: event.target.value })
							}
							onKeyDown={focusNextOnEnter('detail.customer.email')}
						/>
					</Field>
					<Field label="Email">
						<input
							data-focus-key="detail.customer.email"
							type="email"
							value={data.email ?? ''}
							onChange={(event) =>
								updateDetailEdit({ email: event.target.value })
							}
							onKeyDown={focusNextOnEnter('detail.customer.birthday_day')}
						/>
					</Field>
					<BirthdayFields
						day={data.birthday_day}
						month={data.birthday_month}
						dayFocusKey="detail.customer.birthday_day"
						monthFocusKey="detail.customer.birthday_month"
						onDayChange={(value) => updateDetailEdit({ birthday_day: value })}
						onMonthChange={(value) =>
							updateDetailEdit({ birthday_month: value })
						}
						onDayKeyDown={focusNextOnEnter('detail.customer.birthday_month')}
						onMonthKeyDown={focusNextOnEnter('detail.customer.notes')}
					/>
					{data.birthday_label ? renderBirthdayBadge(data) : null}
					<Field label="Notas">
						<textarea
							data-focus-key="detail.customer.notes"
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderCustomerHistory()}
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'vehicle') {
			const detailVehicleBrandOptions = selectOptionsFromValues(
				vehicleBrandOptions(vehicleBrandValues),
				data.brand,
			)
			const detailVehicleModelOptions = selectOptionsFromValues(
				vehicleModelOptionsForBrand(data.brand, vehicles, [data.model]),
				data.model,
			)

			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Cliente"
						value={String(data.customer ?? '')}
						options={customerOptions}
						focusKey="detail.vehicle.customer"
						onChange={(value) => {
							updateDetailEdit({ customer: value })
							focusField('detail.vehicle.brand')
						}}
					/>
					<div className="form-row">
						<SearchSelect
							label="Marca"
							value={String(data.brand ?? '')}
							options={detailVehicleBrandOptions}
							placeholder="Sin marca"
							focusKey="detail.vehicle.brand"
							onChange={updateDetailVehicleBrand}
							onCreate={updateDetailVehicleBrand}
							createLabel={(value) => `Crear marca "${value}"`}
						/>
						<SearchSelect
							label="Modelo"
							value={String(data.model ?? '')}
							options={detailVehicleModelOptions}
							placeholder={data.brand ? 'Sin modelo' : 'Elegir marca'}
							disabled={!data.brand && !data.model}
							focusKey="detail.vehicle.model"
							onChange={(value) => {
								updateDetailEdit({ model: value })
								focusField('detail.vehicle.color')
							}}
							onCreate={(value) => {
								updateDetailEdit({ model: value })
								focusField('detail.vehicle.color')
							}}
							createLabel={(value) => `Crear modelo "${value}"`}
						/>
					</div>
					<div className="form-row">
						<Field label="Color">
							<input
								data-focus-key="detail.vehicle.color"
								value={data.color ?? ''}
								onChange={(event) =>
									updateDetailEdit({ color: event.target.value })
								}
								onKeyDown={focusNextOnEnter(
									'detail.vehicle.license_plate',
								)}
							/>
						</Field>
						<Field label="Patente">
							<input
								data-focus-key="detail.vehicle.license_plate"
								value={data.license_plate ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										license_plate: event.target.value,
									})
								}
								onKeyDown={focusNextOnEnter('detail.vehicle.notes')}
							/>
						</Field>
					</div>
					<Field label="Notas">
						<textarea
							data-focus-key="detail.vehicle.notes"
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'service') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<div className="form-row">
						<Field label="Nombre">
							<input
								required
								value={data.name ?? ''}
								onChange={(event) =>
									updateDetailEdit({ name: event.target.value })
								}
							/>
						</Field>
						<ServiceIconPicker
							value={String(data.icon ?? '')}
							onChange={(icon) => updateDetailEdit({ icon })}
						/>
					</div>
					<SearchSelect
						label="Tipo"
						value={String(data.service_type ?? '')}
						options={serviceFormTypeOptions}
						onChange={(value) =>
							updateDetailEdit({ service_type: value })
						}
					/>
					<div className="form-row">
						<Field label="Precio base">
							<input
								required
								type="number"
								min="0"
								value={data.base_price ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										base_price: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Duracion min.">
							<input
								type="number"
								min="1"
								value={data.estimated_duration_minutes ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										estimated_duration_minutes:
											event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<Field label="Notas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'material') {
			const usage = materialUsageSummary(data)
			const openUnits = materialOpenUnitRows(data)
			const unitValue = materialUnitValue(data)
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<Field label="Nombre">
						<input
							required
							value={data.name ?? ''}
							onChange={(event) =>
								updateDetailEdit({ name: event.target.value })
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Unidad">
							<input
								required
								value={data.unit ?? ''}
								onChange={(event) =>
									updateDetailEdit({ unit: event.target.value })
								}
							/>
						</Field>
						<Field label="Stock">
							<input
								type="number"
								min="0"
								value={data.stock_quantity ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										stock_quantity: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<div className="material-summary">
						<div className="material-kpi">
							<span>Valor por unidad</span>
							<strong>{money(unitValue)}</strong>
						</div>
						<div className="material-kpi">
							<span>Stock valorizado</span>
							<strong>{money(materialStockValue(data))}</strong>
						</div>
						<div className="material-kpi">
							<span>Usos</span>
							<strong>{usage.count}</strong>
						</div>
						<div className="material-kpi">
							<span>Costo usado</span>
							<strong>{money(usage.totalCost)}</strong>
						</div>
					</div>
					<section className="linked-records">
						<div className="linked-records-head">
							<strong>Usos del material</strong>
							<span>
								{quantity(usage.totalQuantity, data.unit)} usados
							</span>
						</div>
						{usage.rows.length ? (
							usage.rows.map((item) => (
								<button
									type="button"
									className="linked-record"
									key={item.id}
									onClick={() =>
										openDetailModal(
											'Consumo de material',
											item,
										)
									}
								>
									<span>
										Trabajo asociado -{' '}
										{item.work_order_label ?? item.consumed_at}
									</span>
									<strong>
										{quantity(item.quantity, data.unit)} -{' '}
										{money(item.estimated_total_cost)}
									</strong>
									<small>{item.consumed_at}</small>
								</button>
							))
						) : (
							<div className="info-note">
								Sin usos registrados para este material.
							</div>
						)}
					</section>
					<section className="linked-records">
						<div className="linked-records-head">
							<strong>Unidades abiertas</strong>
							<span>
								{numberValue(data.open_units_active_count)} activas
							</span>
						</div>
						{openUnits.length ? (
							openUnits.map((item) => (
								<button
									type="button"
									className="linked-record"
									key={item.id}
									onClick={() =>
										openDetailModal('Unidad abierta', item)
									}
								>
									<span>
										{item.status === 'open'
											? 'Abierta'
											: 'Finalizada'}{' '}
										- {item.opened_at}
									</span>
									<strong>
										{item.consumptions_count ?? 0} usos -{' '}
										{item.work_orders_count ?? 0} trabajos
									</strong>
									<small>
										{item.duration_days
											? `${item.duration_days} dias`
											: 'En uso'}
									</small>
								</button>
							))
						) : (
							<div className="info-note">
								Sin unidades abiertas para este material.
							</div>
						)}
					</section>
					<Field label="Notas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'supplier') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<Field label="Nombre visible">
						<input
							required
							list="supplier-name-options"
							value={data.name ?? ''}
							onChange={(event) =>
								updateDetailEdit({ name: event.target.value })
							}
						/>
					</Field>
					<Field label="Razon social">
						<input
							list="supplier-legal-name-options"
							value={data.legal_name ?? ''}
							onChange={(event) =>
								updateDetailEdit({ legal_name: event.target.value })
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Rubro">
							<input
								list="supplier-category-options"
								value={data.category ?? ''}
								onChange={(event) =>
									updateDetailEdit({ category: event.target.value })
								}
							/>
						</Field>
						<Field label="Condicion fiscal">
							<input
								list="supplier-tax-condition-options"
								value={data.tax_condition ?? ''}
								onChange={(event) =>
									updateDetailEdit({ tax_condition: event.target.value })
								}
							/>
						</Field>
					</div>
					<div className="form-row">
						<Field label="Contacto principal">
							<input
								value={data.contact_name ?? ''}
								onChange={(event) =>
									updateDetailEdit({ contact_name: event.target.value })
								}
							/>
						</Field>
						<Field label="Telefono">
							<input
								value={data.phone ?? ''}
								onChange={(event) =>
									updateDetailEdit({ phone: event.target.value })
								}
							/>
						</Field>
					</div>
					<div className="form-row">
						<Field label="Email">
							<input
								type="email"
								value={data.email ?? ''}
								onChange={(event) =>
									updateDetailEdit({ email: event.target.value })
								}
							/>
						</Field>
						<Field label="CUIT / tax id">
							<input
								value={data.tax_id ?? ''}
								onChange={(event) =>
									updateDetailEdit({ tax_id: event.target.value })
								}
							/>
						</Field>
					</div>
					<Field label="Website">
						<input
							type="url"
							value={data.website ?? ''}
							onChange={(event) =>
								updateDetailEdit({ website: event.target.value })
							}
						/>
					</Field>
					<Field label="Direccion">
						<input
							value={data.address ?? ''}
							onChange={(event) =>
								updateDetailEdit({ address: event.target.value })
							}
						/>
					</Field>
					<label>
						<input
							type="checkbox"
							checked={data.is_active !== false}
							onChange={(event) =>
								updateDetailEdit({ is_active: event.target.checked })
							}
						/>
						Proveedor activo
					</label>
					<Field label="Notas internas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'reservation') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Cliente"
						value={String(data.customer ?? '')}
						options={customerOptions}
						focusKey="detail.reservation.customer"
						onChange={(value) => updateDetailCustomer('reservation', value)}
					/>
					<SearchSelect
						label="Vehiculo"
						value={String(data.vehicle ?? '')}
						options={vehicleOptionsForDetail}
						focusKey="detail.reservation.vehicle"
						onChange={(value) => {
							updateDetailEdit({ vehicle: value })
							focusField('detail.reservation.service.0', true)
						}}
					/>
					<div className="quote-lines">
						<div className="quote-lines-head">
							<h3>Servicios</h3>
							<button
								type="button"
								className="ghost"
								onClick={addDetailReservationItem}
							>
								<Plus size={16} />
								Agregar servicio
							</button>
						</div>
						{detailReservationItems(data).map(
							(item: AnyRecord, index: number) => {
								const lineTotal =
									Number(item.quantity || 0) *
									Number(item.unit_price || 0)
								return (
									<div className="quote-line" key={index}>
										<SearchSelect
											label="Servicio"
											value={String(item.service ?? '')}
											options={serviceOptions}
											focusKey={`detail.reservation.service.${index}`}
											onChange={(value) =>
												selectDetailReservationService(index, value)
											}
										/>
										<div className="quote-line-grid">
											<Field label="Cantidad">
												<input
													type="number"
													min="1"
													value={item.quantity ?? '1'}
													onChange={(event) =>
														updateDetailReservationItem(index, {
															quantity: event.target.value,
														})
													}
												/>
											</Field>
											<Field label="Precio">
												<input
													type="number"
													min="0"
													value={item.unit_price ?? ''}
													onChange={(event) =>
														updateDetailReservationItem(index, {
															unit_price: event.target.value,
														})
													}
												/>
											</Field>
											<div className="line-total">
												<span>Total</span>
												<strong>{money(lineTotal)}</strong>
											</div>
										</div>
										{detailReservationItems(data).length > 1 ? (
											<button
												type="button"
												className="danger"
												onClick={() => removeDetailReservationItem(index)}
											>
												Quitar
											</button>
										) : null}
									</div>
								)
							},
						)}
					</div>
					<div className="form-row">
						<Field label="Fecha de ingreso">
							<input
								data-focus-key="detail.reservation.day"
								type="date"
								value={data.day ?? ''}
								onChange={(event) =>
									updateDetailEdit({ day: event.target.value })
								}
								onKeyDown={focusNextOnEnter(
									'detail.reservation.exit_day',
								)}
							/>
						</Field>
						<Field label="Fecha de egreso">
							<input
								data-focus-key="detail.reservation.exit_day"
								type="date"
								value={data.exit_day ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										exit_day: event.target.value,
									})
								}
								onKeyDown={focusNextOnEnter(
									useReservationTimes
										? 'detail.reservation.start_time'
										: 'detail.reservation.status',
									!useReservationTimes,
								)}
							/>
						</Field>
					</div>
					{useReservationTimes ? (
						<div className="form-row">
							<Field label="Hora de ingreso">
								<input
									data-focus-key="detail.reservation.start_time"
									type="time"
									value={String(data.start_time ?? '').slice(0, 5)}
									onChange={(event) =>
										updateDetailEdit({
											start_time: event.target.value,
										})
									}
									onKeyDown={focusNextOnEnter(
										'detail.reservation.exit_time',
									)}
								/>
							</Field>
							<Field label="Hora de egreso">
								<input
									data-focus-key="detail.reservation.exit_time"
									type="time"
									value={String(data.exit_time ?? '').slice(0, 5)}
									onChange={(event) =>
										updateDetailEdit({
											exit_time: event.target.value,
										})
									}
									onKeyDown={focusNextOnEnter(
										'detail.reservation.status',
										true,
									)}
								/>
							</Field>
						</div>
					) : null}
					<SearchSelect
						label="Estado"
						value={String(data.status ?? '')}
						options={Object.entries(reservationLabels).map(
							([value, label]) => ({ value, label }),
						)}
						focusKey="detail.reservation.status"
						onChange={(value) => {
							updateDetailEdit({ status: value })
							focusField('detail.reservation.notes')
						}}
					/>
					<Field label="Notas">
						<textarea
							data-focus-key="detail.reservation.notes"
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{reservationShowsWork(data, data.work_order)
						? renderWorkOrderSummary(data.work_order, {
								showDetailAction: true,
							})
						: null}
					{renderDetailEditActions(
						canViewEconomy ? (
							<button
								type="button"
								className="ghost"
								onClick={() => createQuoteFromReservation(detailModal.data)}
							>
								<FileText size={16} />
								Crear cotizacion
							</button>
						) : null,
					)}
				</form>
			)
		}

		if (detailModal.kind === 'workorder') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Cliente"
						value={String(data.customer ?? '')}
						options={customerOptions}
						focusKey="detail.workorder.customer"
						onChange={(value) => updateDetailCustomer('workorder', value)}
					/>
					<SearchSelect
						label="Vehiculo"
						value={String(data.vehicle ?? '')}
						options={vehicleOptionsForDetail}
						focusKey="detail.workorder.vehicle"
						onChange={(value) => {
							updateDetailEdit({ vehicle: value })
							focusField('detail.workorder.service', true)
						}}
					/>
					<SearchSelect
						label="Servicio"
						value={String(data.service ?? '')}
						options={serviceOptions}
						focusKey="detail.workorder.service"
						onChange={(value) => {
							const service = services.find(
								(item) => String(item.id) === value,
							)
							const patch: AnyRecord = {
								service: value,
							}
							if (canViewEconomy) {
								patch.total_amount =
									service?.base_price ?? data.total_amount
							}
							updateDetailEdit(patch)
							focusField('detail.workorder.status', true)
						}}
					/>
					<div className="form-row">
						<SearchSelect
							label="Estado"
							value={String(data.status ?? '')}
							options={Object.entries(orderLabels).map(
								([value, label]) => ({ value, label }),
							)}
							focusKey="detail.workorder.status"
							onChange={(value) => {
								updateDetailEdit({ status: value })
								focusField(
									canViewEconomy
										? 'detail.workorder.total_amount'
										: 'detail.workorder.estimated_delivery_at',
								)
							}}
						/>
						{canViewEconomy ? (
							<Field label="Total">
								<input
									data-focus-key="detail.workorder.total_amount"
									type="number"
									min="0"
									value={data.total_amount ?? ''}
									onChange={(event) =>
										updateDetailEdit({
											total_amount: event.target.value,
										})
									}
									onKeyDown={focusNextOnEnter(
										'detail.workorder.estimated_delivery_at',
									)}
								/>
							</Field>
						) : null}
					</div>
					<Field label="Entrega estimada">
						<input
							data-focus-key="detail.workorder.estimated_delivery_at"
							type="datetime-local"
							value={String(data.estimated_delivery_at ?? '').slice(
								0,
								16,
							)}
							onChange={(event) =>
								updateDetailEdit({
									estimated_delivery_at: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter(
								'detail.workorder.internal_notes',
							)}
						/>
					</Field>
					<Field label="Notas internas">
						<textarea
							data-focus-key="detail.workorder.internal_notes"
							value={data.internal_notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									internal_notes: event.target.value,
								})
							}
						/>
					</Field>
					{canViewEconomy && detailModal.data.id ? (
						<div className="modal-actions">
							<button
								type="button"
								className="ghost"
								onClick={() =>
									openConsumptionForOrder(
										detailModal.data,
										detailModal.data._agenda_day ?? selectedDay,
									)
								}
							>
								<Package size={16} />
								Consumir material
							</button>
						</div>
					) : null}
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'quote') {
			const quoteCode = data.public_code ?? `#${data.id}`
			const quoteStatusLabel =
				data.status_label ??
				quoteStatusLabels[String(data.status ?? '')] ??
				String(data.status ?? '')
			const quoteHasReservation = Boolean(
				data.has_reservation ?? data.reservation,
			)

			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<div className="quote-detail-summary">
						<div>
							<strong>Cotizacion {quoteCode}</strong>
							<span>
								{data.customer_name} - {quoteStatusLabel}
							</span>
						</div>
						<div className="record-sub">
							{data.vehicle_label || 'Sin vehiculo'} - {money(data.total)}
						</div>
						<div className="quote-detail-meta">
							<span>
								Validez:{' '}
								{data.valid_until
									? formatDateLabel(data.valid_until)
									: 'Sin fecha'}
							</span>
							<span>
								Reserva vinculada: {quoteHasReservation ? 'Si' : 'No'}
							</span>
							{data.sent_at ? (
								<span>Enviada: {formatDateLabel(data.sent_at)}</span>
							) : null}
						</div>
						{data.reservation_day ? (
							<div className="record-sub">
								Reserva tentativa: {data.reservation_day}
								{quoteTentativeTimeLabel(data.reservation_start_time)}
							</div>
						) : (
							<div className="record-sub">Cotizacion libre sin fecha.</div>
						)}
						{data.items?.length ? (
							<div className="quote-item-summary">
								{data.items.map((quoteItem: AnyRecord) => (
									<div
										className="quote-item-summary-row"
										key={quoteItem.id ?? `${data.id}-${quoteItem.service}`}
									>
										<strong>
											{serviceDisplayName({
												service_icon: quoteItem.service_icon,
												service_name:
													quoteItem.service_name ?? quoteItem.description,
											})}
										</strong>
										<span>
											{quoteItem.quantity} x {money(quoteItem.unit_price)} ={' '}
											{money(quoteItem.line_total)}
										</span>
										{quoteItem.service_notes ? (
											<span>{quoteItem.service_notes}</span>
										) : null}
									</div>
								))}
							</div>
						) : null}
					</div>
					<SearchSelect
						label="Estado"
						value={String(data.status ?? '')}
						options={[
							{ value: 'draft', label: 'Sin enviar' },
							{ value: 'sent', label: 'Enviado' },
							{ value: 'accepted', label: 'Aceptada' },
							{ value: 'rejected', label: 'Rechazada' },
						]}
						onChange={(value) => updateDetailEdit({ status: value })}
					/>
					<div className="form-row">
						<Field label="Validez">
							<input
								type="date"
								value={data.valid_until ?? ''}
								onChange={(event) =>
									updateDetailEdit({ valid_until: event.target.value })
								}
							/>
						</Field>
						<Field label="Descuento %">
							<input
								min="0"
								max="100"
								step="0.01"
								type="number"
								value={data.discount_rate ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										discount_rate: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="IVA %">
							<input
								min="0"
								max="100"
								step="0.01"
								type="number"
								value={data.tax_rate ?? ''}
								onChange={(event) =>
									updateDetailEdit({ tax_rate: event.target.value })
								}
							/>
						</Field>
					</div>
					<div className="quote-total quote-total--breakdown">
						<span>Subtotal {money(data.subtotal)}</span>
						<span>Descuento {money(data.discount_amount)}</span>
						<span>Base imponible {money(data.taxable_amount)}</span>
						<span>IVA {money(data.tax_amount)}</span>
						<strong>Total {money(data.total)}</strong>
					</div>
					<Field label="Observaciones">
						<textarea
							value={data.observations ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									observations: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Terminos">
						<textarea
							value={data.terms ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									terms: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Instrucciones de pago">
						<textarea
							value={data.payment_instructions ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									payment_instructions: event.target.value,
								})
							}
						/>
					</Field>
					<div className="modal-actions">
						<button
							type="button"
							className="ghost"
							onClick={() => downloadQuotePdf(data)}
						>
							<FileText size={16} />
							Bajar PDF
						</button>
						{quoteLaneStatus(data) === 'draft' ? (
							<button
								type="button"
								className="primary"
								onClick={() => downloadQuotePdfAndMarkSent(data)}
							>
								<FileText size={16} />
								Bajar y marcar enviado
							</button>
						) : null}
					</div>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'cash-movement') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Tipo"
						value={String(data.movement_type ?? '')}
						options={[
							{ value: 'income', label: 'Ingreso' },
							{ value: 'expense', label: 'Egreso' },
						]}
						onChange={(value) =>
							updateDetailEdit({ movement_type: value })
						}
					/>
					<div className="form-row">
						<SearchSelect
							label="Categoria"
							value={String(data.category ?? '')}
							options={
								data.movement_type === 'income'
									? selectOptionsFromValues(
											cashIncomeCategoryValues,
											data.category,
										)
									: selectOptionsFromValues(
											cashExpenseCategoryValues,
											data.category,
										)
							}
							onChange={(value) => {
								updateDetailEdit({
									category: value,
									subcategory:
										data.movement_type === 'expense'
											? validExpenseSubcategoryForCategory(
													value,
													data.subcategory,
												)
											: '',
								})
							}}
							onCreate={
								data.movement_type === 'expense'
									? (value) =>
											updateDetailEdit({
												category: value,
												subcategory: '',
											})
									: undefined
							}
							createLabel={(value) => `Crear categoria "${value}"`}
						/>
						<Field label="Importe">
							<input
								required
								type="number"
								min="0"
								value={data.amount ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										amount: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					{data.movement_type === 'expense' ? (
						<SearchSelect
							label="Subcategoria"
							value={String(data.subcategory ?? '')}
							options={selectOptionsFromValues(
								mergeStringValues(
									expenseSubcategoriesForCategory(
										expenseCategoryTree,
										data.category,
									),
									uniqueValues(
										cashMovements.filter(
											(item: AnyRecord) =>
												String(item.category ?? '') ===
												String(data.category ?? ''),
										),
										'subcategory',
									),
								),
								data.subcategory,
							)}
							placeholder={
								data.category ? 'Subcategoria' : 'Elegir categoria'
							}
							disabled={!data.category}
							onChange={(value) =>
								updateDetailEdit({
									subcategory: value,
								})
							}
							onCreate={(value) => {
								updateExpenseCategoryTreeLocal(data.category, value)
								updateDetailEdit({ subcategory: value })
							}}
							createLabel={(value) => `Crear subcategoria "${value}"`}
						/>
					) : null}
					<Field label="Fecha">
						<input
							type="datetime-local"
							value={String(data.occurred_at ?? '').slice(0, 16)}
							onChange={(event) =>
								updateDetailEdit({
									occurred_at: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Corrige cierre">
						<input
							type="date"
							value={data.adjusts_closed_day ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									adjusts_closed_day: event.target.value || null,
									category: event.target.value
										? 'Ajustes'
										: data.category,
									subcategory: event.target.value
										? 'Ajuste de cierre'
										: data.subcategory,
								})
							}
						/>
					</Field>
					<Field label="Detalle">
						<textarea
							value={data.description ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									description: event.target.value,
								})
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'debt') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<Field label="Concepto">
						<input
							required
							list="debt-concept-options"
							value={data.concept ?? ''}
							onChange={(event) =>
								updateDetailEdit({ concept: event.target.value })
							}
						/>
					</Field>
					<Field label="Acreedor">
						<input
							list="debt-creditor-options"
							value={data.creditor ?? ''}
							onChange={(event) =>
								updateDetailEdit({ creditor: event.target.value })
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Total deuda">
							<input
								required
								type="number"
								min="0"
								value={data.principal_amount ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										principal_amount: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Origen">
							<input
								type="date"
								value={data.origin_date ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										origin_date: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<Field label="Fecha limite">
						<input
							type="date"
							value={data.due_date ?? ''}
							onChange={(event) =>
								updateDetailEdit({ due_date: event.target.value })
							}
						/>
					</Field>
					<SearchSelect
						label="Proveedor vinculado"
						value={String(data.supplier ?? '')}
						options={supplierOptions}
						placeholder="Sin proveedor"
						onChange={(value) => {
							const supplier = suppliers.find(
								(item) => String(item.id) === String(value),
							)
							updateDetailEdit({
								supplier: value || null,
								creditor: supplier?.name ?? data.creditor,
							})
						}}
					/>
					<div className="form-row">
						<SearchSelect
							label="Categoria del egreso"
							value={String(data.expense_category ?? '')}
							options={selectOptionsFromValues(
								cashExpenseCategoryValues,
								data.expense_category,
							)}
							placeholder="Categoria de egreso"
							onChange={(value) =>
								updateDetailEdit({
									expense_category: value,
									expense_subcategory:
										validExpenseSubcategoryForCategory(
											value,
											data.expense_subcategory,
										),
								})
							}
							onCreate={(value) =>
								updateDetailEdit({
									expense_category: value,
									expense_subcategory: '',
								})
							}
							createLabel={(value) => `Crear categoria "${value}"`}
						/>
						<SearchSelect
							label="Subcategoria"
							value={String(data.expense_subcategory ?? '')}
							options={selectOptionsFromValues(
								mergeStringValues(
									expenseSubcategoriesForCategory(
										expenseCategoryTree,
										data.expense_category,
									),
									uniqueValues(
										debts.filter(
											(item: AnyRecord) =>
												String(item.expense_category ?? '') ===
												String(data.expense_category ?? ''),
										),
										'expense_subcategory',
									),
								),
								data.expense_subcategory,
							)}
							placeholder={
								data.expense_category
									? 'Subcategoria'
									: 'Elegir categoria'
							}
							disabled={!data.expense_category}
							onChange={(value) =>
								updateDetailEdit({
									expense_subcategory: value,
								})
							}
							onCreate={(value) => {
								updateExpenseCategoryTreeLocal(
									data.expense_category,
									value,
								)
								updateDetailEdit({ expense_subcategory: value })
							}}
							createLabel={(value) => `Crear subcategoria "${value}"`}
						/>
					</div>
					<div className="material-summary">
						<div className="material-kpi">
							<span>Pagado</span>
							<strong>{money(data.total_paid)}</strong>
						</div>
						<div className="material-kpi">
							<span>Saldo</span>
							<strong>{money(data.balance_due)}</strong>
						</div>
						<div className="material-kpi">
							<span>Estado</span>
							<strong>
								{debtStatusLabels[data.status] ?? data.status}
							</strong>
						</div>
					</div>
					<Field label="Notas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'debt-payment') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Deuda"
						value={String(data.debt ?? '')}
						options={allDebtOptions}
						onChange={(value) => updateDetailEdit({ debt: value })}
					/>
					<div className="form-row">
						<Field label="Importe">
							<input
								required
								type="number"
								min="0"
								value={data.amount ?? ''}
								onChange={(event) =>
									updateDetailEdit({ amount: event.target.value })
								}
							/>
						</Field>
						<Field label="Fecha pago">
							<input
								type="date"
								value={data.paid_at ?? ''}
								onChange={(event) =>
									updateDetailEdit({ paid_at: event.target.value })
								}
							/>
						</Field>
					</div>
					<SearchSelect
						label="Medio"
						value={String(data.method ?? DEFAULT_PAYMENT_METHOD)}
						options={Object.entries(debtPaymentMethodLabels).map(
							([value, label]) => ({ value, label }),
						)}
						onChange={(value) =>
							updateDetailEdit({
								method: value || DEFAULT_PAYMENT_METHOD,
							})
						}
					/>
					<Field label="Notas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'tool') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<Field label="Nombre">
						<input
							required
							value={data.name ?? ''}
							onChange={(event) =>
								updateDetailEdit({ name: event.target.value })
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Cantidad">
							<input
								required
								type="number"
								min="0"
								step="1"
								value={data.quantity ?? ''}
								onChange={(event) =>
									updateDetailEdit({ quantity: event.target.value })
								}
							/>
						</Field>
						<SearchSelect
							label="Estado"
							value={String(data.status ?? 'in_use')}
							options={toolStatusOptions}
							onChange={(value) =>
								updateDetailEdit({ status: value || 'in_use' })
							}
						/>
					</div>
					<div className="form-row">
						<Field label="Valor unitario">
							<input
								type="number"
								min="0"
								value={data.unit_value ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										unit_value: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Fecha compra">
							<input
								type="date"
								value={data.purchased_at ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										purchased_at: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<div className="material-summary">
						<div className="material-kpi">
							<span>Estado</span>
							<strong>
								{toolStatusLabels[data.status] ?? data.status}
							</strong>
						</div>
						<div className="material-kpi">
							<span>Cantidad</span>
							<strong>{numberValue(data.quantity)}</strong>
						</div>
						<div className="material-kpi">
							<span>Valor unidad</span>
							<strong>{money(data.unit_value)}</strong>
						</div>
						<div className="material-kpi">
							<span>Valor total</span>
							<strong>{money(toolTotalValue(data))}</strong>
						</div>
					</div>
					<Field label="Notas">
						<textarea
							value={data.notes ?? ''}
							onChange={(event) =>
								updateDetailEdit({ notes: event.target.value })
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'material-purchase') {
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Material"
						value={String(data.material ?? '')}
						options={materialOptions}
						onChange={(value) => updateDetailEdit({ material: value })}
					/>
					<div className="form-row">
						<Field label="Fecha">
							<input
								type="date"
								value={data.purchased_at ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										purchased_at: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Cantidad">
							<input
								required
								type="number"
								min="0"
								value={data.quantity ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										quantity: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<Field label="Costo total">
						<input
							required
							type="number"
							min="0"
							value={data.total_cost ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									total_cost: event.target.value,
								})
							}
						/>
					</Field>
					<div className="info-note">
						Valor calculado por unidad:{' '}
						<strong>
							{money(
								calculatedUnitCost(
									data.quantity,
									data.total_cost,
								),
							)}
						</strong>
					</div>
					<label>
						<input
							type="checkbox"
							checked={Boolean(data.affects_cash)}
							onChange={(event) =>
								updateDetailEdit({
									affects_cash: event.target.checked,
								})
							}
						/>
						Impacta en caja
					</label>
					<Field label="Observaciones">
						<textarea
							value={data.observations ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									observations: event.target.value,
								})
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

		if (detailModal.kind === 'material-consumption') {
			const openUnitConsumption = Boolean(data.open_unit)
			return (
				<form className="form-grid" onSubmit={saveDetailEdit}>
					<SearchSelect
						label="Reserva/trabajo"
						value={String(data.work_order ?? '')}
						options={workOrderOptions}
						onChange={(value) =>
							updateDetailEdit({ work_order: value })
						}
					/>
					{openUnitConsumption ? (
						<div className="info-note">
							Uso desde unidad abierta:{' '}
							<strong>
								{data.open_unit_label ?? `#${data.open_unit}`}
							</strong>
							. No descuenta stock directo.
						</div>
					) : (
						<SearchSelect
							label="Material"
							value={String(data.material ?? '')}
							options={materialOptions}
							onChange={(value) => updateDetailEdit({ material: value })}
						/>
					)}
					<div className="form-row">
						<Field label="Fecha">
							<input
								type="date"
								value={data.consumed_at ?? ''}
								onChange={(event) =>
									updateDetailEdit({
										consumed_at: event.target.value,
									})
								}
							/>
						</Field>
						{openUnitConsumption ? null : (
							<Field label="Cantidad">
								<input
									required
									type="number"
									min="0"
									value={data.quantity ?? ''}
									onChange={(event) =>
										updateDetailEdit({
											quantity: event.target.value,
										})
									}
								/>
							</Field>
						)}
					</div>
					<div className="info-note">
						{openUnitConsumption
							? 'El costo y stock se imputan cuando se finaliza la unidad abierta.'
							: 'El costo estimado se recalcula si cambia el material o la cantidad.'}
					</div>
					<Field label="Observaciones">
						<textarea
							value={data.observations ?? ''}
							onChange={(event) =>
								updateDetailEdit({
									observations: event.target.value,
								})
							}
						/>
					</Field>
					{renderDetailEditActions()}
				</form>
			)
		}

	return null
	}

	async function saveCustomer(event: FormEvent) {
		event.preventDefault()
		const currentId = customerForm.id
		const previousCustomer = currentId
			? customers.find((item) => String(item.id) === String(currentId))
			: null
		await runAction(async () => {
			const path = customerForm.id
				? `/customers/${customerForm.id}/`
				: '/customers/'
			const method = customerForm.id ? 'PATCH' : 'POST'
			const saved = await apiFetch<AnyRecord>(path, {
				method,
				body: JSON.stringify(cleanCustomerPayload(customerForm)),
			})
			setCustomerForm(blankCustomerForm())
			formModalExit.close()
			return saved
		}, {
			flashTarget: (saved: AnyRecord) =>
				recordFlashKey('customer', saved?.id ?? currentId),
			successTitle: entityFeedbackTitle(
				'customer',
				currentId ? 'updated' : 'created',
			),
			undo:
				currentId && previousCustomer
					? undoPatchRecord(
							`/customers/${currentId}/`,
							cleanDetailPayload('customer', previousCustomer),
					  )
					: undoCreatedRecord('customer'),
		})
	}

	async function saveVehicle(event: FormEvent) {
		event.preventDefault()
		const currentId = vehicleForm.id
		const previousVehicle = currentId
			? vehicles.find((item) => String(item.id) === String(currentId))
			: null
		await runAction(async () => {
			const path = vehicleForm.id
				? `/vehicles/${vehicleForm.id}/`
				: '/vehicles/'
			const method = vehicleForm.id ? 'PATCH' : 'POST'
			const saved = await apiFetch<AnyRecord>(path, {
				method,
				body: JSON.stringify(asPayload(vehicleForm)),
			})
			setVehicleForm({
				id: '',
				customer: '',
				license_plate: '',
				brand: '',
				model: '',
				color: '',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			flashTarget: (saved: AnyRecord) =>
				recordFlashKey('vehicle', saved?.id ?? currentId),
			successTitle: entityFeedbackTitle(
				'vehicle',
				currentId ? 'updated' : 'created',
			),
			undo:
				currentId && previousVehicle
					? undoPatchRecord(
							`/vehicles/${currentId}/`,
							cleanDetailPayload('vehicle', previousVehicle),
					  )
					: undoCreatedRecord('vehicle'),
		})
	}

	async function saveService(event: FormEvent) {
		event.preventDefault()
		const currentId = serviceForm.id
		const previousService = currentId
			? services.find((item) => String(item.id) === String(currentId))
			: null
		await runAction(async () => {
			const path = serviceForm.id
				? `/services/${serviceForm.id}/`
				: '/services/'
			const method = serviceForm.id ? 'PATCH' : 'POST'
			const saved = await apiFetch<AnyRecord>(path, {
				method,
				body: JSON.stringify(asPayload(serviceForm)),
			})
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				service_type: 'wash',
				base_price: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			flashTarget: (saved: AnyRecord) =>
				recordFlashKey('service', saved?.id ?? currentId),
			successTitle: entityFeedbackTitle(
				'service',
				currentId ? 'updated' : 'created',
			),
			undo:
				currentId && previousService
					? undoPatchRecord(
							`/services/${currentId}/`,
							cleanDetailPayload('service', previousService),
					  )
					: undoCreatedRecord('service'),
		})
	}

	async function saveReservation(event: FormEvent) {
		event.preventDefault()
		const reservationItems = (reservationForm.items ?? []).filter(
			(item: AnyRecord) => item.service,
		)
		const hasReservationDay = Boolean(reservationForm.day)
		const hasReservationTime = Boolean(
			reservationForm.start_time || reservationForm.exit_time,
		)
		if (!reservationItems.length) {
			setError(
				createValidationNotice(
					'Falta un servicio',
					'Agrega un servicio para poder guardar la reserva.',
					[
						{
							path: 'items',
							label: 'Servicios',
							message: 'Selecciona al menos un servicio.',
						},
					],
				),
			)
			return
		}
		if (!hasReservationDay && hasReservationTime) {
			setError(
				createValidationNotice(
					'Falta la fecha',
					'Para reservar, indica una fecha. Para cotizar libre, deja fecha y hora vacias.',
					[
						{
							path: 'day',
							label: 'Fecha de ingreso',
							message: 'Agrega una fecha o borra la hora cargada.',
						},
					],
				),
			)
			return
		}
		if (!hasReservationDay && !canViewEconomy) {
			setError(
				createValidationNotice(
					'Falta la fecha',
					'Sin fecha se crea una cotizacion libre, pero tu usuario no tiene acceso a cotizaciones.',
					[
						{
							path: 'day',
							label: 'Fecha de ingreso',
							message: 'Agrega una fecha para crear una reserva.',
						},
					],
				),
			)
			return
		}
		if (!hasReservationDay) {
			const createdQuote = await runAction(async () => {
				const created = await apiFetch<AnyRecord>('/quotes/', {
					method: 'POST',
					body: JSON.stringify({
						customer: reservationForm.customer,
						vehicle: reservationForm.vehicle || null,
						reservation_day: null,
						reservation_start_time: null,
						observations: reservationForm.notes,
						items: serviceLinePayload(reservationItems),
					}),
				})
				setReservationForm(blankReservationForm())
				quickReservationExit.close()
				return created
			}, {
				flashTarget: (created: AnyRecord) =>
					recordFlashKey('quote', created?.id),
				successTitle: entityFeedbackTitle('quote', 'created'),
				undo: undoCreatedRecord('quote'),
			})
			if (createdQuote) {
				setActive('quotes')
				openDetailModal('Cotizacion', createdQuote)
			}
			return
		}
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/reservations/', {
				method: 'POST',
					body: JSON.stringify({
						...reservationForm,
						service: reservationItems[0].service,
						exit_day: reservationForm.exit_day || null,
						start_time: useReservationTimes
							? reservationForm.start_time || null
							: null,
						exit_time: useReservationTimes
							? reservationForm.exit_time || null
							: null,
						items: serviceLinePayload(reservationItems),
					}),
			})
			const createdQuote = await apiFetch<AnyRecord>(`/reservations/${created.id}/quote/`, {
				method: 'POST',
			})
			setReservationForm(blankReservationForm())
			quickReservationExit.close()
			return { ...created, _created_quote_id: createdQuote?.id }
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('reservation', created?.id),
			successTitle: entityFeedbackTitle('reservation', 'created'),
			undo: undoCreatedRecord('reservation', {
				beforeDelete: async (created: AnyRecord) => {
					if (created?._created_quote_id) {
						await apiFetch(`/quotes/${created._created_quote_id}/`, {
							method: 'DELETE',
						})
					}
				},
			}),
		})
	}

	async function savePayment(event: FormEvent) {
		event.preventDefault()
		const agendaPaymentActive = Boolean(paymentForOrder)
		const paymentPayload = agendaPaymentActive
			? {
					...agendaPaymentForm,
					work_order: String(paymentForOrder?.id ?? agendaPaymentForm.work_order),
				}
			: paymentForm
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/payments/', {
				method: 'POST',
				body: JSON.stringify(paymentPayload),
			})
			if (!agendaPaymentActive) {
				setPaymentForm(blankPaymentForm())
				formModalExit.close()
			}
			if (agendaPaymentActive) {
				paymentExit.close()
			}
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('payment', created?.id),
			successTitle: entityFeedbackTitle('payment', 'created'),
			undo: undoCreatedRecord('payment'),
		})
	}

	async function saveCashMovement(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/cash-movements/', {
				method: 'POST',
				body: JSON.stringify(cashMovementPayload()),
			})
			setMovementForm(blankMovementForm(selectedDay))
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('cash-movement', created?.id),
			successTitle: entityFeedbackTitle('cash-movement', 'created'),
			undo: undoCreatedRecord('cash-movement'),
		})
	}

	async function saveDebt(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/debts/', {
				method: 'POST',
				body: JSON.stringify({
					...debtForm,
					due_date: debtForm.due_date || null,
					supplier: debtForm.supplier || null,
				}),
			})
			setDebtForm(blankDebtForm(today))
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) => recordFlashKey('debt', created?.id),
			successTitle: entityFeedbackTitle('debt', 'created'),
			undo: undoCreatedRecord('debt'),
		})
	}

	async function saveDebtPayment(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/debt-payments/', {
				method: 'POST',
				body: JSON.stringify(debtPaymentForm),
			})
			setDebtPaymentForm(blankDebtPaymentForm(today))
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('debt-payment', created?.id),
			successTitle: entityFeedbackTitle('debt-payment', 'created'),
			undo: undoCreatedRecord('debt-payment'),
		})
	}

	async function saveMaterial(event: FormEvent) {
		event.preventDefault()
		const currentId = materialForm.id
		const previousMaterial = currentId
			? materials.find((item) => String(item.id) === String(currentId))
			: null
		await runAction(async () => {
			const path = materialForm.id
				? `/materials/${materialForm.id}/`
				: '/materials/'
			const method = materialForm.id ? 'PATCH' : 'POST'
			const saved = await apiFetch<AnyRecord>(path, {
				method,
				body: JSON.stringify(asPayload(materialForm)),
			})
			setMaterialForm({
				id: '',
				name: '',
				unit: 'ml',
				stock_quantity: '0',
				estimated_unit_cost: '0',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			flashTarget: (saved: AnyRecord) =>
				recordFlashKey('material', saved?.id ?? currentId),
			successTitle: entityFeedbackTitle(
				'material',
				currentId ? 'updated' : 'created',
			),
			undo:
				currentId && previousMaterial
					? undoPatchRecord(
							`/materials/${currentId}/`,
							cleanDetailPayload('material', previousMaterial),
					  )
					: undoCreatedRecord('material'),
		})
	}

	async function saveSupplier(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/suppliers/', {
				method: 'POST',
				body: JSON.stringify(asPayload(supplierForm)),
			})
			setSupplierForm(blankSupplierForm())
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) => recordFlashKey('supplier', created?.id),
			successTitle: entityFeedbackTitle('supplier', 'created'),
			undo: undoCreatedRecord('supplier'),
		})
	}

	function updateStockMovementLine(index: number, patch: AnyRecord) {
		setStockMovementForm((current: AnyRecord) => {
			const lines = [...(current.lines ?? [])]
			lines[index] = { ...lines[index], ...patch }
			return { ...current, lines }
		})
	}

	function addStockMovementLine() {
		setStockMovementForm((current: AnyRecord) => ({
			...current,
			lines: [...(current.lines ?? []), blankStockMovementLine()],
		}))
	}

	function removeStockMovementLine(index: number) {
		setStockMovementForm((current: AnyRecord) => {
			const lines = (current.lines ?? []).filter(
				(_: AnyRecord, itemIndex: number) => itemIndex !== index,
			)
			return {
				...current,
				lines: lines.length ? lines : [blankStockMovementLine()],
			}
		})
	}

	function buildStockMovementPayload() {
		const lines = (stockMovementForm.lines ?? [])
			.filter((line: AnyRecord) => line.material && numberValue(line.quantity) > 0)
			.map((line: AnyRecord) => ({
				material: line.material,
				quantity: line.quantity,
				unit_price:
					stockMovementForm.movement_type === 'consumption'
						? line.unit_price || '0'
						: line.unit_price,
			}))

		const payload: AnyRecord = {
			...stockMovementForm,
			supplier: stockMovementRequiresSupplier
				? stockMovementForm.supplier || null
				: null,
			customer: stockMovementRequiresCustomer
				? stockMovementForm.customer || null
				: null,
			reservation: stockMovementRequiresReservation
				? stockMovementForm.reservation || null
				: null,
			document_type: stockMovementRequiresSupplier
				? stockMovementForm.document_type || ''
				: '',
			document_number: stockMovementRequiresSupplier
				? stockMovementForm.document_number || ''
				: '',
			affects_cash:
				stockMovementForm.movement_type === 'purchase'
					? Boolean(stockMovementForm.affects_cash)
					: stockMovementForm.movement_type === 'sale',
			products_received:
				stockMovementForm.movement_type === 'purchase'
					? Boolean(stockMovementForm.products_received)
					: true,
			payment_method: stockMovementForm.payment_method || DEFAULT_PAYMENT_METHOD,
			lines,
		}
		if (stockMovementDocumentFile) {
			const formData = new FormData()
			Object.entries(payload).forEach(([key, value]) => {
				if (key === 'lines') {
					formData.append('lines', JSON.stringify(value))
				} else if (typeof value === 'boolean') {
					formData.append(key, String(value))
				} else if (value !== undefined && value !== null) {
					formData.append(key, String(value))
				}
			})
			formData.append('document_file', stockMovementDocumentFile)
			return formData
		}
		return payload
	}

	async function saveStockMovement(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/stock-movements/', {
				method: 'POST',
				body:
					stockMovementDocumentFile
						? (buildStockMovementPayload() as FormData)
						: JSON.stringify(buildStockMovementPayload()),
			})
			setStockMovementForm(blankStockMovementForm(selectedDay))
			setStockMovementDocumentFile(null)
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('stock-movement', created?.id),
			successTitle: entityFeedbackTitle('stock-movement', 'created'),
			undo: undoCreatedRecord('stock-movement'),
		})
	}

	async function saveTool(event: FormEvent) {
		event.preventDefault()
		const currentId = toolForm.id
		const previousTool = currentId
			? tools.find((item) => String(item.id) === String(currentId))
			: null
		await runAction(async () => {
			const path = toolForm.id ? `/tools/${toolForm.id}/` : '/tools/'
			const method = toolForm.id ? 'PATCH' : 'POST'
			const saved = await apiFetch<AnyRecord>(path, {
				method,
				body: JSON.stringify({
					...asPayload(toolForm),
					purchased_at: toolForm.purchased_at || null,
				}),
			})
			setToolForm({
				id: '',
				name: '',
				quantity: '1',
				status: 'in_use',
				unit_value: '0',
				purchased_at: '',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			flashTarget: (saved: AnyRecord) =>
				recordFlashKey('tool', saved?.id ?? currentId),
			successTitle: entityFeedbackTitle(
				'tool',
				currentId ? 'updated' : 'created',
			),
			undo:
				currentId && previousTool
					? undoPatchRecord(
							`/tools/${currentId}/`,
							cleanDetailPayload('tool', previousTool),
					  )
					: undoCreatedRecord('tool'),
		})
	}

	async function savePurchase(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/material-purchases/', {
				method: 'POST',
				body: JSON.stringify(purchaseForm),
			})
			setPurchaseForm({
				material: '',
				purchased_at: selectedDay,
				quantity: '',
				total_cost: '',
				affects_cash: true,
				observations: '',
			})
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('material-purchase', created?.id),
			successTitle: entityFeedbackTitle('material-purchase', 'created'),
			undo: undoCreatedRecord('material-purchase'),
		})
	}

	async function saveOpenUnit(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/material-open-units/', {
				method: 'POST',
				body: JSON.stringify({
					...openUnitForm,
					opened_by_work_order: openUnitForm.opened_by_work_order || null,
				}),
			})
			setOpenUnitForm({
				material: '',
				opened_at: selectedDay,
				opened_by_work_order: '',
				stock_quantity_to_decrement: '1',
				observations: '',
			})
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('material-open-unit', created?.id),
			successTitle: entityFeedbackTitle('material-open-unit', 'created'),
			undo: undoCreatedRecord('material-open-unit'),
		})
	}

	async function finishOpenUnit(openUnit: AnyRecord) {
		await runAction(() =>
			apiFetch(`/material-open-units/${openUnit.id}/finish/`, {
				method: 'POST',
				body: JSON.stringify({ finished_at: selectedDay }),
			}),
			{
				flashTarget: recordFlashKey('material-open-unit', openUnit.id),
				successTitle: 'Unidad abierta finalizada',
			},
		)
	}

	async function saveConsumption(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const created =
				consumptionForm.mode === 'open_unit'
					? await apiFetch<AnyRecord>(
							`/material-open-units/${consumptionForm.open_unit}/consume/`,
							{
								method: 'POST',
								body: JSON.stringify({
									work_order: consumptionForm.work_order,
									consumed_at: consumptionForm.consumed_at,
									observations: consumptionForm.observations,
								}),
							},
						)
					: await apiFetch<AnyRecord>('/material-consumptions/', {
							method: 'POST',
							body: JSON.stringify({
								work_order: consumptionForm.work_order,
								material: consumptionForm.material,
								consumed_at: consumptionForm.consumed_at,
								quantity: consumptionForm.quantity,
								observations: consumptionForm.observations,
							}),
						})
			setConsumptionForm({
				mode: 'direct',
				work_order: '',
				material: '',
				open_unit: '',
				consumed_at: selectedDay,
				quantity: '',
				observations: '',
			})
			consumptionExit.close()
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('material-consumption', created?.id),
			successTitle: entityFeedbackTitle('material-consumption', 'created'),
			undo: undoCreatedRecord('material-consumption'),
		})
	}

	function updateConsumptionMode(mode: 'direct' | 'open_unit') {
		setConsumptionForm({
			...consumptionForm,
			mode,
			material: '',
			open_unit: '',
			quantity: '',
		})
	}

	function renderConsumptionFields(showWorkOrder = true) {
		const directMode = consumptionForm.mode !== 'open_unit'
		return (
			<>
				{showWorkOrder ? (
					<SearchSelect
						label="Reserva/trabajo"
						value={consumptionForm.work_order}
						options={workOrderOptions}
						focusKey="material-consumption.work_order"
						onChange={(value) =>
							setConsumptionForm({
								...consumptionForm,
								work_order: value,
							})
						}
					/>
				) : null}
				<div className="mode-toggle" role="group" aria-label="Modo de consumo">
					<button
						type="button"
						className={directMode ? 'selected' : ''}
						onClick={() => updateConsumptionMode('direct')}
					>
						Consumo directo
					</button>
					<button
						type="button"
						className={!directMode ? 'selected' : ''}
						onClick={() => updateConsumptionMode('open_unit')}
					>
						Unidad abierta
					</button>
				</div>
				{directMode ? (
					<>
						<SearchSelect
							label="Material"
							value={consumptionForm.material}
							options={materialOptions}
							focusKey="consumption.material"
							className={flashClass(fieldFlashKey('consumption.material'))}
							onAdd={() =>
								openQuickCreate('material', 'consumption.material')
							}
							onChange={(value) =>
								setConsumptionForm({
									...consumptionForm,
									material: value,
								})
							}
						/>
						{selectedConsumptionMaterial ? (
							<div className="info-note">
								Stock disponible:{' '}
								<strong>
									{quantity(
										selectedConsumptionMaterial.stock_quantity,
										selectedConsumptionMaterial.unit,
									)}
								</strong>{' '}
								- valor por unidad{' '}
								<strong>
									{money(
										materialUnitValue(
											selectedConsumptionMaterial,
										),
									)}
								</strong>
							</div>
						) : null}
					</>
				) : (
					<>
						<SearchSelect
							label="Unidad abierta"
							value={consumptionForm.open_unit}
							options={openMaterialUnitOptions}
							placeholder="Seleccionar unidad abierta"
							focusKey="material-consumption.open_unit"
							className={flashClass(fieldFlashKey('consumption.open_unit'))}
							onChange={(value) =>
								setConsumptionForm({
									...consumptionForm,
									open_unit: value,
								})
							}
						/>
						{selectedOpenUnit ? (
							<div className="info-note">
								{selectedOpenUnit.material_name} abierta el{' '}
								<strong>{selectedOpenUnit.opened_at}</strong> -{' '}
								{selectedOpenUnit.consumptions_count ?? 0} usos. Al
								finalizar descuenta{' '}
								<strong>
									{quantity(
										selectedOpenUnit.stock_quantity_to_decrement,
										materials.find(
											(item) =>
												String(item.id) ===
												String(selectedOpenUnit.material),
										)?.unit,
									)}
								</strong>
								.
							</div>
						) : (
							<div className="info-note">
								Primero abri una unidad desde Materiales si todavia no hay
								envases abiertos.
							</div>
						)}
					</>
				)}
				<div className="form-row">
					<Field label="Fecha">
						<input
							type="date"
							value={consumptionForm.consumed_at}
							onChange={(event) =>
								setConsumptionForm({
									...consumptionForm,
									consumed_at: event.target.value,
								})
							}
						/>
					</Field>
					{directMode ? (
						<Field label="Cantidad">
							<input
								required
								type="number"
								min="0"
								value={consumptionForm.quantity}
								onChange={(event) =>
									setConsumptionForm({
										...consumptionForm,
										quantity: event.target.value,
									})
								}
							/>
						</Field>
					) : null}
				</div>
				<Field label="Observaciones">
					<textarea
						value={consumptionForm.observations}
						onChange={(event) =>
							setConsumptionForm({
								...consumptionForm,
								observations: event.target.value,
							})
						}
					/>
				</Field>
			</>
		)
	}

	async function saveQuote(event: FormEvent) {
		event.preventDefault()
		const quoteItems = (quoteForm.items ?? []).filter(
			(item: AnyRecord) => item.service,
		)
		if (!quoteItems.length) {
			setError(
				createValidationNotice(
					'Falta un servicio',
					'Agrega un servicio para poder guardar la cotizacion.',
					[
						{
							path: 'items',
							label: 'Servicios',
							message: 'Selecciona al menos un servicio.',
						},
					],
				),
			)
			return
		}
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/quotes/', {
				method: 'POST',
				body: JSON.stringify({
					customer: quoteForm.customer,
					vehicle: quoteForm.vehicle || null,
					reservation_day: quoteForm.reservation_day || null,
					reservation_start_time:
						useReservationTimes
							? quoteForm.reservation_start_time || null
							: null,
					valid_until: quoteForm.valid_until || null,
					tax_rate: quoteForm.tax_rate || '0',
					discount_rate: quoteForm.discount_rate || '0',
					observations: quoteForm.observations,
					terms: quoteForm.terms,
					payment_instructions: quoteForm.payment_instructions,
					items: serviceLinePayload(quoteItems),
				}),
			})
			setQuoteForm(blankQuoteFormWithDefaults())
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('quote', created?.id),
			successTitle: entityFeedbackTitle('quote', 'created'),
			undo: undoCreatedRecord('quote'),
		})
	}

	function renderReservationForm(submitLabel: string) {
		return (
			<>
				<SearchSelect
					label="Cliente"
					value={reservationForm.customer}
					options={customerOptions}
					name="reservation_customer"
					focusKey="reservation.customer"
					className={flashClass(fieldFlashKey('reservation.customer'))}
					onAdd={() =>
						openQuickCreate('customer', 'reservation.customer')
					}
					onChange={updateReservationCustomer}
				/>
				<SearchSelect
					label="Vehiculo"
					value={reservationForm.vehicle}
					options={customerVehicleOptions}
					name="reservation_vehicle"
					focusKey="reservation.vehicle"
					className={flashClass(fieldFlashKey('reservation.vehicle'))}
					onAdd={() =>
						openQuickCreate('vehicle', 'reservation.vehicle')
					}
					onChange={(value) => {
						setReservationForm({
							...reservationForm,
							vehicle: value,
						})
						focusField('reservation.service.0', true)
					}}
				/>
				<div className="quote-lines">
					<div className="quote-lines-head">
						<h3>Servicios</h3>
						<button type="button" className="ghost" onClick={addReservationItem}>
							<Plus size={16} />
							Agregar servicio
						</button>
					</div>
					{(reservationForm.items ?? []).map(
						(item: AnyRecord, index: number) => {
							const lineTotal =
								Number(item.quantity || 0) *
								Number(item.unit_price || 0)
							const nextLine = (reservationForm.items ?? [])[index + 1]
							return (
								<div className="quote-line" key={index}>
									<SearchSelect
										label="Servicio"
										value={item.service}
										options={serviceOptions}
										name={`reservation_items_${index}_service`}
										focusKey={`reservation.service.${index}`}
										className={flashClass(
											fieldFlashKey(`reservation.service.${index}`),
										)}
										onAdd={
											canViewEconomy
												? () =>
														openQuickCreate(
															'service',
															`reservation.service.${index}`,
														)
												: undefined
										}
										onChange={(value) =>
											selectReservationService(index, value)
										}
									/>
									<div className="quote-line-grid">
										<Field label="Cantidad">
											<input
												data-focus-key={`reservation.item.${index}.quantity`}
												name={`reservation_items_${index}_quantity`}
												type="number"
												min="1"
												value={item.quantity}
												onChange={(event) =>
													updateReservationItem(index, {
														quantity: event.target.value,
													})
												}
												onKeyDown={focusNextOnEnter(
													`reservation.item.${index}.price`,
												)}
											/>
										</Field>
										<Field label="Precio">
											<input
												data-focus-key={`reservation.item.${index}.price`}
												name={`reservation_items_${index}_unit_price`}
												type="number"
												min="0"
												value={item.unit_price}
												onChange={(event) =>
													updateReservationItem(index, {
														unit_price: event.target.value,
													})
												}
												onKeyDown={focusNextOnEnter(
													nextLine
														? `reservation.service.${index + 1}`
														: 'reservation.day',
													Boolean(nextLine),
												)}
											/>
										</Field>
										<div className="line-total">
											<span>Total</span>
											<strong>{money(lineTotal)}</strong>
										</div>
									</div>
									{(reservationForm.items ?? []).length > 1 ? (
										<button
											type="button"
											className="danger"
											onClick={() => removeReservationItem(index)}
										>
											Quitar
										</button>
									) : null}
								</div>
							)
						},
					)}
					<div className="quote-total">
						<span>Total reserva</span>
						<strong>{money(serviceLinesTotal(reservationForm.items ?? []))}</strong>
					</div>
				</div>
				<div className="form-row">
					<Field label="Fecha de ingreso (opcional)">
						<input
							data-focus-key="reservation.day"
							name="reservation_day"
							type="date"
							value={reservationForm.day}
							onChange={(event) => {
								setReservationForm({
									...reservationForm,
									day: event.target.value,
								})
								focusField('reservation.exit_day')
							}}
							onKeyDown={focusNextOnEnter('reservation.exit_day')}
						/>
					</Field>
					<Field label="Fecha de egreso">
						<input
							data-focus-key="reservation.exit_day"
							name="reservation_exit_day"
							type="date"
							value={reservationForm.exit_day}
							onChange={(event) => {
								setReservationForm({
									...reservationForm,
									exit_day: event.target.value,
								})
								focusField(
									useReservationTimes
										? 'reservation.start_time'
										: 'reservation.notes',
								)
							}}
							onKeyDown={focusNextOnEnter(
								useReservationTimes
									? 'reservation.start_time'
									: 'reservation.notes',
								!useReservationTimes,
							)}
						/>
					</Field>
				</div>
				{useReservationTimes ? (
					<div className="form-row">
						<Field label="Hora de ingreso (opcional)">
							<input
								data-focus-key="reservation.start_time"
								name="reservation_start_time"
								type="time"
								value={reservationForm.start_time}
								onChange={(event) => {
									setReservationForm({
										...reservationForm,
										start_time: event.target.value,
									})
									focusField('reservation.exit_time')
								}}
								onKeyDown={focusNextOnEnter('reservation.exit_time')}
							/>
						</Field>
						<Field label="Hora de egreso (opcional)">
							<input
								data-focus-key="reservation.exit_time"
								name="reservation_exit_time"
								type="time"
								value={reservationForm.exit_time}
								onChange={(event) => {
									setReservationForm({
										...reservationForm,
										exit_time: event.target.value,
									})
									focusField('reservation.notes')
								}}
								onKeyDown={focusNextOnEnter('reservation.notes')}
							/>
						</Field>
					</div>
				) : null}
				<Field label="Notas">
					<textarea
						data-focus-key="reservation.notes"
						name="reservation_notes"
						autoComplete="off"
						value={reservationForm.notes}
						onChange={(event) =>
							setReservationForm({
								...reservationForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary" data-focus-key="reservation.submit">
					<Plus size={16} />
					<AnimatedLabelSwap label={submitLabel} />
				</button>
			</>
		)
	}

	function renderCustomerForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveCustomer}>
				<Field label="Nombre">
					<input
						data-focus-key="customer.name"
						name="customer_name"
						autoComplete="name"
						required
						list="customer-name-options"
						value={customerForm.name}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								name: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('customer.phone')}
					/>
				</Field>
				<Field label="Telefono">
					<input
						data-focus-key="customer.phone"
						name="customer_phone"
						autoComplete="tel"
						inputMode="tel"
						list="customer-phone-options"
						value={customerForm.phone}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								phone: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('customer.email')}
					/>
				</Field>
					<Field label="Email">
						<input
							data-focus-key="customer.email"
							name="customer_email"
							type="email"
							autoComplete="email"
							list="customer-email-options"
							value={customerForm.email}
							onChange={(event) =>
								setCustomerForm({
									...customerForm,
									email: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('customer.tax_id')}
						/>
					</Field>
					<div className="form-row">
						<Field label="CUIT/DNI">
							<input
								data-focus-key="customer.tax_id"
								name="customer_tax_id"
								autoComplete="off"
								value={customerForm.tax_id}
								onChange={(event) =>
									setCustomerForm({
										...customerForm,
										tax_id: event.target.value,
									})
								}
								onKeyDown={focusNextOnEnter('customer.billing_address')}
							/>
						</Field>
						<Field label="Domicilio fiscal">
							<input
								data-focus-key="customer.billing_address"
								name="customer_billing_address"
								autoComplete="street-address"
								value={customerForm.billing_address}
								onChange={(event) =>
									setCustomerForm({
										...customerForm,
										billing_address: event.target.value,
									})
								}
								onKeyDown={focusNextOnEnter('customer.birthday_day')}
							/>
						</Field>
					</div>
					<BirthdayFields
						day={customerForm.birthday_day}
						month={customerForm.birthday_month}
						dayName="customer_birthday_day"
						monthName="customer_birthday_month"
						dayFocusKey="customer.birthday_day"
						monthFocusKey="customer.birthday_month"
						onDayChange={(value) =>
							setCustomerForm({
								...customerForm,
								birthday_day: value,
							})
						}
						onMonthChange={(value) =>
							setCustomerForm({
								...customerForm,
								birthday_month: value,
							})
						}
						onDayKeyDown={focusNextOnEnter('customer.birthday_month')}
						onMonthKeyDown={focusNextOnEnter('customer.notes')}
					/>
				<Field label="Notas">
					<textarea
						data-focus-key="customer.notes"
						name="customer_notes"
						autoComplete="off"
						value={customerForm.notes}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary" data-focus-key="customer.submit">
					<Plus size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderVehicleForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveVehicle}>
				<SearchSelect
					label="Cliente"
					value={vehicleForm.customer}
					options={customerOptions}
					name="vehicle_customer"
					focusKey="vehicle.customer"
					className={flashClass(fieldFlashKey('vehicle.customer'))}
					onAdd={() => openQuickCreate('customer', 'vehicle.customer')}
					onChange={updateVehicleCustomer}
				/>
				<div className="form-row">
					<SearchSelect
						label="Marca"
						value={vehicleForm.brand}
						options={vehicleBrandSelectOptions}
						name="vehicle_brand"
						placeholder="Sin marca"
						focusKey="vehicle.brand"
						onChange={updateVehicleBrand}
						onCreate={updateVehicleBrand}
						createLabel={(value) => `Crear marca "${value}"`}
					/>
					<SearchSelect
						label="Modelo"
						value={vehicleForm.model}
						options={vehicleModelSelectOptions}
						name="vehicle_model"
						placeholder={
							vehicleForm.brand ? 'Sin modelo' : 'Elegir marca'
						}
						disabled={!vehicleForm.brand && !vehicleForm.model}
						focusKey="vehicle.model"
						onChange={(value) => {
							setVehicleForm({
								...vehicleForm,
								model: value,
							})
							focusField('vehicle.color')
						}}
						onCreate={(value) => {
							setVehicleForm({
								...vehicleForm,
								model: value,
							})
							focusField('vehicle.color')
						}}
						createLabel={(value) => `Crear modelo "${value}"`}
					/>
				</div>
				<div className="form-row">
					<Field label="Color">
						<input
							data-focus-key="vehicle.color"
							name="vehicle_color"
							autoComplete="off"
							list="vehicle-color-options"
							value={vehicleForm.color}
							onChange={(event) =>
								setVehicleForm({
									...vehicleForm,
									color: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('vehicle.license_plate')}
						/>
					</Field>
					<Field label="Patente">
						<input
							data-focus-key="vehicle.license_plate"
							name="vehicle_license_plate"
							autoComplete="off"
							list="vehicle-plate-options"
							value={vehicleForm.license_plate}
							onChange={(event) =>
								setVehicleForm({
									...vehicleForm,
									license_plate: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('vehicle.submit')}
						/>
					</Field>
				</div>
				<button className="primary" data-focus-key="vehicle.submit">
					<Car size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderQuoteForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveQuote}>
				<SearchSelect
					label="Cliente"
					value={quoteForm.customer}
					options={customerOptions}
					focusKey="quote.customer"
					className={flashClass(fieldFlashKey('quote.customer'))}
					onAdd={() => openQuickCreate('customer', 'quote.customer')}
					onChange={updateQuoteCustomer}
				/>
				<SearchSelect
					label="Vehiculo"
					value={quoteForm.vehicle}
					options={quoteVehicleSearchOptions}
					placeholder="Sin vehiculo"
					focusKey="quote.vehicle"
					className={flashClass(fieldFlashKey('quote.vehicle'))}
					onAdd={() => openQuickCreate('vehicle', 'quote.vehicle')}
					onChange={(value) => {
						setQuoteForm({
							...quoteForm,
							vehicle: value,
						})
						focusField('quote.service.0', true)
					}}
				/>
				<div className="form-row">
					<Field label="Fecha tentativa">
						<input
							type="date"
							value={quoteForm.reservation_day ?? ''}
							onChange={(event) =>
								setQuoteForm({
									...quoteForm,
									reservation_day: event.target.value,
								})
							}
						/>
					</Field>
					{useReservationTimes ? (
						<Field label="Hora tentativa">
							<input
								type="time"
								value={quoteForm.reservation_start_time ?? ''}
								onChange={(event) =>
									setQuoteForm({
										...quoteForm,
										reservation_start_time: event.target.value,
									})
								}
							/>
						</Field>
					) : null}
				</div>
				<div className="quote-lines">
					<div className="quote-lines-head">
						<h3>Servicios</h3>
						<button type="button" className="ghost" onClick={addQuoteItem}>
							<Plus size={16} />
							Agregar servicio
						</button>
					</div>
					{(quoteForm.items ?? []).map(
						(item: AnyRecord, index: number) => {
							const lineTotal =
								Number(item.quantity || 0) *
								Number(item.unit_price || 0)
							const nextLine = (quoteForm.items ?? [])[index + 1]
							return (
								<div className="quote-line" key={index}>
									<SearchSelect
										label="Servicio"
										value={item.service}
										options={serviceOptions}
										focusKey={`quote.service.${index}`}
										className={flashClass(
											fieldFlashKey(`quote.service.${index}`),
										)}
										onAdd={
											canViewEconomy
												? () =>
														openQuickCreate(
															'service',
															`quote.service.${index}`,
														)
												: undefined
										}
										onChange={(value) => selectQuoteService(index, value)}
									/>
									{serviceNotesForLine(item) ? (
										<div className="service-notes">
											{serviceNotesForLine(item)}
										</div>
									) : null}
									<div className="quote-line-grid">
										<Field label="Cantidad">
											<input
												data-focus-key={`quote.item.${index}.quantity`}
												type="number"
												min="1"
												value={item.quantity}
												onChange={(event) =>
													updateQuoteItem(index, {
														quantity: event.target.value,
													})
												}
												onKeyDown={focusNextOnEnter(
													`quote.item.${index}.price`,
												)}
											/>
										</Field>
										<Field label="Precio">
											<input
												data-focus-key={`quote.item.${index}.price`}
												type="number"
												min="0"
												value={item.unit_price}
												onChange={(event) =>
													updateQuoteItem(index, {
														unit_price: event.target.value,
													})
												}
												onKeyDown={focusNextOnEnter(
													nextLine
														? `quote.service.${index + 1}`
														: 'quote.observations',
													Boolean(nextLine),
												)}
											/>
										</Field>
										<div className="line-total">
											<span>Total</span>
											<strong>{money(lineTotal)}</strong>
										</div>
									</div>
									{(quoteForm.items ?? []).length > 1 ? (
										<button
											type="button"
											className="danger"
											onClick={() => removeQuoteItem(index)}
										>
											Quitar
										</button>
									) : null}
								</div>
							)
						},
					)}
					<div className="quote-total">
						<span>Total cotizacion</span>
						<strong>{money(quoteTotals.total)}</strong>
					</div>
				</div>
				<details className="quote-advanced">
					<summary>Avanzado comercial</summary>
					<div className="form-row">
						<Field label="Valida hasta">
							<input
								type="date"
								value={quoteForm.valid_until ?? ''}
								onChange={(event) =>
									setQuoteForm({
										...quoteForm,
										valid_until: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Descuento %">
							<input
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={quoteForm.discount_rate ?? ''}
								onChange={(event) =>
									setQuoteForm({
										...quoteForm,
										discount_rate: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="IVA %">
							<input
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={quoteForm.tax_rate ?? ''}
								onChange={(event) =>
									setQuoteForm({
										...quoteForm,
										tax_rate: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<div className="quote-total quote-total--breakdown">
						<span>Subtotal {money(quoteTotals.subtotal)}</span>
						<span>Descuento {money(quoteTotals.discountAmount)}</span>
						<span>IVA {money(quoteTotals.taxAmount)}</span>
						<strong>{money(quoteTotals.total)}</strong>
					</div>
					<Field label="Terminos">
						<textarea
							value={quoteForm.terms ?? ''}
							onChange={(event) =>
								setQuoteForm({
									...quoteForm,
									terms: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Instrucciones de pago">
						<textarea
							value={quoteForm.payment_instructions ?? ''}
							onChange={(event) =>
								setQuoteForm({
									...quoteForm,
									payment_instructions: event.target.value,
								})
							}
						/>
					</Field>
				</details>
				<Field label="Observaciones">
					<textarea
						data-focus-key="quote.observations"
						value={quoteForm.observations}
						onChange={(event) =>
							setQuoteForm({
								...quoteForm,
								observations: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary" data-focus-key="quote.submit">
					<FileText size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderServiceForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveService}>
				<div className="form-row">
					<Field label="Nombre">
						<input
							data-focus-key="service.name"
							required
							list="service-name-options"
							value={serviceForm.name}
							onChange={(event) =>
								setServiceForm({
									...serviceForm,
									name: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('service.icon')}
						/>
					</Field>
					<ServiceIconPicker
						focusKey="service.icon"
						value={String(serviceForm.icon ?? '')}
						onChange={(icon) =>
							setServiceForm({
								...serviceForm,
								icon,
							})
						}
					/>
				</div>
				<SearchSelect
					label="Tipo"
					value={serviceForm.service_type}
					options={serviceFormTypeOptions}
					focusKey="service.type"
					onChange={(value) => {
						setServiceForm({
							...serviceForm,
							service_type: value || 'wash',
						})
						focusField('service.base_price')
					}}
				/>
				<div className="form-row">
					<Field label="Precio base">
						<input
							data-focus-key="service.base_price"
							required
							type="number"
							min="0"
							value={serviceForm.base_price}
							onChange={(event) =>
								setServiceForm({
									...serviceForm,
									base_price: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('service.duration')}
						/>
					</Field>
					<Field label="Duracion estimada">
						<input
							data-focus-key="service.duration"
							required
							type="number"
							min="1"
							value={serviceForm.estimated_duration_minutes}
							onChange={(event) =>
								setServiceForm({
									...serviceForm,
									estimated_duration_minutes: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('service.notes')}
						/>
					</Field>
				</div>
				<Field label="Notas">
					<textarea
						data-focus-key="service.notes"
						value={serviceForm.notes}
						onChange={(event) =>
							setServiceForm({
								...serviceForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary" data-focus-key="service.submit">
					<Wrench size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderPaymentForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={savePayment}>
				<SearchSelect
					label="Reserva/trabajo"
					value={paymentForm.work_order}
					options={workOrderOptions}
					focusKey="payment.work_order"
					onChange={(value) => {
						const selectedOrder = workOrders.find(
							(item) => String(item.id) === String(value),
						)
						setPaymentForm({
							...paymentForm,
							work_order: value,
							amount: fullPaymentAmountForOrder(selectedOrder),
						})
						focusField('payment.amount')
					}}
				/>
				{selectedWorkOrderForPayment ? (
					<div className="finance-form-summary">
						<div>
							<span>Saldo a cobrar</span>
							<strong>
								{money(
									selectedWorkOrderForPayment.balance_due ??
										selectedWorkOrderForPayment.total_amount,
								)}
							</strong>
						</div>
						<small>
							{joinDisplayParts([
								selectedWorkOrderForPayment.customer_name,
								selectedWorkOrderForPayment.vehicle_label,
								serviceDisplayName(selectedWorkOrderForPayment),
							])}
						</small>
					</div>
				) : null}
				<div className="form-row">
					<Field label="Importe">
						<input
							data-focus-key="payment.amount"
							required
							type="number"
							min="0"
							value={paymentForm.amount}
							onChange={(event) =>
								setPaymentForm({
									...paymentForm,
									amount: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('payment.type', true)}
						/>
					</Field>
					<SearchSelect
						label="Tipo"
						value={paymentForm.payment_type}
						options={[
							{ value: 'payment', label: 'Pago' },
							{ value: 'deposit', label: 'Sena' },
						]}
						focusKey="payment.type"
						onChange={(value) => {
							setPaymentForm({
								...paymentForm,
								payment_type: value || DEFAULT_PAYMENT_TYPE,
							})
							focusField('payment.method', true)
						}}
					/>
				</div>
				<SearchSelect
					label="Medio"
					value={paymentForm.method}
					options={[
						{ value: 'cash', label: 'Efectivo' },
						{ value: 'card', label: 'Tarjeta' },
						{ value: 'transfer', label: 'Transferencia' },
						{ value: 'other', label: 'Otro' },
					]}
					focusKey="payment.method"
					onChange={(value) => {
						setPaymentForm({
							...paymentForm,
							method: value || DEFAULT_PAYMENT_METHOD,
						})
						focusField('payment.notes')
					}}
				/>
				<Field label="Notas">
					<textarea
						data-focus-key="payment.notes"
						value={paymentForm.notes}
						onChange={(event) =>
							setPaymentForm({
								...paymentForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary" data-focus-key="payment.submit">
					<CreditCard size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderCashMovementForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveCashMovement}>
				<SearchSelect
					label="Tipo"
					value={movementForm.movement_type}
					options={[
						{ value: 'expense', label: 'Egreso' },
						{ value: 'income', label: 'Ingreso' },
					]}
					focusKey="cash-movement.type"
					onChange={(value) => {
						const movementType = value || 'expense'
						const shouldResetCategory = [
							'',
							DEFAULT_EXPENSE_CATEGORY,
							DEFAULT_INCOME_CATEGORY,
						].includes(movementForm.category ?? '')
						const nextCategory = shouldResetCategory
							? defaultCashCategory(movementType)
							: movementForm.category
						setMovementForm({
							...movementForm,
							movement_type: movementType,
							category: nextCategory,
							subcategory: validCashSubcategoryForCategory(
								movementType,
								nextCategory,
								movementForm.subcategory,
							),
						})
						focusField('cash-movement.category')
					}}
				/>
				<div className="form-row">
					<SearchSelect
						label="Categoria"
						value={movementForm.category}
						options={
							movementForm.movement_type === 'income'
								? incomeCategorySelectOptions
								: expenseCategorySelectOptions
						}
						placeholder={
							movementForm.movement_type === 'income'
								? 'Categoria de ingreso'
								: 'Categoria de egreso'
						}
						focusKey="cash-movement.category"
						onChange={updateMovementCashCategory}
						onCreate={updateMovementCashCategory}
						createLabel={(value) => `Crear categoria "${value}"`}
					/>
					<SearchSelect
						label="Subcategoria"
						value={movementForm.subcategory ?? ''}
						options={movementSubcategorySelectOptions}
						placeholder={
							movementForm.category
								? 'Subcategoria'
								: 'Elegir categoria'
						}
						disabled={!movementForm.category}
						focusKey="cash-movement.subcategory"
						onChange={(value) =>
							setMovementForm({
								...movementForm,
								subcategory: value,
							})
						}
						onCreate={registerMovementSubcategory}
						createLabel={(value) => `Crear subcategoria "${value}"`}
					/>
				</div>
				<div className="form-row">
					<Field label="Importe">
						<input
							data-focus-key="cash-movement.amount"
							required
							type="number"
							min="0"
							value={movementForm.amount}
							onChange={(event) =>
								setMovementForm({
									...movementForm,
									amount: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
						/>
					</Field>
					<Field label="Fecha que impacta">
						<input
							data-focus-key="cash-movement.occurred_at"
							required
							type="datetime-local"
							value={movementForm.occurred_at}
							onChange={(event) =>
								setMovementForm({
									...movementForm,
									occurred_at: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
						/>
					</Field>
					<Field label="Corrige cierre">
						<input
							type="date"
							value={movementForm.adjusts_closed_day ?? ''}
							onChange={(event) =>
								setMovementForm({
									...movementForm,
									adjusts_closed_day: event.target.value,
									category: event.target.value
										? 'Ajustes'
										: movementForm.category,
									subcategory: event.target.value
										? 'Ajuste de cierre'
										: movementForm.subcategory,
								})
							}
						/>
					</Field>
				</div>
				{movementForm.adjusts_closed_day ? (
					<div className="info-note">
						El ajuste impacta hoy y deja trazado que corrige el cierre de{' '}
						<strong>{formatDateLabel(movementForm.adjusts_closed_day)}</strong>.
					</div>
				) : null}
				<Field label="Detalle">
					<textarea
						data-focus-key="cash-movement.description"
						value={movementForm.description}
						onChange={(event) =>
							setMovementForm({
								...movementForm,
								description: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<ReceiptText size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderDebtForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveDebt}>
				<Field label="Concepto">
					<input
						data-focus-key="debt.concept"
						required
						list="debt-concept-options"
						value={debtForm.concept}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								concept: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('debt.creditor')}
					/>
				</Field>
				<Field label="Acreedor">
					<input
						data-focus-key="debt.creditor"
						list="debt-creditor-options"
						value={debtForm.creditor}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								creditor: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('debt.amount')}
					/>
				</Field>
				<SearchSelect
					label="Proveedor vinculado"
					value={debtForm.supplier ?? ''}
					options={supplierOptions}
					placeholder="Sin proveedor"
					onChange={(value) => {
						const supplier = suppliers.find(
							(item) => String(item.id) === String(value),
						)
						setDebtForm({
							...debtForm,
							supplier: value,
							creditor: supplier?.name ?? debtForm.creditor,
						})
					}}
				/>
				<div className="form-row">
					<Field label="Total deuda">
						<input
							data-focus-key="debt.amount"
							required
							type="number"
							min="0"
							value={debtForm.principal_amount}
							onChange={(event) =>
								setDebtForm({
									...debtForm,
									principal_amount: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('debt.origin_date')}
						/>
					</Field>
					<Field label="Origen">
						<input
							data-focus-key="debt.origin_date"
							type="date"
							value={debtForm.origin_date}
							onChange={(event) =>
								setDebtForm({
									...debtForm,
									origin_date: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('debt.due_date')}
						/>
					</Field>
				</div>
				<Field label="Fecha limite">
					<input
						data-focus-key="debt.due_date"
						type="date"
						value={debtForm.due_date}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								due_date: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('debt.expense_category')}
					/>
				</Field>
				<div className="form-row">
					<SearchSelect
						label="Categoria del egreso"
						value={debtForm.expense_category ?? ''}
						options={debtExpenseCategorySelectOptions}
						placeholder="Categoria de egreso"
						focusKey="debt.expense_category"
						onChange={updateDebtExpenseCategory}
						onCreate={updateDebtExpenseCategory}
						createLabel={(value) => `Crear categoria "${value}"`}
					/>
					<SearchSelect
						label="Subcategoria"
						value={debtForm.expense_subcategory ?? ''}
						options={debtExpenseSubcategorySelectOptions}
						placeholder={
							debtForm.expense_category
								? 'Subcategoria'
								: 'Elegir categoria'
						}
						disabled={!debtForm.expense_category}
						focusKey="debt.expense_subcategory"
						onChange={(value) =>
							setDebtForm({
								...debtForm,
								expense_subcategory: value,
							})
						}
						onCreate={registerDebtSubcategory}
						createLabel={(value) => `Crear subcategoria "${value}"`}
					/>
				</div>
				<Field label="Notas">
					<textarea
						data-focus-key="debt.notes"
						value={debtForm.notes}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<div className="info-note">
					El total crea el egreso original de la deuda. Los pagos parciales quedan trazados abajo y no generan otro egreso.
				</div>
				<button className="primary">
					<ReceiptText size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderDebtPaymentForm(submitLabel = 'Guardar pago de deuda') {
		return (
			<form className="form-grid" onSubmit={saveDebtPayment}>
				{debtOptions.length ? null : (
					<div className="info-note">
						No hay deudas con saldo pendiente para pagar.
					</div>
				)}
				<SearchSelect
					label="Deuda"
					value={debtPaymentForm.debt}
					options={debtOptions}
					focusKey="debt-payment.debt"
					onChange={(value) => {
						setDebtPaymentForm({
							...debtPaymentForm,
							debt: value,
						})
						focusField('debt-payment.amount')
					}}
				/>
				{selectedDebtForPayment ? (
					<div className="finance-form-summary finance-form-summary--debt">
						<div>
							<span>Saldo pendiente</span>
							<strong>{money(selectedDebtForPayment.balance_due)}</strong>
						</div>
						<small>
							{joinDisplayParts([
								selectedDebtForPayment.creditor || 'Sin acreedor',
								selectedDebtForPayment.due_date
									? `Limite ${formatDateLabel(selectedDebtForPayment.due_date)}`
									: null,
							])}
						</small>
					</div>
				) : null}
				<div className="form-row">
					<Field label="Importe">
						<input
							data-focus-key="debt-payment.amount"
							required
							type="number"
							min="0"
							value={debtPaymentForm.amount}
							onChange={(event) =>
								setDebtPaymentForm({
									...debtPaymentForm,
									amount: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('debt-payment.paid_at')}
						/>
					</Field>
					<Field label="Fecha pago">
						<input
							data-focus-key="debt-payment.paid_at"
							type="date"
							value={debtPaymentForm.paid_at}
							onChange={(event) =>
								setDebtPaymentForm({
									...debtPaymentForm,
									paid_at: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('debt-payment.method', true)}
						/>
					</Field>
				</div>
				<SearchSelect
					label="Medio"
					value={debtPaymentForm.method}
					options={Object.entries(debtPaymentMethodLabels).map(
						([value, label]) => ({ value, label }),
					)}
					focusKey="debt-payment.method"
					onChange={(value) => {
						setDebtPaymentForm({
							...debtPaymentForm,
							method: value || DEFAULT_PAYMENT_METHOD,
						})
						focusField('debt-payment.notes')
					}}
				/>
				<Field label="Notas">
					<textarea
						data-focus-key="debt-payment.notes"
						value={debtPaymentForm.notes}
						onChange={(event) =>
							setDebtPaymentForm({
								...debtPaymentForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<div className="info-note">
					Este pago queda como trazabilidad de deuda y no genera otro egreso en los reportes economicos.
				</div>
				<button className="primary">
					<CreditCard size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderMaterialForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveMaterial}>
				<Field label="Nombre">
					<input
						data-focus-key="material.name"
						required
						list="material-name-options"
						value={materialForm.name}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								name: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('material.unit')}
					/>
				</Field>
				<div className="form-row">
					<Field label="Unidad">
						<input
							data-focus-key="material.unit"
							required
							list="material-unit-options"
							value={materialForm.unit}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									unit: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('material.stock')}
						/>
					</Field>
					<Field label="Categoria">
						<input
							list="material-category-options"
							value={materialForm.category}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									category: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="form-row">
					<Field label="SKU">
						<input
							value={materialForm.sku}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									sku: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Presentacion">
						<input
							value={materialForm.presentation}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									presentation: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="form-row">
					<Field label="Stock">
						<input
							data-focus-key="material.stock"
							type="number"
							min="0"
							value={materialForm.stock_quantity}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									stock_quantity: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Stock minimo">
						<input
							type="number"
							min="0"
							value={materialForm.minimum_stock}
							onChange={(event) =>
								setMaterialForm({
									...materialForm,
									minimum_stock: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="info-note">
					Costo unitario automatico por ultima compra:{' '}
					<strong>{money(materialForm.estimated_unit_cost)}</strong>
				</div>
				<button className="primary">
					<Package size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderSupplierForm(
		submitLabel: string,
		onSubmit: (event: FormEvent) => void | Promise<void> = saveSupplier,
	) {
		return (
			<form className="form-grid" onSubmit={onSubmit}>
				<Field label="Nombre">
					<input
						data-focus-key="supplier.name"
						required
						list="supplier-name-options"
						value={supplierForm.name}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								name: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Razon social">
					<input
						list="supplier-legal-name-options"
						value={supplierForm.legal_name}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								legal_name: event.target.value,
							})
						}
					/>
				</Field>
				<div className="form-row">
					<Field label="Rubro">
						<input
							list="supplier-category-options"
							value={supplierForm.category}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									category: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Condicion fiscal">
						<input
							list="supplier-tax-condition-options"
							value={supplierForm.tax_condition}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									tax_condition: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="form-row">
					<Field label="Contacto">
						<input
							value={supplierForm.contact_name}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									contact_name: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Telefono">
						<input
							value={supplierForm.phone}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									phone: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="form-row">
					<Field label="Email">
						<input
							type="email"
							value={supplierForm.email}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									email: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="CUIT / tax id">
						<input
							value={supplierForm.tax_id}
							onChange={(event) =>
								setSupplierForm({
									...supplierForm,
									tax_id: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<Field label="Website">
					<input
						type="url"
						value={supplierForm.website}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								website: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Direccion">
					<input
						value={supplierForm.address}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								address: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Notas">
					<textarea
						value={supplierForm.notes}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<Building2 size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderStockMovementForm(submitLabel: string) {
		return (
			<form className="form-grid stock-movement-form" onSubmit={saveStockMovement}>
				<div className="form-row">
					<SearchSelect
						label="Tipo de movimiento"
						value={stockMovementForm.movement_type}
						options={stockMovementTypeOptions}
						focusKey="stock-movement.type"
						onChange={(value) =>
							setStockMovementForm({
								...blankStockMovementForm(selectedDay),
								movement_type: value || 'purchase',
							})
						}
					/>
					<Field label="Fecha">
						<input
							type="date"
							value={stockMovementForm.occurred_on}
							onChange={(event) =>
								setStockMovementForm({
									...stockMovementForm,
									occurred_on: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				{stockMovementRequiresSupplier ? (
					<div className="form-row">
						<SearchSelect
							label="Proveedor"
							value={stockMovementForm.supplier}
							options={supplierOptions}
							placeholder="Sin proveedor"
							focusKey="stock-movement.supplier"
							className={flashClass(fieldFlashKey('stock-movement.supplier'))}
							onAdd={() =>
								openQuickCreate('supplier', 'stock-movement.supplier')
							}
							addLabel="Nuevo proveedor"
							onCreate={(value) =>
								void createSupplierFromName(value, 'stock-movement.supplier')
							}
							createLabel={(value) => `Crear proveedor "${value}"`}
							onChange={(value) =>
								setStockMovementForm({
									...stockMovementForm,
									supplier: value,
								})
							}
						/>
						<SearchSelect
							label="Tipo de comprobante"
							value={stockMovementForm.document_type}
							options={stockDocumentTypeOptions}
							onChange={(value) =>
								setStockMovementForm({
									...stockMovementForm,
									document_type: value,
								})
							}
						/>
					</div>
				) : null}
				{stockMovementRequiresCustomer ? (
					<SearchSelect
						label="Cliente"
						value={stockMovementForm.customer}
						options={customerOptions}
						onChange={(value) =>
							setStockMovementForm({
								...stockMovementForm,
								customer: value,
							})
						}
					/>
				) : null}
				{stockMovementRequiresReservation ? (
					<SearchSelect
						label="Reserva"
						value={stockMovementForm.reservation}
						options={reservationOptions}
						onChange={(value) =>
							setStockMovementForm({
								...stockMovementForm,
								reservation: value,
							})
						}
					/>
				) : null}
				{stockMovementRequiresSupplier ? (
					<div className="form-row">
						<Field label="Numero de comprobante">
							<input
								value={stockMovementForm.document_number}
								onChange={(event) =>
									setStockMovementForm({
										...stockMovementForm,
										document_number: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Adjunto">
							<input
								type="file"
								accept="image/*,.pdf"
								onChange={(event) =>
									setStockMovementDocumentFile(
										event.target.files?.[0] ?? null,
									)
								}
							/>
						</Field>
					</div>
				) : null}
				<div className="stock-lines">
					{stockMovementLines.map((line: AnyRecord, index: number) => {
						const selectedMaterial = materials.find(
							(item) => String(item.id) === String(line.material),
						)
						return (
							<div className="quote-line stock-line" key={index}>
								<SearchSelect
								label="Producto"
								value={line.material}
								options={materialOptions}
								onChange={(value) => {
									const nextMaterial = materials.find(
										(item) => String(item.id) === String(value),
									)
									updateStockMovementLine(index, {
										material: value,
										unit_price:
											stockMovementForm.movement_type === 'consumption'
												? nextMaterial?.estimated_unit_cost ?? ''
												: line.unit_price,
									})
								}}
							/>
								<Field label="Cantidad">
									<input
										required
										type="number"
										min="0"
										value={line.quantity}
										onChange={(event) =>
											updateStockMovementLine(index, {
												quantity: event.target.value,
											})
										}
									/>
								</Field>
								<Field label={stockMovementForm.movement_type === 'consumption' ? 'Costo ref.' : 'Precio unitario'}>
									<input
										type="number"
										min="0"
										value={line.unit_price}
										placeholder={
											stockMovementForm.movement_type === 'consumption'
												? String(selectedMaterial?.estimated_unit_cost ?? '0')
												: ''
										}
										onChange={(event) =>
											updateStockMovementLine(index, {
												unit_price: event.target.value,
											})
										}
									/>
								</Field>
								<button
									type="button"
									className="ghost"
									onClick={() => removeStockMovementLine(index)}
								>
									<Trash2 size={16} />
								</button>
							</div>
						)
					})}
				</div>
				<button type="button" className="ghost" onClick={addStockMovementLine}>
					<Plus size={16} />
					Agregar producto
				</button>
				<div className="material-summary">
					<div className="material-kpi">
						<span>Productos</span>
						<strong>{stockMovementLines.length}</strong>
					</div>
					<div className="material-kpi">
						<span>Total</span>
						<strong>{money(stockMovementTotal)}</strong>
					</div>
				</div>
				{stockMovementForm.movement_type === 'purchase' ? (
					<div className="form-row">
						<label>
							<input
								type="checkbox"
								checked={stockMovementForm.products_received}
								onChange={(event) =>
									setStockMovementForm({
										...stockMovementForm,
										products_received: event.target.checked,
									})
								}
							/>
							Productos recibidos
						</label>
						<label>
							<input
								type="checkbox"
								checked={stockMovementForm.affects_cash}
								onChange={(event) =>
									setStockMovementForm({
										...stockMovementForm,
										affects_cash: event.target.checked,
									})
								}
							/>
							Impacta en caja
						</label>
					</div>
				) : null}
				{stockMovementForm.movement_type === 'sale' ? (
					<SearchSelect
						label="Metodo de cobro"
						value={stockMovementForm.payment_method}
						options={stockPaymentMethodOptions}
						onChange={(value) =>
							setStockMovementForm({
								...stockMovementForm,
								payment_method: value || DEFAULT_PAYMENT_METHOD,
							})
						}
					/>
				) : null}
				<Field label="Notas">
					<textarea
						value={stockMovementForm.notes}
						onChange={(event) =>
							setStockMovementForm({
								...stockMovementForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<Package size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderPurchaseForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={savePurchase}>
				<SearchSelect
					label="Material"
					value={purchaseForm.material}
					options={materialOptions}
					focusKey="material-purchase.material"
					className={flashClass(fieldFlashKey('purchase.material'))}
					onAdd={() => openQuickCreate('material', 'purchase.material')}
					onChange={(value) => {
						setPurchaseForm({
							...purchaseForm,
							material: value,
						})
						focusField('material-purchase.quantity')
					}}
				/>
				<div className="form-row">
					<Field label="Cantidad">
						<input
							data-focus-key="material-purchase.quantity"
							required
							type="number"
							min="0"
							value={purchaseForm.quantity}
							onChange={(event) =>
								setPurchaseForm({
									...purchaseForm,
									quantity: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('material-purchase.total_cost')}
						/>
					</Field>
					<Field label="Costo total">
						<input
							data-focus-key="material-purchase.total_cost"
							required
							type="number"
							min="0"
							value={purchaseForm.total_cost}
							onChange={(event) =>
								setPurchaseForm({
									...purchaseForm,
									total_cost: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<div className="info-note">
					Valor calculado por unidad:{' '}
					<strong>
						{money(
							calculatedUnitCost(
								purchaseForm.quantity,
								purchaseForm.total_cost,
							),
						)}
					</strong>
					{selectedPurchaseMaterial ? ` por ${selectedPurchaseMaterial.unit}` : ''}
				</div>
				<label>
					<input
						type="checkbox"
						checked={purchaseForm.affects_cash}
						onChange={(event) =>
							setPurchaseForm({
								...purchaseForm,
								affects_cash: event.target.checked,
							})
						}
					/>
					Impacta en caja
				</label>
				<button className="primary">{submitLabel}</button>
			</form>
		)
	}

	function renderOpenUnitForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveOpenUnit}>
				<SearchSelect
					label="Material"
					value={openUnitForm.material}
					options={materialOptions}
					focusKey="material-open-unit.material"
					className={flashClass(fieldFlashKey('open-unit.material'))}
					onAdd={() => openQuickCreate('material', 'open-unit.material')}
					onChange={(value) => {
						setOpenUnitForm({
							...openUnitForm,
							material: value,
						})
						focusField('material-open-unit.work_order', true)
					}}
				/>
				<SearchSelect
					label="Trabajo de apertura"
					value={openUnitForm.opened_by_work_order}
					options={workOrderOptions}
					placeholder="Sin trabajo asociado"
					focusKey="material-open-unit.work_order"
					onChange={(value) => {
						setOpenUnitForm({
							...openUnitForm,
							opened_by_work_order: value,
						})
						focusField('material-open-unit.opened_at')
					}}
				/>
				<div className="form-row">
					<Field label="Fecha apertura">
						<input
							data-focus-key="material-open-unit.opened_at"
							type="date"
							value={openUnitForm.opened_at}
							onChange={(event) =>
								setOpenUnitForm({
									...openUnitForm,
									opened_at: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('material-open-unit.quantity')}
						/>
					</Field>
					<Field label="Cantidad al cerrar">
						<input
							data-focus-key="material-open-unit.quantity"
							required
							type="number"
							min="0"
							value={openUnitForm.stock_quantity_to_decrement}
							onChange={(event) =>
								setOpenUnitForm({
									...openUnitForm,
									stock_quantity_to_decrement: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('material-open-unit.notes')}
						/>
					</Field>
				</div>
				{selectedOpenUnitFormMaterial ? (
					<div className="info-note">
						Stock registrado:{' '}
						<strong>
							{quantity(
								selectedOpenUnitFormMaterial.stock_quantity,
								selectedOpenUnitFormMaterial.unit,
							)}
						</strong>
						. Abrir una unidad no descuenta stock; el descuento se aplica al finalizarla.
					</div>
				) : null}
				<Field label="Observaciones">
					<textarea
						data-focus-key="material-open-unit.notes"
						value={openUnitForm.observations}
						onChange={(event) =>
							setOpenUnitForm({
								...openUnitForm,
								observations: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<Package size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderMaterialConsumptionForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveConsumption}>
				{renderConsumptionFields(true)}
				<button className="primary">{submitLabel}</button>
			</form>
		)
	}

	function renderToolForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveTool}>
				<Field label="Nombre">
					<input
						data-focus-key="tool.name"
						required
						list="tool-name-options"
						value={toolForm.name}
						onChange={(event) =>
							setToolForm({
								...toolForm,
								name: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('tool.quantity')}
					/>
				</Field>
				<div className="form-row">
					<Field label="Cantidad">
						<input
							data-focus-key="tool.quantity"
							required
							type="number"
							min="0"
							step="1"
							value={toolForm.quantity}
							onChange={(event) =>
								setToolForm({
									...toolForm,
									quantity: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('tool.status', true)}
						/>
					</Field>
					<SearchSelect
						label="Estado"
						value={toolForm.status}
						options={toolStatusOptions}
						focusKey="tool.status"
						onChange={(value) => {
							setToolForm({
								...toolForm,
								status: value || 'in_use',
							})
							focusField('tool.unit_value')
						}}
					/>
				</div>
				<div className="form-row">
					<Field label="Valor unitario">
						<input
							data-focus-key="tool.unit_value"
							type="number"
							min="0"
							value={toolForm.unit_value}
							onChange={(event) =>
								setToolForm({
									...toolForm,
									unit_value: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('tool.purchased_at')}
						/>
					</Field>
					<Field label="Fecha compra">
						<input
							data-focus-key="tool.purchased_at"
							type="date"
							value={toolForm.purchased_at}
							onChange={(event) =>
								setToolForm({
									...toolForm,
									purchased_at: event.target.value,
								})
							}
							onKeyDown={focusNextOnEnter('tool.notes')}
						/>
					</Field>
				</div>
				<div className="info-note">
					Valor total estimado: <strong>{money(toolTotalValue(toolForm))}</strong>
				</div>
				<Field label="Notas">
					<textarea
						data-focus-key="tool.notes"
						value={toolForm.notes}
						onChange={(event) =>
							setToolForm({
								...toolForm,
								notes: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<Hammer size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function renderExpenseClassificationForm() {
		const editing = Boolean(expenseClassificationForm.originalCategory)
		const movementType =
			expenseClassificationForm.movement_type === 'income'
				? 'income'
				: 'expense'
		const movementLabel = movementType === 'income' ? 'ingreso' : 'egreso'
		return (
			<form className="form-grid" onSubmit={saveExpenseClassification}>
				<SearchSelect
					label="Tipo"
					value={movementType}
					options={[
						{ value: 'income', label: 'Ingreso' },
						{ value: 'expense', label: 'Egreso' },
					]}
					disabled={editing}
					focusKey="expense-classification.type"
					onChange={(value) => {
						const nextType = value === 'income' ? 'income' : 'expense'
						setExpenseClassificationForm({
							...expenseClassificationForm,
							movement_type: nextType,
							category: '',
							subcategory: '',
						})
						focusField('expense-classification.category')
					}}
				/>
				<SearchSelect
					label={`Categoria de ${movementLabel}`}
					value={expenseClassificationForm.category}
					options={settingsClassificationCategoryOptions}
					placeholder={`Categoria de ${movementLabel}`}
					focusKey="expense-classification.category"
					onChange={(value) =>
						setExpenseClassificationForm({
							...expenseClassificationForm,
							category: value,
						})
					}
					onCreate={(value) =>
						setExpenseClassificationForm({
							...expenseClassificationForm,
							category: value,
						})
					}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<Field label="Denominacion subcategoria">
					<input
						required
						list="settings-classification-subcategory-options"
						data-focus-key="expense-classification.subcategory"
						value={expenseClassificationForm.subcategory}
						onChange={(event) =>
							setExpenseClassificationForm({
								...expenseClassificationForm,
								subcategory: event.target.value,
							})
						}
					/>
				</Field>
				<div className="info-note">
					Las combinaciones guardadas alimentan los desplegables de Caja.
					Las de egresos tambien se usan en Deudas.
				</div>
				<div className="record-actions">
					{editing ? (
						<button
							type="button"
							className="ghost"
							onClick={() => {
								resetExpenseClassificationForm()
								formModalExit.close()
							}}
						>
							Cancelar
						</button>
					) : null}
					<button className="primary">
						<ReceiptText size={16} />
						{editing ? 'Guardar cambios' : 'Crear subcategoria'}
					</button>
				</div>
			</form>
		)
	}

	function renderEmployeeForm(submitLabel: string) {
		return (
			<form className="form-grid" onSubmit={saveEmployee}>
				<Field label="Usuario">
					<input
						data-focus-key="employee.username"
						required
						autoComplete="username"
						value={employeeForm.username}
						onChange={(event) =>
							setEmployeeForm({
								...employeeForm,
								username: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('employee.email')}
					/>
				</Field>
				<Field label="Email">
					<input
						data-focus-key="employee.email"
						type="email"
						autoComplete="email"
						value={employeeForm.email}
						onChange={(event) =>
							setEmployeeForm({
								...employeeForm,
								email: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('employee.password')}
					/>
				</Field>
				<Field label="Contrasena inicial">
					<input
						data-focus-key="employee.password"
						required
						type="password"
						minLength={4}
						autoComplete="new-password"
						value={employeeForm.password}
						onChange={(event) =>
							setEmployeeForm({
								...employeeForm,
								password: event.target.value,
							})
						}
					/>
				</Field>
				<button className="primary">
					<Plus size={16} />
					{submitLabel}
				</button>
			</form>
		)
	}

	function publicRequestServicesText(item: AnyRecord) {
		const names = (item.items ?? [])
			.map((line: AnyRecord) => line.service_name || line.description)
			.filter(Boolean)
		return names.length ? names.join(', ') : 'Sin servicios'
	}

	function publicRequestVehicleText(item: AnyRecord) {
		return (
			joinDisplayParts([
				item.vehicle_license_plate,
				item.vehicle_brand,
				item.vehicle_model,
				item.vehicle_color,
			]) || 'Sin vehiculo informado'
		)
	}

	function publicRequestContactText(item: AnyRecord) {
		return joinDisplayParts([item.customer_phone, item.customer_email])
	}

	function publicRequestSelection(item: AnyRecord) {
		return publicRequestSelections[String(item.id)] ?? {}
	}

	function patchPublicRequestSelection(
		item: AnyRecord,
		patch: { customer?: string; vehicle?: string },
	) {
		const itemId = String(item.id)
		setPublicRequestSelections((current) => ({
			...current,
			[itemId]: {
				...current[itemId],
				...patch,
			},
		}))
	}

	async function archivePublicRequest(item: AnyRecord) {
		if (!canViewEconomy) return
		await runAction(
			() =>
				apiFetch(`/public-requests/${item.id}/archive/`, {
					method: 'POST',
				}),
			{
				flashTarget: recordFlashKey('public-request', item.id),
				successTitle: 'Solicitud archivada',
			},
		)
	}

	async function convertPublicRequest(item: AnyRecord) {
		if (!canViewEconomy) return
		const selection = publicRequestSelection(item)
		const payload: AnyRecord = {}
		if (selection.customer) {
			payload.customer = Number(selection.customer)
		}
		if (selection.vehicle) {
			payload.vehicle = Number(selection.vehicle)
		}
		const converted = await runAction(
			() =>
				apiFetch<AnyRecord>(`/public-requests/${item.id}/convert/`, {
					method: 'POST',
					body: JSON.stringify(payload),
				}),
			{
				flashTarget: (result: AnyRecord) =>
					result?.created_type === 'reservation'
						? recordFlashKey('reservation', result.reservation?.id)
						: recordFlashKey('quote', result.quote?.id),
				successTitle: (result: AnyRecord) =>
					result?.created_type === 'reservation'
						? 'Reserva creada'
						: 'Cotizacion creada',
			},
		)
		if (!converted) return
		setPublicRequestSelections((current) => {
			const next = { ...current }
			delete next[String(item.id)]
			return next
		})
		setActive(converted.created_type === 'reservation' ? 'agenda' : 'quotes')
	}

	function renderPublicRequestCard(item: AnyRecord) {
		const selection = publicRequestSelection(item)
		const customerSuggestions = item.suggestions?.customers ?? []
		const vehicleSuggestions = item.suggestions?.vehicles ?? []
		const isPending = item.status === 'pending'
		return (
			<MotionFlashSurface
				className={recordClass('public-request', item.id)}
				key={item.id}
			>
				<RecordCard>
					<RecordCardHeader
						title={item.customer_name}
						subtitle={
							<>
								{publicRequestTypeLabels[item.request_type] ?? item.request_type}{' '}
								- {publicRequestServicesText(item)}
							</>
						}
						actions={
							<StatusPill
								value={String(item.status ?? '')}
								labels={publicRequestStatusLabels}
							/>
						}
					>
						<div className="record-sub">
							{publicRequestContactText(item) || 'Sin contacto'} -{' '}
							{publicRequestVehicleText(item)}
						</div>
						{item.preferred_day ? (
							<div className="record-sub">
								Preferencia: {formatDateLabel(item.preferred_day)}
								{item.preferred_time ? ` ${item.preferred_time.slice(0, 5)}` : ''}
							</div>
						) : null}
					</RecordCardHeader>
					{item.message ? <p className="record-sub">{item.message}</p> : null}
					{isPending ? (
						<div className="public-request-resolution">
							<div className="public-request-resolution-note">
								<strong>Resolver solicitud</strong>
								<span>
									{customerSuggestions.length || vehicleSuggestions.length
										? 'Revisa coincidencias sugeridas antes de convertir o archivar.'
										: 'Al convertir se crean cliente y vehiculo nuevos si no elegis existentes.'}
								</span>
							</div>
							<Field label="Cliente">
								<select
									value={selection.customer ?? ''}
									onChange={(event) =>
										patchPublicRequestSelection(item, {
											customer: event.target.value,
										})
									}
								>
									<option value="">Crear nuevo cliente</option>
									{customerSuggestions.map((customer: AnyRecord) => (
										<option key={customer.id} value={customer.id}>
											{joinDisplayParts([
												customer.label ?? customer.name,
												customer.phone,
												customer.email,
											])}
										</option>
									))}
								</select>
							</Field>
							<Field label="Vehiculo">
								<select
									value={selection.vehicle ?? ''}
									onChange={(event) =>
										patchPublicRequestSelection(item, {
											vehicle: event.target.value,
										})
									}
								>
									<option value="">Crear nuevo vehiculo</option>
									{vehicleSuggestions.map((vehicle: AnyRecord) => (
										<option key={vehicle.id} value={vehicle.id}>
											{joinDisplayParts([
												vehicle.label,
												vehicle.customer_name,
											])}
										</option>
									))}
								</select>
							</Field>
							<div className="record-actions">
								<button
									type="button"
									className="primary"
									onClick={() => convertPublicRequest(item)}
								>
									<CheckCircle2 size={16} />
									Convertir solicitud
								</button>
								<button
									type="button"
									className="ghost"
									onClick={() => archivePublicRequest(item)}
								>
									<Trash2 size={16} />
									Archivar
								</button>
							</div>
						</div>
					) : (
						<div className="record-sub">
							{item.converted_reservation
								? `Reserva #${item.converted_reservation}`
								: item.converted_quote
									? `Cotizacion #${item.converted_quote}`
									: item.archived_at
										? `Archivada ${formatDateTimeLabel(item.archived_at)}`
										: 'Gestionada'}
						</div>
					)}
				</RecordCard>
			</MotionFlashSurface>
		)
	}

	function renderProfileModal() {
		if (!currentUser) return null
		return (
			<form className="form-grid" onSubmit={saveProfile}>
				<div className="detail-grid profile-detail-grid">
					<div className="detail-row">
						<span>ID</span>
						<strong>{currentUser.id}</strong>
					</div>
					<div className="detail-row">
						<span>Usuario</span>
						<strong>{currentUser.username}</strong>
					</div>
					<label className="detail-row" htmlFor="profile-email">
						<span>Email</span>
						<div className="profile-detail-control">
							<input
								id="profile-email"
								name="profile_email"
								className="profile-detail-input"
								type="email"
								autoComplete="email"
								value={profileForm.email}
								onChange={(event) =>
									setProfileForm({
										...profileForm,
										email: event.target.value,
									})
								}
							/>
						</div>
					</label>
					<div className="detail-row">
						<span>Rol</span>
						<strong>{profileRoleLabel(currentUser)}</strong>
					</div>
					<div className="detail-row">
						<span>Estado</span>
						<strong>{profileActiveText(currentUser)}</strong>
					</div>
					{profileTrialText(currentUser) ? (
						<div className="detail-row">
							<span>Prueba</span>
							<strong>{profileTrialText(currentUser)}</strong>
						</div>
					) : null}
					<div className="detail-row">
						<span>Alta</span>
						<strong>{profileJoinedText(currentUser)}</strong>
					</div>
					<div className="detail-row">
						<span>Acceso</span>
						<strong>{profileLastLoginText(currentUser)}</strong>
					</div>
					<label className="detail-row" htmlFor="profile-subscription-type">
						<span>Plan interno</span>
						<div className="profile-detail-control">
							<select
								id="profile-subscription-type"
								name="profile_subscription_type"
								className="profile-detail-input"
								value={profileForm.subscription_type}
								onChange={(event) =>
									setProfileForm({
										...profileForm,
										subscription_type: event.target.value,
									})
								}
								disabled={!canViewEconomy}
							>
								{subscriptionTypeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</label>
					<div className="detail-row">
						<span id="profile-phone-label">Celular</span>
						<div className="profile-detail-control">
							<div className="profile-phone-composite">
								<select
									name="profile_phone_country_code"
									className="profile-country-select"
									aria-label="Codigo de pais"
									value={profileForm.phone_country_code}
									onChange={(event) =>
										setProfileForm({
											...profileForm,
											phone_country_code: event.target.value,
										})
									}
								>
									{profilePhoneCountryOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
								<input
									name="profile_phone_number"
									className="profile-phone-input"
									type="tel"
									inputMode="tel"
									autoComplete="tel-national"
									aria-labelledby="profile-phone-label"
									placeholder="2345 45-5007"
									value={profileForm.phone_number}
									onChange={(event) =>
										setProfileForm({
											...profileForm,
											phone_number: event.target.value,
										})
									}
								/>
							</div>
						</div>
					</div>
				</div>
				{!canViewEconomy ? (
					<div className="record-sub">
						Solo el empleador puede cambiar esta referencia interna.
					</div>
				) : (
					<div className="record-sub">
						Referencia interna de demo; no cobra ni cambia billing real.
					</div>
				)}
				<div className="modal-actions split">
					<button type="button" className="danger" onClick={handleProfileLogout}>
						<LogOut size={16} />
						Salir
					</button>
					<button type="submit" className="primary">
						Guardar perfil
					</button>
				</div>
			</form>
		)
	}

	return (
		<>
			<DataList id="customer-name-options" values={customerNameValues} />
			<DataList
				id="customer-phone-options"
				values={customerPhoneValues}
			/>
			<DataList
				id="customer-email-options"
				values={customerEmailValues}
			/>
			<DataList id="vehicle-plate-options" values={vehiclePlateValues} />
			<DataList id="vehicle-color-options" values={vehicleColorValues} />
			<DataList id="service-name-options" values={serviceNameValues} />
			<DataList id="material-name-options" values={materialNameValues} />
			<DataList id="material-category-options" values={materialCategoryValues} />
			<DataList id="material-unit-options" values={materialUnitValues} />
			<DataList id="supplier-name-options" values={supplierNameValues} />
			<DataList
				id="supplier-legal-name-options"
				values={supplierLegalNameValues}
			/>
			<DataList
				id="supplier-category-options"
				values={supplierCategoryValues}
			/>
			<DataList
				id="supplier-tax-condition-options"
				values={supplierTaxConditionValues}
			/>
			<DataList id="tool-name-options" values={toolNameValues} />
			<DataList id="debt-concept-options" values={debtConceptValues} />
			<DataList id="debt-creditor-options" values={debtCreditorValues} />
			<DataList id="cash-category-options" values={cashCategoryValues} />
			<DataList
				id="cash-category-income-options"
				values={cashIncomeCategoryValues}
			/>
			<DataList
				id="cash-category-expense-options"
				values={cashExpenseCategoryValues}
			/>
			<DataList
				id="cash-subcategory-options"
				values={selectedMovementSubcategoryValues.length ? selectedMovementSubcategoryValues : cashSubcategoryValues}
			/>
			<DataList
				id="debt-expense-subcategory-options"
				values={debtExpenseSubcategoryValues.length ? debtExpenseSubcategoryValues : cashSubcategoryValues}
			/>
			<DataList
				id="settings-classification-subcategory-options"
				values={settingsClassificationSubcategoryOptions.map((option) => option.value)}
			/>
			<AnimatePresence initial={false}>
				{profileModalOpen ? (
					<Modal
						key="profile-modal"
						title="Mi perfil"
						onClose={profileExit.close}
					>
						{renderProfileModal()}
					</Modal>
				) : null}
				{formModal?.kind === 'customer' ? (
					<Modal
						key="form-customer"
						title="Nuevo cliente"
						onClose={formModalExit.close}
					>
						{renderCustomerForm('Guardar cliente')}
					</Modal>
				) : null}
				{formModal?.kind === 'vehicle' ? (
					<Modal
						key="form-vehicle"
						title="Nuevo vehiculo"
						onClose={formModalExit.close}
					>
						{renderVehicleForm('Guardar vehiculo')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'quote' ? (
					<Modal
						key="form-quote"
						title="Nueva cotizacion"
						onClose={formModalExit.close}
					>
						{renderQuoteForm('Crear cotizacion')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'service' ? (
					<Modal
						key="form-service"
						title="Nuevo servicio"
						onClose={formModalExit.close}
					>
						{renderServiceForm('Guardar servicio')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'payment' ? (
					<Modal
						key="form-payment"
						title="Registrar pago"
						onClose={formModalExit.close}
					>
						{renderPaymentForm('Guardar pago')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'cash-movement' ? (
					<Modal
						key="form-cash-movement"
						title="Movimiento manual"
						onClose={formModalExit.close}
					>
						{renderCashMovementForm('Guardar movimiento')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'expense-classification' ? (
					<Modal
						key="form-expense-classification"
						title={
							expenseClassificationForm.originalCategory
								? 'Editar clasificacion de caja'
								: 'Nueva clasificacion de caja'
						}
						onClose={() => {
							resetExpenseClassificationForm()
							formModalExit.close()
						}}
					>
						{renderExpenseClassificationForm()}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'debt' ? (
					<Modal
						key="form-debt"
						title="Nueva deuda"
						onClose={formModalExit.close}
					>
						{renderDebtForm('Guardar deuda')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'debt-payment' ? (
					<Modal
						key="form-debt-payment"
						title="Registrar pago de deuda"
						onClose={formModalExit.close}
					>
						{renderDebtPaymentForm()}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'material' ? (
					<Modal
						key="form-material"
						title="Nuevo material"
						onClose={formModalExit.close}
					>
						{renderMaterialForm('Guardar material')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'supplier' ? (
					<Modal
						key="form-supplier"
						title="Nuevo proveedor"
						onClose={formModalExit.close}
					>
						{renderSupplierForm('Guardar proveedor')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'stock-movement' ? (
					<Modal
						key="form-stock-movement"
						title="Crear movimiento de stock"
						onClose={formModalExit.close}
					>
						{renderStockMovementForm('Crear movimiento')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'material-purchase' ? (
					<Modal
						key="form-material-purchase"
						title="Registrar compra"
						onClose={formModalExit.close}
					>
						{renderPurchaseForm('Guardar compra')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'material-open-unit' ? (
					<Modal
						key="form-material-open-unit"
						title="Abrir unidad"
						onClose={formModalExit.close}
					>
						{renderOpenUnitForm('Abrir unidad')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'material-consumption' ? (
					<Modal
						key="form-material-consumption"
						title="Registrar consumo"
						onClose={formModalExit.close}
					>
						{renderMaterialConsumptionForm('Registrar consumo')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'tool' ? (
					<Modal
						key="form-tool"
						title="Nueva herramienta"
						onClose={formModalExit.close}
					>
						{renderToolForm('Guardar herramienta')}
					</Modal>
				) : null}
				{canViewEconomy && formModal?.kind === 'employee' ? (
					<Modal
						key="form-employee"
						title="Nuevo empleado"
						onClose={formModalExit.close}
					>
						{renderEmployeeForm('Crear empleado')}
					</Modal>
				) : null}
				{reservationForQuote ? (
					<Modal
						key={`reservation-from-quote:${reservationForQuote.id}`}
						title={`Crear reserva desde cotizacion #${reservationForQuote.id}`}
						onClose={quoteReservationExit.close}
					>
						<form className="form-grid" onSubmit={saveReservationFromQuote}>
							{reservationForQuote.vehicle ? null : (
								<SearchSelect
									label="Vehiculo"
									value={quoteReservationForm.vehicle}
									options={quoteReservationVehicleOptions}
									name="quote_reservation_vehicle"
									onChange={(value) =>
										setQuoteReservationForm({
											...quoteReservationForm,
											vehicle: value,
										})
									}
								/>
							)}
							<div className="form-row">
								<Field label="Fecha de reserva">
									<input
										name="quote_reservation_day"
										required
										type="date"
										value={quoteReservationForm.day}
										onChange={(event) =>
											setQuoteReservationForm({
												...quoteReservationForm,
												day: event.target.value,
											})
										}
									/>
								</Field>
							</div>
							{useReservationTimes ? (
								<div className="form-row">
									<Field label="Hora de ingreso">
										<input
											type="time"
											name="quote_reservation_start_time"
											value={quoteReservationForm.start_time}
											onChange={(event) =>
												setQuoteReservationForm({
													...quoteReservationForm,
													start_time: event.target.value,
												})
											}
										/>
									</Field>
									<Field label="Hora de egreso">
										<input
											type="time"
											name="quote_reservation_exit_time"
											value={quoteReservationForm.exit_time}
											onChange={(event) =>
												setQuoteReservationForm({
													...quoteReservationForm,
													exit_time: event.target.value,
												})
											}
										/>
									</Field>
								</div>
							) : null}
							<button className="primary">
								<CalendarDays size={16} />
								Crear reserva
							</button>
						</form>
					</Modal>
				) : null}
				{quickReservationDay ? (
					<Modal
						key={`quick-reservation:${quickReservationDay}`}
						title={
							quickReservationPrefillDay
								? `Nueva reserva - ${formatDayName(quickReservationDay)} ${formatDayLabel(quickReservationDay)}`
								: 'Crear cotizacion o reserva'
						}
						onClose={quickReservationExit.close}
					>
						<form className="form-grid" onSubmit={saveReservation}>
							{quickReservationPrefillDay ? (
								<div className="info-note">
									La fecha de la columna queda cargada automaticamente. Si la
									quitas y dejas la hora vacia, se crea una cotizacion libre.
								</div>
							) : (
								<div className="info-note">
									Sin fecha se crea una cotizacion libre. Si cargas fecha, se crea
									la reserva con su cotizacion y la agenda se mantiene abierta.
								</div>
							)}
							{renderReservationForm(
								reservationForm.day ? 'Crear reserva' : 'Crear cotizacion',
							)}
						</form>
					</Modal>
				) : null}
				{quickCreate?.kind === 'customer' ? (
					<Modal
						key="quick-customer"
						title="Nuevo cliente"
						onClose={quickCreateExit.close}
					>
						<form className="form-grid" onSubmit={saveQuickCustomer}>
							<Field label="Nombre">
								<input
									name="quick_customer_name"
									autoComplete="name"
									required
									list="customer-name-options"
									value={customerForm.name}
									onChange={(event) =>
										setCustomerForm({
											...customerForm,
											name: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Telefono">
								<input
									name="quick_customer_phone"
									autoComplete="tel"
									inputMode="tel"
									list="customer-phone-options"
									value={customerForm.phone}
									onChange={(event) =>
										setCustomerForm({
											...customerForm,
											phone: event.target.value,
										})
									}
								/>
							</Field>
							<Field label="Email">
								<input
									name="quick_customer_email"
									type="email"
									autoComplete="email"
									list="customer-email-options"
									value={customerForm.email}
									onChange={(event) =>
										setCustomerForm({
											...customerForm,
											email: event.target.value,
										})
									}
								/>
							</Field>
							<div className="form-row">
								<Field label="CUIT/DNI">
									<input
										name="quick_customer_tax_id"
										autoComplete="off"
										value={customerForm.tax_id}
										onChange={(event) =>
											setCustomerForm({
												...customerForm,
												tax_id: event.target.value,
											})
										}
									/>
								</Field>
								<Field label="Domicilio fiscal">
									<input
										name="quick_customer_billing_address"
										autoComplete="street-address"
										value={customerForm.billing_address}
										onChange={(event) =>
											setCustomerForm({
												...customerForm,
												billing_address: event.target.value,
											})
										}
									/>
								</Field>
							</div>
							<BirthdayFields
								day={customerForm.birthday_day}
								month={customerForm.birthday_month}
								dayName="quick_customer_birthday_day"
								monthName="quick_customer_birthday_month"
								onDayChange={(value) =>
									setCustomerForm({
										...customerForm,
										birthday_day: value,
									})
								}
								onMonthChange={(value) =>
									setCustomerForm({
										...customerForm,
										birthday_month: value,
									})
								}
							/>
							<button className="primary">
								<Plus size={16} />
								Crear cliente
							</button>
						</form>
					</Modal>
				) : null}
				{quickCreate?.kind === 'vehicle' ? (
					<Modal
						key="quick-vehicle"
						title="Nuevo vehiculo"
						onClose={quickCreateExit.close}
					>
						<form className="form-grid" onSubmit={saveQuickVehicle}>
							<SearchSelect
								label="Cliente"
								value={vehicleForm.customer}
								options={customerOptions}
								name="quick_vehicle_customer"
								className={flashClass(fieldFlashKey('vehicle.customer'))}
								onAdd={() =>
									openQuickCreate('customer', 'vehicle.customer')
								}
								onChange={(value) =>
									setVehicleForm({
										...vehicleForm,
										customer: value,
									})
								}
							/>
							<div className="form-row">
								<SearchSelect
									label="Marca"
									value={vehicleForm.brand}
									options={vehicleBrandSelectOptions}
									name="quick_vehicle_brand"
									placeholder="Sin marca"
									onChange={updateVehicleBrand}
									onCreate={updateVehicleBrand}
									createLabel={(value) => `Crear marca "${value}"`}
								/>
								<SearchSelect
									label="Modelo"
									value={vehicleForm.model}
									options={vehicleModelSelectOptions}
									name="quick_vehicle_model"
									placeholder={
										vehicleForm.brand ? 'Sin modelo' : 'Elegir marca'
									}
									disabled={!vehicleForm.brand && !vehicleForm.model}
									onChange={(value) =>
										setVehicleForm({
											...vehicleForm,
											model: value,
										})
									}
									onCreate={(value) =>
										setVehicleForm({
											...vehicleForm,
											model: value,
										})
									}
									createLabel={(value) => `Crear modelo "${value}"`}
								/>
							</div>
							<div className="form-row">
								<Field label="Color">
									<input
										name="quick_vehicle_color"
										autoComplete="off"
										list="vehicle-color-options"
										value={vehicleForm.color}
										onChange={(event) =>
											setVehicleForm({
												...vehicleForm,
												color: event.target.value,
											})
										}
									/>
								</Field>
								<Field label="Patente">
									<input
										name="quick_vehicle_license_plate"
										autoComplete="off"
										list="vehicle-plate-options"
										value={vehicleForm.license_plate}
										onChange={(event) =>
											setVehicleForm({
												...vehicleForm,
												license_plate: event.target.value,
											})
										}
									/>
								</Field>
							</div>
							<button className="primary">
								<Plus size={16} />
								Crear vehiculo
							</button>
						</form>
					</Modal>
				) : null}
				{canViewEconomy && quickCreate?.kind === 'service' ? (
					<Modal
						key="quick-service"
						title="Nuevo servicio"
						onClose={quickCreateExit.close}
					>
						<form className="form-grid" onSubmit={saveQuickService}>
							<Field label="Nombre">
								<input
									required
									list="service-name-options"
									value={serviceForm.name}
									onChange={(event) =>
										setServiceForm({
											...serviceForm,
											name: event.target.value,
										})
									}
								/>
							</Field>
							<ServiceIconPicker
								value={String(serviceForm.icon ?? '')}
								onChange={(icon) =>
									setServiceForm({
										...serviceForm,
										icon,
									})
								}
							/>
							<SearchSelect
								label="Tipo"
								value={serviceForm.service_type}
								options={serviceFormTypeOptions}
								onChange={(value) =>
									setServiceForm({
										...serviceForm,
										service_type: value || 'wash',
									})
								}
							/>
							<div className="form-row">
								<Field label="Precio base">
									<input
										required
										type="number"
										min="0"
										value={serviceForm.base_price}
										onChange={(event) =>
											setServiceForm({
												...serviceForm,
												base_price: event.target.value,
											})
										}
									/>
								</Field>
								<Field label="Duracion min.">
									<input
										type="number"
										min="1"
										value={serviceForm.estimated_duration_minutes}
										onChange={(event) =>
											setServiceForm({
												...serviceForm,
												estimated_duration_minutes: event.target.value,
											})
										}
									/>
								</Field>
							</div>
							<button className="primary">
								<Plus size={16} />
								Crear servicio
							</button>
						</form>
					</Modal>
				) : null}
				{canViewEconomy && quickCreate?.kind === 'material' ? (
					<Modal
						key="quick-material"
						title="Nuevo material"
						onClose={quickCreateExit.close}
					>
						<form className="form-grid" onSubmit={saveQuickMaterial}>
							<Field label="Nombre">
								<input
									required
									list="material-name-options"
									value={materialForm.name}
									onChange={(event) =>
										setMaterialForm({
											...materialForm,
											name: event.target.value,
										})
									}
								/>
							</Field>
							<div className="form-row">
								<Field label="Unidad">
									<input
										required
										list="material-unit-options"
										value={materialForm.unit}
										onChange={(event) =>
											setMaterialForm({
												...materialForm,
												unit: event.target.value,
											})
										}
									/>
								</Field>
								<Field label="Stock inicial">
									<input
										type="number"
										min="0"
										value={materialForm.stock_quantity}
										onChange={(event) =>
											setMaterialForm({
												...materialForm,
												stock_quantity: event.target.value,
											})
										}
									/>
								</Field>
							</div>
							<div className="info-note">
								El costo unitario se completa con la primera compra.
							</div>
							<button className="primary">
								<Plus size={16} />
								Crear material
							</button>
						</form>
					</Modal>
				) : null}
				{canViewEconomy && quickCreate?.kind === 'supplier' ? (
					<Modal
						key="quick-supplier"
						title="Nuevo proveedor"
						onClose={quickCreateExit.close}
					>
						{renderSupplierForm('Crear proveedor', saveQuickSupplier)}
					</Modal>
				) : null}
				{canViewEconomy && consumeForOrder ? (
					<Modal
						key={`consumption:${consumeForOrder.id}`}
						title="Consumir materiales del trabajo"
						onClose={consumptionExit.close}
					>
						<form className="form-grid" onSubmit={saveConsumption}>
							<div className="info-note">
								{consumeForOrder.customer_name} -{' '}
								{consumeForOrder.vehicle_label} -{' '}
								{serviceDisplayName(consumeForOrder)}
							</div>
							{renderConsumptionFields(false)}
							<button className="primary">
								<Package size={16} />
								Registrar consumo
							</button>
						</form>
					</Modal>
				) : null}
				{canViewEconomy && paymentForOrder ? (
					<Modal
						key={`payment:${paymentForOrder.id}`}
						title="Cobrar trabajo de la reserva"
						onClose={paymentExit.close}
					>
						<form className="form-grid" onSubmit={savePayment}>
							<div className="info-note">
								{paymentForOrder.customer_name} -{' '}
								{paymentForOrder.vehicle_label} -{' '}
								{serviceDisplayName(paymentForOrder)}
							</div>
							{renderWorkOrderSummary(paymentForOrder)}
							<div className="form-row">
								<Field label="Importe">
									<input
										required
										type="number"
										min="0"
										value={agendaPaymentForm.amount}
										onChange={(event) =>
											setAgendaPaymentForm({
												...agendaPaymentForm,
												amount: event.target.value,
											})
										}
									/>
								</Field>{' '}
								<SearchSelect
									label="Tipo"
									value={agendaPaymentForm.payment_type}
									options={[
										{ value: 'payment', label: 'Pago' },
										{ value: 'deposit', label: 'Sena' },
									]}
									onChange={(value) =>
										setAgendaPaymentForm({
											...agendaPaymentForm,
											payment_type: value || DEFAULT_PAYMENT_TYPE,
										})
									}
								/>
							</div>{' '}
							<SearchSelect
								label="Medio"
								value={agendaPaymentForm.method}
								options={[
									{ value: 'cash', label: 'Efectivo' },
									{ value: 'card', label: 'Tarjeta' },
									{ value: 'transfer', label: 'Transferencia' },
									{ value: 'other', label: 'Otro' },
								]}
								onChange={(value) =>
									setAgendaPaymentForm({
										...agendaPaymentForm,
										method: value || DEFAULT_PAYMENT_METHOD,
									})
								}
							/>
							<Field label="Observaciones">
								<textarea
									value={agendaPaymentForm.notes}
									onChange={(event) =>
										setAgendaPaymentForm({
											...agendaPaymentForm,
											notes: event.target.value,
										})
									}
								/>
							</Field>
							<button className="primary">
								<CreditCard size={16} />
								Registrar pago
							</button>
						</form>
					</Modal>
				) : null}
				{detailModal &&
				(canViewEconomy || !detailRequiresEconomy(detailModal.kind)) ? (
					<DetailModal
						key={`detail:${detailModal.kind}:${detailModal.data?.id ?? detailModal.title}`}
						title={detailModal.title}
						data={detailModal.data}
						editing={detailModal.editing}
						editForm={renderDetailEditForm()}
						onClose={detailExit.close}
					/>
				) : null}
			</AnimatePresence>
			<AppShell
				theme={themeMode}
				sidebarOverlay={
					sidebarMobileOpen ? (
						<button
							type="button"
							className="sidebar-backdrop"
							aria-label="Cerrar menu lateral"
							aria-controls={SIDEBAR_NAV_ID}
							onClick={() => closeSidebarMobileMenu()}
						/>
					) : null
				}
				sidebar={
					<SidebarNav
						id={SIDEBAR_NAV_ID}
						collapsed={sidebarCollapsed}
						mobileOpen={sidebarMobileOpen}
						header={
							<div className="sidebar-top-stack">
								<AppBrand
									className="sidebar-brand"
									collapsed={sidebarCollapsed}
									themeMode={themeMode}
									titleAs="span"
								/>
								<button
									type="button"
									className="ghost sidebar-collapse-toggle"
									aria-controls={SIDEBAR_NAV_ID}
									aria-expanded={sidebarMobileOpen ? true : !sidebarCollapsed}
									aria-label={
										sidebarMobileOpen
											? 'Cerrar menu lateral'
											: sidebarCollapsed
												? 'Expandir sidebar'
												: 'Colapsar sidebar'
									}
									title={
										sidebarMobileOpen
											? 'Cerrar menu lateral'
											: sidebarCollapsed
												? 'Expandir sidebar'
												: 'Colapsar sidebar'
									}
									onClick={() => {
										if (sidebarMobileOpen) {
											closeSidebarMobileMenu()
											return
										}
										setSidebarCollapsed((current) => !current)
									}}
								>
									{sidebarMobileOpen ? (
										<X size={16} />
									) : sidebarCollapsed ? (
										<ChevronsRight size={16} />
									) : (
										<ChevronsLeft size={16} />
									)}
								</button>
							</div>
						}
						items={navItems}
						active={active}
						onChange={handleSectionChange}
						footer={
							!sidebarCollapsed ? (
								<div className="sidebar-footer-stack">
									<button
										aria-label={
											themeMode === 'dark'
												? 'Cambiar a modo claro'
												: 'Cambiar a modo oscuro'
										}
										aria-pressed={themeMode === 'dark'}
										className="theme-switch"
										onClick={toggleThemeMode}
										title={
											themeMode === 'dark'
												? 'Cambiar a modo claro'
												: 'Cambiar a modo oscuro'
										}
										type="button"
									>
										<span className="theme-switch-track" aria-hidden="true">
											<span className="theme-switch-thumb">
												<span
													className={`theme-switch-symbol theme-switch-symbol--${
														themeMode === 'dark' ? 'moon' : 'sun'
													}`}
												/>
											</span>
										</span>
									</button>
									<button
										className="ghost sidebar-profile-button"
										onClick={openProfileModal}
										type="button"
										aria-label={`Abrir perfil de ${profileDisplayName(currentUser)}`}
									>
										<span className="sidebar-profile-avatar" aria-hidden="true">
											{safeSidebarAvatarUrl && !sidebarAvatarIsPdf ? (
												<img src={encodeURI(safeSidebarAvatarUrl)} alt="" />
											) : safeSidebarAvatarPdfThumbnail ? (
												<img src={encodeURI(safeSidebarAvatarPdfThumbnail)} alt="" />
											) : currentUser.avatar_url ? (
												<FileText size={18} />
											) : (
												<span>{profileInitial(currentUser)}</span>
											)}
										</span>
										<span className="sidebar-profile-copy">
											<strong>{profileDisplayName(currentUser)}</strong>
											<span>{profileRoleLabel(currentUser)}</span>
											{profileTrialText(currentUser) ? (
												<span>{profileTrialText(currentUser)}</span>
											) : null}
										</span>
									</button>
								</div>
							) : null
						}
					/>
				}
			>
				<NoticeToastViewport toasts={toasts} onDismiss={dismissToast} />
				<QuickActionsMenu
					open={Boolean(quickActionsMenu)}
					anchorPoint={quickActionsMenu?.anchorPoint ?? null}
					actions={quickActionsMenu?.actions ?? []}
					title={quickActionsMenu?.title ?? ''}
					returnFocusRef={quickActionsReturnFocusRef}
					onClose={() => setQuickActionsMenu(null)}
				/>
				<AnimatedWorkspaceView viewKey={displayedActive}>
					<PageHeader
						title={title.label}
						subtitle={title.subtitle}
						titleAddon={
							displayedActive === 'agenda' ? (
								<SegmentedControl
									ariaLabel="Tipo de servicio"
									className="agenda-type-toggle"
									options={agendaServiceBuckets}
									selectionMode="tabs"
									value={agendaServiceBucket}
									onChange={(nextValue) =>
										setAgendaServiceBucket(nextValue as AgendaServiceBucket)
									}
								/>
							) : null
						}
						actions={
							<div className="record-actions">
								<button
									ref={sidebarMobileToggleRef}
									type="button"
									className="ghost shell-mobile-toggle"
									aria-controls={SIDEBAR_NAV_ID}
									aria-expanded={sidebarMobileOpen}
									aria-label={
										sidebarMobileOpen
											? 'Cerrar menu lateral'
											: 'Abrir menu lateral'
									}
									title={
										sidebarMobileOpen
											? 'Cerrar menu lateral'
											: 'Abrir menu lateral'
									}
									onClick={toggleSidebarMobileMenu}
								>
									{sidebarMobileOpen ? <X size={16} /> : <Menu size={16} />}
									Menu
								</button>
								{displayedActive === 'agenda' ? (
									<button
										type="button"
										className="primary"
										aria-label="Crear reserva para el dia seleccionado"
										title="Crear reserva para el dia seleccionado"
										onClick={() => openQuickReservation(selectedDay)}
									>
										<Plus size={16} />
										Crear
									</button>
								) : null}
								<button
									type="button"
									className="ghost"
									aria-label={`Actualizar ${title.label.toLowerCase()}`}
									title={`Actualizar ${title.label.toLowerCase()}`}
									onClick={() => loadData({ force: true })}
									disabled={loading}
								>
									<RefreshCw size={16} />
									Actualizar
								</button>
							</div>
						}
					/>
				{displayedActive === 'dashboard' ? (
					<DashboardPanel
						birthdayAlerts={renderBirthdayAlerts()}
						canViewEconomy={canViewEconomy}
						dashboard={dashboard}
						loading={loading}
						period={period}
						onOpenPaymentForOrder={openPaymentForOrder}
						onOpenSection={setActive}
						onPeriodChange={setPeriod}
						onReloadDashboard={() =>
							loadData({ force: true, section: 'dashboard' })
						}
					/>
				) : null}

				{displayedActive === 'notifications' ? (
					<div className="grid">
						<Panel
							title="Solicitudes pendientes"
							subtitle={`${pendingPublicRequestsCount} pendientes`}
						>
							<div className="records">
								{pendingPublicRequests.length ? (
									pendingPublicRequests.map((item) =>
										renderPublicRequestCard(item),
									)
								) : (
									<Empty
										text="Sin solicitudes pendientes"
										hint="Las solicitudes publicas nuevas van a aparecer aca."
									/>
								)}
							</div>
						</Panel>
						<Panel title="Gestionadas">
							<div className="records">
								{managedPublicRequests.length ? (
									managedPublicRequests.map((item) =>
										renderPublicRequestCard(item),
									)
								) : (
									<Empty
										text="Sin solicitudes gestionadas"
										hint="Cuando conviertas o archives solicitudes, quedan registradas aca."
									/>
								)}
							</div>
						</Panel>
					</div>
				) : null}

				{displayedActive === 'customers' ? (
					<>
						{customerDashboard && canViewEconomy ? (
							renderCustomerDashboard()
						) : (
					<div className="grid">
						<CustomerListPanel
							customers={filteredCustomers}
							totalCustomers={customers.length}
							search={search}
							filter={customerCardFilter}
							filterOptions={visibleCustomerFilterOptions}
							canViewEconomy={canViewEconomy}
							showReservationTimes={useReservationTimes}
							vehicleCountByCustomerId={customerVehicleCountById}
							getRecordClassName={(item) =>
								recordClass('customer', item.id)
							}
							onSearchChange={setSearch}
							onFilterChange={setCustomerCardFilter}
							onCreate={() => openFormModal('customer')}
							onOpenDashboard={openCustomerDashboard}
							onEdit={(item) => openDetailModal('Cliente', item)}
							onDelete={(item) =>
								runAction(
									() =>
										apiFetch(`/customers/${item.id}/`, {
											method: 'DELETE',
										}),
									{
										successTitle: entityFeedbackTitle(
											'customer',
											'deleted',
										),
										undo: undoRestoreActiveRecord('customer', item),
									},
								)
							}
							onOpenQuickActions={(event, item) =>
								openQuickActionsFromContext(
									event,
									'Acciones de cliente',
									customerQuickActions(item),
								)
							}
							onOpenQuickActionsFromTrigger={(event, item) =>
								openQuickActionsFromTrigger(
									event,
									'Acciones de cliente',
									customerQuickActions(item),
								)
							}
						/>
					</div>
						)}
					</>
				) : null}

				{displayedActive === 'suppliers' ? (
					supplierDashboard && canViewEconomy ? (
						renderSupplierDashboard()
					) : (
					<div className="grid">
						<section className="panel">
							<div className="panel-head">
								<div>
									<h2>Proveedores</h2>
									<p>Compras, materiales, comprobantes, caja y deuda vinculada.</p>
								</div>
								<div className="record-actions">
									<button
										type="button"
										className="primary"
										onClick={() => openFormModal('supplier')}
									>
										<Building2 size={16} />
										Nuevo proveedor
									</button>
									<button
										type="button"
										className="ghost"
										onClick={() => openFormModal('stock-movement')}
									>
										<Package size={16} />
										Nueva compra
									</button>
								</div>
							</div>
							<div className="toolbar toolbar-spaced">
								<input
									placeholder="Buscar por proveedor, razon social, rubro, contacto o CUIT"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
								/>
							</div>
							<div className="records">
								{filteredSuppliers.length ? (
									filteredSuppliers.map((item) => {
										const insights = supplierListInsight(item)
										const quickActions = supplierQuickActions(item)
										return (
											<MotionFlashSurface
												className={recordClass('supplier', item.id)}
												key={`supplier-page-${item.id}`}
												{...quickActionTargetProps(
													'Acciones de proveedor',
													quickActions,
												)}
											>
												<RecordCardHeader
													title={item.name}
													subtitle={
														supplierProfileSubtitle(item) ||
														[item.contact_name, item.phone, item.email]
															.filter(Boolean)
															.join(' - ') ||
														'Sin datos de contacto'
													}
													primaryAction={
														canViewEconomy
															? {
																	ariaLabel: `Abrir proveedor ${item.name}`,
																	onClick: () => openSupplierDashboard(item),
															  }
															: undefined
													}
													actions={
														<>
														<button
															type="button"
															className="primary"
															onClick={() => openStockPurchaseForSupplier(item)}
														>
															Nueva compra
														</button>
														<button
															type="button"
															className="ghost"
															onClick={() => openDetailModal('Proveedor', item)}
														>
															Editar
														</button>
														<button
															type="button"
															className="danger"
															onClick={() =>
																runAction(
																	() =>
																		apiFetch(`/suppliers/${item.id}/`, {
																			method: 'DELETE',
																		}),
																	{
																		successTitle: entityFeedbackTitle(
																			'supplier',
																			'deleted',
																		),
																		undo: undoRestoreActiveRecord(
																			'supplier',
																			item,
																		),
																	},
																)
															}
														>
															Inactivar
														</button>
														{renderQuickActionsTrigger(
															'Acciones de proveedor',
															quickActions,
															'Acciones rapidas de proveedor',
														)}
														</>
													}
												>
													<div className="record-sub">
														Comprado {money(insights.total_purchased)} -{' '}
														{insights.purchase_count ?? 0} compras
														{insights.last_purchase_on
															? ` - ultima ${formatDateLabel(insights.last_purchase_on)}`
															: ''}
														{insights.materials_count
															? ` - ${insights.materials_count} materiales`
															: ''}
													</div>
													<div className="record-sub">
														{item.is_active === false ? 'Inactivo' : 'Activo'}
														{insights.pending_reception_count
															? ` - ${insights.pending_reception_count} compras pendientes de recepcion`
															: ' - sin recepcion pendiente'}
													</div>
												</RecordCardHeader>
											</MotionFlashSurface>
										)
									})
								) : (
									<Empty
										text={
											search.trim()
												? 'No hay proveedores para esta busqueda.'
												: 'Sin proveedores.'
										}
										hint={
											search.trim()
												? 'Proba con otro nombre, contacto o CUIT.'
												: 'Crea el primer proveedor para registrar compras.'
										}
									/>
								)}
							</div>
						</section>
					</div>
					)
				) : null}

				{displayedActive === 'vehicles' ? (
					<div className="grid">
						<section className="panel">
							<div className="panel-head">
								<h2>Vehiculos</h2>
								<button
									type="button"
									className="primary"
									onClick={() => openFormModal('vehicle')}
								>
									<Car size={16} />
									Nuevo vehiculo
								</button>
							</div>
							<div
								className="toolbar toolbar-spaced"
							>
								<input
									placeholder="Buscar por patente, marca, modelo, color o cliente"
									value={search}
									onChange={(event) =>
										setSearch(event.target.value)
									}
								/>
							</div>
							<div className="records">
								{filteredVehicles.length ? (
									filteredVehicles.map((item) => {
										const quickActions = vehicleQuickActions(item)
										return (
										<MotionFlashSurface
											className={recordClass('vehicle', item.id)}
											key={`v-page-${item.id}`}
											{...detailRecordProps('Vehiculo', item)}
											{...quickActionTargetProps(
												'Acciones de vehiculo',
												quickActions,
											)}
										>
											{renderQuickActionsTrigger(
												'Acciones de vehiculo',
												quickActions,
												'Acciones rapidas de vehiculo',
											)}
											<div className="record-head">
												<div>
													<div className="record-title">
														{vehicleDisplayTitle(item)}
													</div>
													<div className="record-sub">
														{vehicleDescription(item)}
													</div>
												</div>
												<div className="record-actions">
													<button
														className="ghost"
														onClick={() =>
															openDetailModal('Vehiculo', item)
														}
													>
														Editar
													</button>
													<button
														className="danger"
														onClick={() =>
															runAction(() =>
																apiFetch(
																	`/vehicles/${item.id}/`,
																	{
																		method: 'DELETE',
																	},
																),
																{
																	successTitle:
																		entityFeedbackTitle(
																			'vehicle',
																			'deleted',
																		),
																	undo: undoRestoreActiveRecord(
																		'vehicle',
																		item,
																	),
																},
															)
													}
												>
													Baja
												</button>
											</div>
										</div>
										</MotionFlashSurface>
										)
									})
								) : (
									<Empty
										text={
											search.trim()
												? 'No hay vehiculos para esta busqueda.'
												: 'Sin vehiculos.'
										}
										hint={
											search.trim()
												? 'Proba con otra patente, marca o cliente.'
												: 'Crea el primer vehiculo para vincular reservas.'
										}
									/>
								)}
							</div>
						</section>
					</div>
				) : null}

				{displayedActive === 'services' ? (
					serviceDashboard && canViewEconomy ? (
						renderServiceDashboard()
					) : (
					<div className="grid">
						<section className="panel">
							<div className="panel-head">
								<div>
									<h2>Servicios</h2>
									<p>Lavados, detailing y combos disponibles para reservas y cotizaciones.</p>
								</div>
								<button
									type="button"
									className="primary"
									onClick={() => openFormModal('service')}
								>
									<Plus size={16} />
									Nuevo servicio
								</button>
							</div>
							<div className="records">
								{services.length ? (
									services.map((item) => {
										const quickActions = serviceQuickActions(item)
										return (
										<MotionFlashSurface
											className={recordClass('service', item.id)}
											key={item.id}
											{...quickActionTargetProps(
												'Acciones de servicio',
												quickActions,
											)}
										>
											{renderQuickActionsTrigger(
												'Acciones de servicio',
												quickActions,
												'Acciones rapidas de servicio',
											)}
											<RecordCardHeader
												title={serviceDisplayName(item)}
												subtitle={joinDisplayParts([
													serviceTypeLabels[item.service_type],
													money(item.base_price),
													`${item.estimated_duration_minutes} min`,
												])}
												primaryAction={{
													ariaLabel: `Abrir servicio ${serviceDisplayName(item)}`,
													onClick: () => openServiceDashboard(item),
												}}
												actions={
													<>
													<button
														type="button"
														className="ghost"
														onClick={() =>
															openDetailModal('Servicio', item)
														}
													>
														Editar
													</button>
													<button
														type="button"
														className="danger"
														onClick={() =>
															runAction(() =>
																apiFetch(
																	`/services/${item.id}/`,
																	{
																		method: 'DELETE',
																	},
																),
																{
																	successTitle:
																		entityFeedbackTitle(
																			'service',
																			'deleted',
																		),
																	undo: undoRestoreActiveRecord(
																		'service',
																		item,
																	),
																},
															)
														}
													>
														Inactivar
													</button>
													</>
												}
											/>
										</MotionFlashSurface>
										)
									})
								) : (
									<Empty
										text="Sin servicios."
										hint="Crea el primer servicio para reservar o cotizar."
									/>
								)}
							</div>
						</section>
					</div>
					)
				) : null}

				{displayedActive === 'agenda' ? (
					<div className="work-view-strip">
						<div className="work-view-copy">
							<span className="agenda-toolbar-kicker">Agenda / Trabajos</span>
							<strong>{agendaServiceBucketLabel}</strong>
							<small>
								{visibleAgendaReservations.length}{' '}
								{visibleAgendaReservations.length === 1
									? 'reserva visible'
									: 'reservas visibles'}
							</small>
						</div>
						<SegmentedControl
							ariaLabel="Visualizacion de trabajos"
							className="work-view-toggle"
							options={workViewModes}
							selectionMode="tabs"
							value={workViewMode}
							onChange={(nextValue) =>
								setWorkViewMode(nextValue as WorkOrderViewMode)
							}
						/>
					</div>
				) : null}

				{displayedActive === 'agenda' && workViewMode === 'agenda' ? (
					<div className="grid agenda-layout">
						<section className="panel agenda-panel">
							<AgendaBoardToolbar
								endLabel={formatDayLabel(weekEndDay)}
								rangeSummary={agendaRangeSummary}
								startLabel={formatDayLabel(agendaStartDay)}
								visibleDays={AGENDA_VISIBLE_DAYS}
								onMove={moveAgenda}
								onToday={goToToday}
							/>
							{agendaLoadError ? (
								<ErrorState
									text={agendaLoadError.title}
									hint={agendaLoadError.description}
									action={
										<button
											type="button"
											className="ghost"
											onClick={() => loadData({ force: true })}
										>
											<RefreshCw size={16} />
											Actualizar
										</button>
									}
								/>
							) : null}
							{loading &&
							!agendaLoadError &&
							!agendaBoardModel.segments.length ? (
								<LoadingState
									text="Cargando agenda..."
									hint="Mantenemos el tablero listo mientras llegan las reservas."
								/>
							) : null}
							{!loading &&
							!agendaLoadError &&
							!agendaBoardModel.segments.length ? (
								<Empty
									text="Sin reservas en este rango."
									hint="Crea una reserva para el dia seleccionado o cambia el filtro de servicio para revisar otra carga."
									action={
										<button
											type="button"
											className="primary"
											onClick={() => openQuickReservation(selectedDay)}
										>
											<Plus size={16} />
											Crear reserva
										</button>
									}
								/>
							) : null}
							<DndContext
								sensors={agendaSensors}
								collisionDetection={closestCenter}
								onDragStart={handleAgendaDragStart}
								onDragOver={handleAgendaDragOver}
								onDragEnd={handleAgendaDragEnd}
								onDragCancel={handleAgendaDragCancel}
							>
								<div className="agenda-slide-viewport agenda-slide-viewport--board">
									<AnimatePresence
										custom={agendaSlideMotion}
										initial={false}
										mode={agendaSlidePresenceMode(agendaSlideMotion)}
									>
										<m.div
											key={agendaBoardModel.key}
											className="agenda-carousel-board"
											custom={agendaSlideMotion}
											variants={agendaBoardVariants}
											initial="initial"
											animate="animate"
											exit="exit"
											onAnimationComplete={() => {
												setAgendaOverlapSuppressedStartDay((current) =>
													current === agendaBoardModel.startDay ? null : current,
												)
											}}
										>
											<m.div
												className="week-board"
												style={agendaBoardGridStyle(
													agendaBoardModel.dayCount,
													agendaBoardModel.stackRows,
												)}
											>
												{agendaBoardModel.days.map((day, index) => (
													<AgendaDroppableDayLane
														column={index + 1}
														day={day}
														interactive={agendaBoardModel.isInteractive}
														key={`lane:${agendaBoardModel.key}:${day}`}
														laneEndRow={agendaBoardModel.laneEndRow}
														snapshotKey={agendaBoardModel.key}
													/>
												))}
												{agendaBoardModel.days.map((day, index) => (
													<AgendaDayHeader
														column={index + 1}
														count={
															agendaBoardModel.rowsByDay[day]?.length ?? 0
														}
														day={day}
														hiddenDuringEnter={shouldHideEnteringAgendaColumn(
															index + 1,
														)}
														interactive={agendaBoardModel.isInteractive}
														key={`head:${agendaBoardModel.key}:${day}`}
													/>
												))}
												{agendaBoardModel.segments.map((segment) => {
													const reservation = segment.reservation
													const workOrder = segment.workOrder
													return (
														<div
															className={cx(
																'agenda-board-card-shell',
																shouldHideEnteringAgendaSegment(segment) &&
																	'agenda-entering-overlap-hidden',
															)}
															key={`${agendaBoardModel.key}:segment:${segment.key}`}
															style={agendaSegmentStyle(segment)}
														>
															<AgendaDraggableRecord
																className={cx(
																	'agenda-operational-card--spanning',
																	segment.spanDays > 1 &&
																		'agenda-operational-card--multi-day',
																	segment.startsBeforeWindow &&
																		'agenda-operational-card--continues-before',
																	segment.endsAfterWindow &&
																		'agenda-operational-card--continues-after',
																)}
																interactive={agendaBoardModel.isInteractive}
																row={segment.row}
																snapshotKey={agendaBoardModel.key}
															>
																{reservation
																	? renderAgendaReservationCard(
																			reservation,
																			workOrder,
																			segment.row,
																			{ statusMode: 'work-order' },
																	  )
																	: null}
																{!reservation && !workOrder ? (
																	<span className="agenda-manual-badge">
																		Sin datos
																	</span>
																) : null}
															</AgendaDraggableRecord>
														</div>
													)
												})}
											</m.div>
										</m.div>
									</AnimatePresence>
								</div>
								<DragOverlay>
									{renderAgendaDragOverlay(activeAgendaRow, {
										statusMode: 'work-order',
									})}
								</DragOverlay>
							</DndContext>
						</section>
					</div>
				) : null}

				{displayedActive === 'agenda' && workViewMode === 'status'
					? renderWorkReservationsByStatusView()
					: null}

				{displayedActive === 'agenda' && workViewMode === 'entry-date'
					? renderWorkReservationsByEntryDateView()
					: null}


				{displayedActive === 'cash' ? (
					<CashPanel
						cashClosure={cash.closure}
						cashEntries={cashEntries}
						cashEntryDescription={cashEntryDescription}
						cashEntryKey={cashEntryKey}
						cashEntryQuickActions={cashEntryQuickActions}
						cashEntryTitle={cashEntryTitle}
						cashFilterCategoryOptions={selectOptionsFromValues(
							cashFilterCategoryValues,
							cashFilters.category,
						)}
						cashFilters={cashFilters}
						cashFiltersActive={cashFiltersActive}
						cashFilterSubcategoryOptions={selectOptionsFromValues(
							cashFilterSubcategoryValues,
							cashFilters.subcategory,
						)}
						cashflowTotals={cashflowTotals}
						cashFlowSummary={cashFlowSummary}
						cashIsClosed={cashIsClosed}
						cashSourceKindLabel={cashSourceKindLabel}
						cashSourceKindOptions={cashSourceKindOptions}
						cashSummaryMode={cashSummaryMode}
						economicTotals={economicTotals}
						filteredCashEntries={filteredCashEntries}
						loading={loading}
						loadBlocked={cashLoadBlocked}
						loadErrorNotice={loadErrorNotice}
						recordClass={recordClass}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						selectedDay={selectedDay}
						onCashFilterChange={updateCashFilter}
						onCashSummaryModeChange={setCashSummaryMode}
						onClearCashFilters={() => setCashFilters(CASH_FILTER_DEFAULTS)}
						onCloseDay={closeCashDay}
						onCollectWork={() => openFormModal('payment')}
						onCreateMovement={() => openFormModal('cash-movement')}
						onMoveSelectedDay={moveSelectedCashDay}
						onOpenCashEntryDetail={openCashEntryDetail}
						onPayDebt={() => openFormModal('debt-payment')}
						onQuickActionsContext={openQuickActionsFromContext}
						onRefresh={() => loadData({ force: true })}
						onRegisterAdjustment={() =>
							openAdjustmentForClosedDay(selectedDay)
						}
						onSelectedDayChange={setSelectedDay}
					/>
				) : null}

				{displayedActive === 'debts' ? (
					<DebtPanel
						debtFilters={debtFilters}
						debtFiltersActive={debtFiltersActive}
						debtOptions={debtOptions}
						debtPaymentQuickActions={debtPaymentQuickActions}
						debtPayments={debtPayments}
						debtQuickActions={debtQuickActions}
						debtSummary={debtSummary}
						debts={debts}
						filteredDebts={filteredDebts}
						loading={loading}
						loadBlocked={debtLoadBlocked}
						loadErrorNotice={loadErrorNotice}
						recordClass={recordClass}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						search={search}
						onClearDebtFilters={clearDebtFilters}
						onCreateDebt={() => openFormModal('debt')}
						onCreateDebtPayment={() => openFormModal('debt-payment')}
						onDebtFilterChange={updateDebtFilter}
						onOpenDebtDetail={(item) => openDetailModal('Deuda', item)}
						onOpenDebtPaymentDetail={(item) =>
							openDetailModal('Pago de deuda', item)
						}
						onOpenDebtPaymentForDebt={openDebtPaymentForDebt}
						onQuickActionsContext={openQuickActionsFromContext}
						onRefresh={() => loadData({ force: true })}
						onSearchChange={setSearch}
					/>
				) : null}
				{displayedActive === 'inventory' ? (
					<InventoryPanel
						availableQuickActions={availableQuickActions}
						consumptions={consumptions}
						detailRecordProps={detailRecordProps}
						interactiveRecordProps={interactiveRecordProps}
						inventorySummary={inventorySummary}
						materialConsumptionQuickActions={materialConsumptionQuickActions}
						materialOpenUnitQuickActions={materialOpenUnitQuickActions}
						materialOpenUnits={materialOpenUnits}
						materialPurchaseQuickActions={materialPurchaseQuickActions}
						materialQuickActions={materialQuickActions}
						materials={materials}
						materialStockValue={materialStockValue}
						materialUnitValue={materialUnitValue}
						materialUsageSummary={materialUsageSummary}
						purchases={purchases}
						quickActionTargetProps={quickActionTargetProps}
						recordClass={recordClass}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						stockMovements={stockMovements}
						stockMovementTypeLabels={stockMovementTypeLabels}
						supplierListInsight={supplierListInsight}
						supplierProfileSubtitle={supplierProfileSubtitle}
						supplierQuickActions={supplierQuickActions}
						suppliers={suppliers}
						onDeleteMaterial={(item) =>
							runAction(
								() =>
									apiFetch(`/materials/${item.id}/`, {
										method: 'DELETE',
									}),
								{
									successTitle: entityFeedbackTitle('material', 'deleted'),
									undo: undoRestoreActiveRecord('material', item),
								},
							)
						}
						onFinishOpenUnit={finishOpenUnit}
						onOpenMaterialDetail={(item) => openDetailModal('Material', item)}
						onOpenMaterialForm={() => openFormModal('material')}
						onOpenStockMovementForm={() => openFormModal('stock-movement')}
						onOpenSupplierDashboard={openSupplierDashboard}
						onOpenSupplierForm={() => openFormModal('supplier')}
						onOpenUnitForMaterial={openUnitForMaterial}
					/>
				) : null}

				{displayedActive === 'tools' ? (
					<div className="grid">
						<section className="panel">
							<div className="panel-head">
								<div>
									<h2>Herramientas</h2>
									<p>Estado, cantidades y valor estimado del equipamiento.</p>
								</div>
								<button
									type="button"
									className="primary"
									onClick={() => openFormModal('tool')}
								>
									<Hammer size={16} />
									Nueva herramienta
								</button>
							</div>
							<div className="inventory-metrics">
								<div className="material-kpi">
									<span>Herramientas</span>
									<strong>{toolSummary.records}</strong>
								</div>
								<div className="material-kpi">
									<span>Unidades</span>
									<strong>{toolSummary.quantity}</strong>
								</div>
								<div className="material-kpi">
									<span>Valor total</span>
									<strong>{money(toolSummary.value)}</strong>
								</div>
							</div>
							<div className="toolbar toolbar-spaced">
								<input
									placeholder="Buscar por nombre, estado o notas"
									value={search}
									onChange={(event) =>
										setSearch(event.target.value)
									}
								/>
							</div>
							<div className="records">
								{filteredTools.length ? (
									filteredTools.map((item) => {
										const quickActions = toolQuickActions(item)
										return (
										<MotionFlashSurface
											className={recordClass('tool', item.id)}
											key={item.id}
											{...detailRecordProps(
												'Herramienta',
												item,
											)}
											{...quickActionTargetProps(
												'Acciones de herramienta',
												quickActions,
											)}
										>
											<div className="record-head">
												<div>
													<div className="record-title">
														{item.name}
													</div>
													<div className="record-sub">
														{toolStatusLabels[
															item.status
														] ?? item.status}{' '}
														- {item.quantity}{' '}
														unidades -{' '}
														{money(
															item.unit_value,
														)}{' '}
														c/u - valor{' '}
														{money(
															toolTotalValue(
																item,
															),
														)}
													</div>
													<div className="record-sub">
														{item.purchased_at
															? `Compra ${item.purchased_at}`
															: 'Sin fecha de compra'}
														{item.notes
															? ` - ${item.notes}`
															: ''}
													</div>
												</div>
												<div className="record-actions">
													<button
														type="button"
														className="ghost"
														onClick={() =>
															openDetailModal('Herramienta', item)
														}
													>
														Editar
													</button>
													<button
														className="danger"
														type="button"
														onClick={() =>
															runAction(() =>
																apiFetch(
																	`/tools/${item.id}/`,
																	{
																		method: 'DELETE',
																	},
																),
																{
																	successTitle:
																		entityFeedbackTitle(
																			'tool',
																			'deleted',
																		),
																	undo: undoRestoreActiveRecord(
																		'tool',
																		item,
																	),
																},
															)
														}
														>
															Inactivar
														</button>
														{renderQuickActionsTrigger(
															'Acciones de herramienta',
															quickActions,
															'Acciones rapidas de herramienta',
														)}
													</div>
												</div>
										</MotionFlashSurface>
										)
									})
								) : (
									<Empty text="Sin herramientas." />
								)}
							</div>
						</section>
					</div>
				) : null}

				{displayedActive === 'quotes' ? (
					<div className="grid">
						<section className="panel">
							<div className="panel-head">
								<div>
									<h2>Cotizaciones</h2>
									<p>Presupuestos y descargas PDF.</p>
								</div>
								<button
									type="button"
									className="primary"
									onClick={() => openFormModal('quote')}
								>
									<Plus size={16} />
									Nueva cotizacion
								</button>
							</div>
							<DndContext
								sensors={agendaSensors}
								collisionDetection={closestCenter}
								onDragStart={handleQuoteDragStart}
								onDragOver={handleQuoteDragOver}
								onDragEnd={handleQuoteDragEnd}
								onDragCancel={handleQuoteDragCancel}
							>
								<div className="quote-board">
									<QuoteDroppableLane status="draft">
										{quoteBoard.draft.length ? (
											quoteBoard.draft.map((item) => (
												<QuoteDraggableRecord item={item} key={item.id} />
											))
										) : (
											<Empty text="Sin cotizaciones sin enviar." />
										)}
									</QuoteDroppableLane>
									<QuoteDroppableLane status="sent">
										{quoteBoard.sent.length ? (
											quoteBoard.sent.map((item) => (
												<QuoteDraggableRecord item={item} key={item.id} />
											))
										) : (
											<Empty text="Sin cotizaciones enviadas." />
										)}
									</QuoteDroppableLane>
								</div>
								<DragOverlay>{renderQuoteDragOverlay(activeQuoteDrag)}</DragOverlay>
							</DndContext>
						</section>
					</div>
				) : null}

				{displayedActive === 'settings' ? (
					<SettingsWorkspace
						activeEmployeeCount={activeEmployeeCount}
						auditActionOptions={auditActionOptions}
						auditActorOptions={auditActorOptions}
						auditFilters={auditFilters}
						auditFiltersActive={auditFiltersActive}
						auditLogs={auditLogs}
						auditModuleOptions={auditModuleOptions}
						businessForm={businessForm}
						businessLogoFile={businessLogoFile}
						businessLogoInputKey={businessLogoInputKey}
						businessLogoInputRef={businessLogoInputRef}
						businessLogoIsPdf={businessLogoIsPdf}
						businessLogoPdfStatus={businessLogoPdfStatus}
						businessLogoPreview={businessLogoPreview}
						businessProfile={businessProfile}
						businessSlug={String(currentUser?.business?.slug ?? '')}
						cashClassificationPairs={cashClassificationPairs}
						currentUserId={currentUser?.id ?? null}
						employees={employees}
						expandedAuditLogId={expandedAuditLogId}
						expenseClassificationPairs={expenseClassificationPairs}
						inactiveEmployeeCount={inactiveEmployeeCount}
						incomeClassificationPairs={incomeClassificationPairs}
						loading={loading}
						safeBusinessLogoPdfThumbnail={safeBusinessLogoPdfThumbnail}
						safeBusinessLogoPreview={safeBusinessLogoPreview}
						settingsSection={settingsSection}
						settingsSectionLabel={settingsSectionLabel}
						settingsSectionOptions={settingsSectionOptions}
						showStayDaysInAgenda={showStayDaysInAgenda}
						useReservationTimes={useReservationTimes}
						onApplyAuditFilters={applyAuditFilters}
						onAuditActionLabel={auditActionLabel}
						onAuditModuleLabel={auditModuleLabel}
						onBusinessLogoChange={handleBusinessLogoChange}
						onClearAuditFilters={clearAuditFilters}
						onDeleteExpenseClassification={deleteExpenseClassification}
						onEditExpenseClassification={openExpenseClassificationEditor}
						onOpenBusinessLogoPicker={openBusinessLogoPicker}
						onOpenEmployeeForm={() => openFormModal('employee')}
						onOpenExpenseClassificationForm={() =>
							openFormModal('expense-classification')
						}
						onPatchBusinessForm={patchBusinessForm}
						onRefreshAuditLogs={() => refreshAuditLogs()}
						onRefreshData={() => loadData({ force: true })}
						onSaveBusinessProfile={saveBusinessProfile}
						onSettingsSectionChange={setSettingsSection}
						onToggleAuditLog={setExpandedAuditLogId}
						onUpdateAuditFilter={updateAuditFilter}
					/>
				) : null}
				</AnimatedWorkspaceView>
			</AppShell>
		</>
	)
}

