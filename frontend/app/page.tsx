'use client'

import {
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'

import {
	CalendarDays,
	Car,
	CheckCircle2,
	CreditCard,
	Eye,
	FileText,
	Hammer,
	ListTodo,
	LockKeyhole,
	LogOut,
	MessageCircle,
	Package,
	Pencil,
	Plus,
	ReceiptText,
	Trash2,
	Undo2,
	Users,
	Wrench,
	X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import {
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import { AnimatedLabelSwap } from '@/app/components/motion/AnimatedLabelSwap'
import { type GlobalSearchItem } from '@/app/components/search/GlobalSearchInput'
import { SearchResultsPanel } from '@/app/components/search/SearchResultsPanel'
import {
	SupplierDashboardPanel,
	supplierProfileSubtitle,
} from '@/app/components/suppliers/SupplierDashboardPanel'
import { SuppliersWorkspace } from '@/app/components/suppliers/SuppliersWorkspace'
import { WorkEntryDateView } from '@/app/components/work/WorkEntryDateView'
import { WorkStatusView } from '@/app/components/work/WorkStatusView'
import { VehiclesWorkspace } from '@/app/components/vehicles/VehiclesWorkspace'
import { ProfileModal } from '@/app/components/profile/ProfileModal'
import { renderProfileModal } from '@/app/components/profile/ProfileModalLayer'
import { PublicRequestsView } from '@/app/components/requests/PublicRequestsView'
import { CashMovementForm } from '@/app/components/forms/CashMovementForm'
import { DebtPaymentForm } from '@/app/components/forms/DebtPaymentForm'
import { createMaterialConsumptionFieldsRenderer } from '@/app/components/forms/material-consumption-fields-renderer'
import { PaymentForm } from '@/app/components/forms/PaymentForm'
import { renderQuickCreateModal } from '@/app/components/forms/QuickCreateModalLayer'
import {
	cashLoadTabOptions,
	renderCashLoadModal,
} from '@/app/components/forms/cash-load-modal-renderer'
import {
	renderCashCategoryModal,
	renderExpenseClassificationModal,
} from '@/app/components/forms/cash-settings-modal-renderers'
import { renderCashMovementModal } from '@/app/components/forms/cash-movement-modal-renderer'
import {
	renderEmployeeModal,
	renderMaterialModal,
	renderSupplierModal,
	renderToolModal,
} from '@/app/components/forms/administrative-form-modal-renderers'
import { renderCoreFormModal } from '@/app/components/forms/core-form-modal-renderer'
import {
	renderDebtModal,
	renderDebtPaymentModal,
	renderFixedExpenseModal,
} from '@/app/components/forms/finance-form-modal-renderers'
import { renderFixedExpensePaymentModal } from '@/app/components/forms/fixed-expense-payment-modal-renderer'
import {
	renderHistoricalMaterialUsageModal,
	renderMaterialConsumptionModal,
	renderMaterialOpenUnitModal,
	renderMaterialPurchaseModal,
} from '@/app/components/forms/inventory-flow-modal-renderers'
import {
	renderQuickReservationModal,
	renderQuoteReservationModal,
} from '@/app/components/forms/reservation-modal-renderers'
import { renderStockMovementModal } from '@/app/components/forms/stock-movement-modal-renderer'
import { agendaCardClass as agendaCardClassForRow } from '@/app/components/agenda/agenda-card-class'
import { createAgendaDragOverlayRenderer } from '@/app/components/agenda/AgendaDragOverlayRenderer'
import { AgendaQuickActionIcon } from '@/app/components/agenda/AgendaQuickActionIcon'
import { createAgendaReservationCardRenderer } from '@/app/components/agenda/AgendaReservationCardRenderer'
import { AgendaSchedulePanel } from '@/app/components/agenda/AgendaSchedulePanel'
import { AgendaViewControls } from '@/app/components/agenda/AgendaViewControls'
import { createAgendaWorkDebtRenderer } from '@/app/components/agenda/AgendaWorkDebt'
import { AgendaWeekBoard } from '@/app/components/agenda/AgendaWeekBoard'
import { OverdueReservationsModal } from '@/app/components/agenda/OverdueReservationsModal'
import {
	renderWorkOrderConsumptionModal,
	renderWorkOrderPaymentModal,
} from '@/app/components/forms/work-order-modal-renderers'
import {
	CashPanel,
	type CashFilterState,
	type CashSummaryMode,
} from '@/app/components/cash/CashPanel'
import {
	DebtPanel,
	type DebtFilterState,
	type DebtSummary,
} from '@/app/components/debts/DebtPanel'
import { FixedExpensePanel } from '@/app/components/fixed-expenses/FixedExpensePanel'
import { DashboardPanel } from '@/app/components/dashboard/DashboardPanel'
import { InventoryPanel } from '@/app/components/inventory/InventoryPanel'
import {
	createQuoteCardContentRenderer,
	QuotesPanel,
} from '@/app/components/quotes/QuotesPanel'
import { ServicesPanel } from '@/app/components/services/ServicesPanel'
import { SettingsWorkspace } from '@/app/components/settings/SettingsWorkspace'
import {
	settingsSectionOptions,
	type SettingsSection,
} from '@/app/components/settings/settings-section-options'
import { TasksPanel } from '@/app/components/tasks/TasksPanel'
import { ToolsPanel } from '@/app/components/tools/ToolsPanel'
import { BirthdayAlertsPanel } from '@/app/components/customers/BirthdayAlertsPanel'
import { renderCustomerDashboard as renderCustomerDashboardForState } from '@/app/components/customers/customer-dashboard-renderer'
import { renderCustomerRankingPanel } from '@/app/components/customers/CustomerRankingPanel'
import { renderCoreDetailFormRouter } from '@/app/components/detail/detail-core-form-router'
import { renderFinancialDetailFormRouter } from '@/app/components/detail/detail-financial-form-router'
import { renderInventoryDetailFormRouter } from '@/app/components/detail/detail-inventory-form-router'
import { renderOperationalDetailFormRouter } from '@/app/components/detail/detail-operational-form-router'
import { createDetailEditActionsRenderer } from '@/app/components/detail/detail-edit-actions-renderer'
import {
	customerFilterOptionsForEconomy,
} from '@/app/components/customers/CustomerListPanel'
import { CustomersWorkspace } from '@/app/components/customers/CustomersWorkspace'
import { AppBrand } from '@/app/components/layout/AppBrand'
import { AppShell } from '@/app/components/layout/AppShell'
import { AnimatedWorkspaceView } from '@/app/components/motion/AnimatedWorkspaceView'
import { SidebarNav } from '@/app/components/layout/SidebarNav'
import { SidebarHeaderContent } from '@/app/components/layout/SidebarHeaderContent'
import { SidebarFooterContent } from '@/app/components/layout/SidebarFooterContent'
import { EntityDataLists } from '@/app/components/layout/EntityDataLists'
import { WorkspaceHeaderContent } from '@/app/components/layout/WorkspaceHeaderContent'
import { createSectionFallbackRenderer } from '@/app/components/layout/section-fallback-renderer'
import { buildSidebarNavigation } from '@/app/components/layout/sidebar-navigation'

import { Button } from '@/app/components/ui/Button'
import { GlobalProgressBar } from '@/app/components/ui/GlobalProgressBar'
import { SavingOverlay } from '@/app/components/ui/SavingOverlay'
import { QuickActionsTrigger } from '@/app/components/ui/QuickActionsTrigger'
import { useConfirmDialog } from '@/lib/use-confirm-dialog'
import { DetailModal } from '@/app/components/ui/DetailModal'
import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'
import { CollapsibleSection } from '@/app/components/ui/CollapsibleSection'
import { Panel } from '@/app/components/ui/Panel'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import {
	QuickActionsMenu,
	type QuickAction,
	type QuickActionsMenuState,
} from '@/app/components/ui/QuickActionsMenu'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { StatusPill } from '@/app/components/ui/StatusPill'
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
	beginDataSetLoading,
	beginDataLoad,
	cancelDataLoads,
	dataSetKeysForSection,
	finishDataSetLoading,
	type DataSetKey,
} from '@/lib/data-loading'
import {
	buildDemoReadiness,
	findFirstChargeableWorkOrder,
	type DemoReadinessSettingsSection,
	type DemoReadinessStepId,
} from '@/lib/demo-readiness'
import { buildStarterServicesPlan } from '@/lib/onboarding-services'
import {
	type OverdueReservation,
	overdueAgendaToast,
	overdueLoadErrorToast,
	refreshOverdueReservationsForSection,
	sectionUsesOverdueReservations,
	useOverdueReservationsFlow,
} from '@/lib/overdue-reservations'
import {
	buildWhatsAppAutomationRuleUpdates,
	buildWhatsAppDemoBootstrapPlan,
} from '@/lib/whatsapp-onboarding'
import {
	type ApiErrorNotice,
	createValidationNotice,
	fieldErrorMapFromNotice,
	formatApiError,
} from '@/lib/api-errors'
import {
	isPdfAssetSource,
	isPdfFile,
	safeImageAssetSource,
} from '@/lib/pdf-preview'
import { usePdfThumbnailPreview } from '@/lib/use-pdf-thumbnail-preview'
import {
	auditActionLabels,
	auditLogListOrEmpty,
	auditModuleLabels,
	type AuditLogFilters,
} from '@/lib/audit-log'
import {
	hasActiveAuditFilters,
	sortedAuditActorValues,
	sortedAuditValues,
} from '@/lib/audit-filter-values'
import { joinDisplayParts } from '@/lib/display-text'
import {
	isFullscreenActive,
	isFullscreenSupported,
	toggleDocumentFullscreen,
} from '@/lib/fullscreen'
import {
	type AgendaOperationalRow,
	agendaDropDayForValue,
	buildAgendaCalendarSegments,
	buildAgendaMonthGrid,
	buildAgendaOperationalRows,
	buildWorkOrderByReservation,
	filterAgendaReservationsBySector,
} from '@/lib/agenda'
import {
	agendaSectorSelectOptions,
	agendaMonthChipClass,
	agendaMonthChipLabel,
	createQuoteTentativeTimeLabel,
	reservationExitTimeLabel,
	reservationSelectOptions,
	reservationShowsWork,
	reservationStartTimeLabel,
} from '@/lib/agenda-display'
import {
	agendaCardFlashKey,
	createFlashClass,
	createRecordClass,
	fieldFlashKey,
	recordFlashKey,
} from '@/lib/flash-targets'
import {
	agendaActionTone,
	type AgendaReservationAction,
} from '@/lib/reservation-actions'
import {
	type WorkingHoursEntry,
	DEFAULT_WORKING_HOURS,
} from '@/lib/scheduling-availability'
import {
	agendaRangeModes,
	buildWorkStatusColumns,
	createWorkReservationRow,
	filterFreeQuotesBySector,
	groupReservationsByEntryDate,
	groupReservationsByWorkOrderStatusColumns,
	reservationCanMoveWorkStatus,
	workStatusColumnKeyForValue,
	workStatusDropStatusForColumn,
	workStatusDropTargetForOver,
	type WorkOrderViewMode,
	workOrderForReservation,
	workOrderSelectOptions,
	updateReservationWorkOrder,
	upsertWorkOrderRecord,
	workViewModes,
} from '@/lib/work-orders'
import {
	DEFAULT_RESERVATION_STATUS_CONFIG,
	reservationStatusConfigFromProfile,
	type ReservationStatusConfig,
} from '@/lib/reservation-status-config'
import {
	type AgendaSlideMotion,
	agendaSlideMotionFromOffset,
	agendaSlideWindowsOverlap,
} from '@/lib/motion-spec'
import {
	initialNavigationStateFromBrowser,
	navigationUrlForState,
	readNavigationStateFromUrl,
	searchQueryFromBrowser,
	type NavigationConfig,
	type NavigationState,
} from '@/lib/navigation-state'
import { searchResultTargets } from '@/lib/search-result-targets'
import { availableQuickActions } from '@/lib/quick-actions'
import { blankQuoteFormWithBusinessDefaults } from '@/lib/quote-form-defaults'
import { quoteTotalsForForm } from '@/lib/quote-totals'
import {
	quoteFormWithAddedItem,
	quoteFormWithPatchedItem,
	quoteFormWithRemovedItem,
	reservationFormWithAddedItem,
	reservationFormWithPatchedItem,
	reservationFormWithRemovedItem,
} from '@/lib/quote-reservation-line-items'
import {
	formForCustomerSelection,
	formForGroupServiceLineSelection,
	formForGroupVehicleLineSelection,
	formForVehicleSelection,
	groupQuickTargetForOwner,
} from '@/lib/quote-reservation-form-selection'
import {
	detailReservationDataWithAddedItem,
	detailReservationDataWithPatchedItem,
	detailReservationDataWithRemovedItem,
	createDetailReservationItems,
} from '@/lib/detail-reservation-items'
import { groupValidationNotice } from '@/lib/group-validation'
import { businessProfilePayload } from '@/lib/business-profile-payload'
import {
	clearPublicRequestSelection,
	patchPublicRequestSelection as patchPublicRequestSelectionForState,
	publicRequestConversionPayload,
	publicRequestSelectionForId,
	type PublicRequestSelection,
	type PublicRequestSelections,
} from '@/lib/public-request-selection'
import { createRecordRelationLookups } from '@/lib/record-relations'
import {
	singleVehicleIdForCustomer,
	vehicleBrandOptions,
	vehicleModelOptionsForBrand,
	vehicleSelectOptions,
	vehiclesForOptionalCustomer,
	vehiclesMatchingCustomer,
} from '@/lib/vehicle-options'
import {
	detailVehiclePatchForBrand,
	vehicleFormWithBrand,
	vehicleFormWithCustomer,
} from '@/lib/vehicle-form-updates'
import { vehicleOptionsForDetail as detailVehicleOptions } from '@/lib/detail-vehicle-options'
import {
	vehicleDescriptionText,
	vehicleDisplayTitle,
	vehicleMatchesSearch,
} from '@/lib/vehicle-display'
import { serviceDisplayName, serviceSelectOptions } from '@/lib/service-display'
import {
	cashMovementFormWithCategory,
	createCashSubcategoryValidators,
	debtFormWithExpenseCategory,
} from '@/lib/cash-debt-form-updates'
import {
	addServiceMaterialLine as addServiceMaterialLineForLines,
	removeServiceMaterialLine as removeServiceMaterialLineForLines,
	updateServiceMaterialLine as updateServiceMaterialLineForLines,
} from '@/lib/service-material-lines'
import {
	apiPathForRecord,
	detailEndpoint,
	detailKindFromTitle,
	isEditableDetailKind,
	shouldStartDetailEditing,
} from '@/lib/detail-paths'
import {
	buildFreeVariables,
	buildFreeWhatsappHref,
	dispatchForEvent,
	freeTemplateBody,
	isFreeWhatsappMode,
	hasActiveWhatsappTemplate,
	renderFreeTemplate,
	whatsappAlreadySent,
	whatsappEventButtonVisible,
} from '@/lib/whatsapp-free'
import {
	type WhatsappEventSendOptions,
	whatsappEventForWorkOrderStatus,
	whatsappEventLabels,
} from '@/lib/whatsapp-events'
import {
	serviceCreatePayload,
} from '@/lib/service-detail-payload'
import {
	createDetailPayloadHelpers,
} from '@/lib/detail-payload'
import { sectorIdsByServiceId, serviceTypeForSectorId } from '@/lib/service-sector'
import {
	createServiceNotesForLine,
	serviceLinePayload as serviceLinePayloadForServices,
} from '@/lib/service-lines'
import {
	applyBasePriceToTypes,
	servicePriceForVehicleType,
	vehicleTypeForId,
	VEHICLE_TYPES,
} from '@/lib/service-pricing'
import {
	ensureGroupVehicleLines,
	groupReservationMode,
	groupVehicleLinePayload,
} from '@/lib/quote-groups'
import {
	firstGroupReservationLine,
	quoteCode,
	quoteDropStatus as parseQuoteDropStatus,
	quoteBoardForQuotes,
	quoteHasReservation,
	quoteLaneStatus,
	quoteReservationId,
	quoteStatusLabels,
} from '@/lib/quote-display'
import { shouldHandleUndoShortcut } from '@/lib/undo-shortcut'
import { urlBase64ToUint8Array } from '@/lib/push-subscription'
import {
	type CashQuickFilter,
	type CashSortKey,
	CASH_FILTER_DEFAULTS,
	blankCashMovementForm,
	buildCashFlowSummary,
	cashEntryDescriptionText,
	cashEntryKey,
	cashMovementPayload,
	cashEntryMatchesFilters,
	cashEntryMatchesQuickFilter,
	cashEntryTitleText,
	cashSourceKindLabel,
	cashSourceKindSelectOptions,
	compareExpenseClassificationPair,
	debtPaymentDetailData,
	hasCashFilters,
	normalizedCashText,
	sortCashEntries,
} from '@/lib/cash-entry'
import { cashCategorySelectOptions } from '@/lib/cash-category-select-options'
import {
	type CashViewMode,
	addCashPeriod,
	cashMonthStart,
	cashWeekStart,
} from '@/lib/cash-period'
import {
	DEBT_FILTER_DEFAULTS,
	debtSelectOptions,
	debtMatchesFilters,
	hasDebtFilters,
} from '@/lib/debt-filters'
import {
	customerAverageGapText,
	customerDaysAgoText,
	customerDaysText,
	customerListInsights,
	customerSelectOptions,
	customerScheduleLabel,
	customerVehicleCountByCustomerId,
	customerVehicleSearchTermsByCustomerId,
	formatTimeLabel,
} from '@/lib/customer-display'
import {
	filterCustomersForList,
	type CustomerCardFilter,
} from '@/lib/customer-list-filters'
import {
	blankProfileForm,
	profileActiveText,
	profileDisplayName,
	profileInitial,
	profileJoinedText,
	profileLastLoginText,
	profileRoleLabel,
	profileTrialText,
} from '@/lib/profile-display'
import {
	blankStockMovementForm,
	blankSupplierForm,
	buildStockMovementPayload,
	consumptionFormWithMode,
	stockDocumentTypeOptions,
	stockMovementTypeLabels,
	stockMovementTypeOptions,
	stockPaymentMethodOptions,
	stockMovementFormWithAddedLine,
	stockMovementFormWithPatchedLine,
	stockMovementFormWithRemovedLine,
	stockMovementLinesTotal,
} from '@/lib/inventory-forms'
import {
	materialStockValue,
	materialSelectOptions,
	materialUnitValue,
	openMaterialUnitSelectOptions,
	filterSuppliersForSearch,
	filterToolsForSearch,
	supplierSelectOptions,
	supplierListInsight,
	toolTotalValue,
} from '@/lib/inventory-display'
import { inventoryUsageSelectors } from '@/lib/inventory-usage-selectors'
import {
	inventorySummaryForMaterials,
	toolSummaryForTools,
} from '@/lib/inventory-summary'
import { selectOptionsFromValues } from '@/lib/display-text'
import type {
	PendingUndoAction,
	RunActionOptions,
	UndoAction,
} from '@/lib/action-runner-types'

import {
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
	DEFAULT_INCOME_CATEGORY,
	DEFAULT_PAYMENT_METHOD,
	DEFAULT_PAYMENT_TYPE,
	FEEDBACK_PULSE_MS,
	THEME_STORAGE_KEY,
	AgendaMouseSensor,
	AgendaTouchSensor,
	LoginScreen,
	NoticeToastViewport,
	addDays,
	apiErrorToast,
	asPayload,
	blankAgendaPaymentForm,
	blankBusinessForm,
	blankCustomerForm,
	blankDebtForm,
	blankDebtPaymentForm,
	blankFixedExpenseForm,
	blankPaymentForm,
	blankQuoteForm,
	blankQuoteItem,
	blankReservationForm,
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
	formatMonthLabel,
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
	addExpenseCategory,
	addIncomeCategory,
	removeExpenseCategory,
	removeIncomeCategory,
	renameExpenseCategory,
	renameIncomeCategory,
	upsertIncomeCategoryPair,
	upsertExpenseCategoryPair,
	useButtonHoverTitles,
	useFlashTarget,
	useNoticeToasts,
	usePendingActions,
} from '@/lib/page-support'

const SIDEBAR_NAV_ID = 'app-sidebar-navigation'
const UNDO_WINDOW_MS = 7000

const navigationConfig = {
	sections: Object.keys(sectionMeta),
	settingsSections: settingsSectionOptions.map((option) => option.value),
	defaultSection: 'dashboard',
	defaultSettingsSection: 'business',
} satisfies NavigationConfig









export default function Home() {
	useButtonHoverTitles()

	const [token, setToken] = useState<string | null>(null)
	const [currentUser, setCurrentUser] = useState<AnyRecord | null>(null)
	const [active, setActive] = useState<Section>(
		() => initialNavigationStateFromBrowser(navigationConfig).section as Section,
	)
	const [themeMode, setThemeMode] = useState<ThemeMode>('light')
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
	const [fullscreenActive, setFullscreenActive] = useState(false)
	const [fullscreenSupported, setFullscreenSupported] = useState(false)
	const sidebarMobileToggleRef = useRef<HTMLButtonElement>(null)
	const sidebarReturnFocusRef = useRef<HTMLElement | null>(null)
	const [settingsSection, setSettingsSection] =
		useState<SettingsSection>(
			() =>
				initialNavigationStateFromBrowser(navigationConfig)
					.settingsSection as SettingsSection,
		)
	const [searchPageQuery, setSearchPageQuery] = useState(searchQueryFromBrowser)
	const navigationHistoryModeRef = useRef<'pushState' | 'replaceState'>(
		'replaceState',
	)
	const [bootLoading, setBootLoading] = useState(false)
	const [sessionExpired, setSessionExpired] = useState(false)
	const [loadingDataSets, setLoadingDataSets] = useState<ReadonlySet<DataSetKey>>(
		() => new Set(),
	)
	const loadingDataSetCountsRef = useRef<Map<DataSetKey, number>>(new Map())
	const loadDataAbortControllersRef = useRef<Set<AbortController>>(new Set())
	const [agendaLoadError, setAgendaLoadError] =
		useState<ApiErrorNotice | null>(null)
	const [loadErrorNotice, setLoadErrorNotice] =
		useState<ApiErrorNotice | null>(null)
	const { toasts, showToast, dismissToast } = useNoticeToasts()
	const overdueReservationsFlow = useOverdueReservationsFlow()
	const loadOverdueReservations = useCallback(
		() =>
			apiList<OverdueReservation>('/reservations/overdue/', {
				bypassDedupe: true,
			}),
		[],
	)
	const pendingActions = usePendingActions()
	const runActionCounterRef = useRef(0)
	const overdueAgendaToastShownRef = useRef(false)
	const overdueLoadErrorToastVersionRef = useRef(0)
	const overdueSessionIdentityRef = useRef<string | null>(null)
	const { requestConfirm, ConfirmDialog } = useConfirmDialog()
	const isDataSetLoading = (key: DataSetKey) => loadingDataSets.has(key)
	const loading = bootLoading || loadingDataSets.size > 0
	const undoTimerRef = useRef<number | null>(null)
	const pendingUndoRef = useRef<PendingUndoAction | null>(null)
	const executeUndoRef = useRef<(id?: number) => void>(() => undefined)
	const nextUndoIdRef = useRef(0)
	const [search, setSearch] = useState('')
	const [customerCardFilter, setCustomerCardFilter] =
		useState<CustomerCardFilter>('all')
	const [agendaStartDay, setAgendaStartDay] = useState(today)
	const [agendaRangeMode, setAgendaRangeMode] =
		useState<'week' | 'month'>('week')
	const [agendaSectorId, setAgendaSectorId] =
		useState<number | null>(null)
	const [workViewMode, setWorkViewMode] =
		useState<WorkOrderViewMode>('agenda')
	const [selectedDay, setSelectedDay] = useState(today)
	const prevSelectedDayRef = useRef(today)
	const [cashViewMode, setCashViewMode] = useState<CashViewMode>('day')
	const prevCashViewModeRef = useRef<CashViewMode>('day')
	const [cashSummaryMode, setCashSummaryMode] =
		useState<CashSummaryMode>('cashflow')
	const [cashFilters, setCashFilters] =
		useState<CashFilterState>(CASH_FILTER_DEFAULTS)
	const [cashQuickFilter, setCashQuickFilter] =
		useState<CashQuickFilter>('all')
	const [cashSortKey, setCashSortKey] =
		useState<CashSortKey>('occurred_desc')
	const [debtFilters, setDebtFilters] =
		useState<DebtFilterState>(DEBT_FILTER_DEFAULTS)
	const [period, setPeriod] = useState(() => monthRange(today))
	const [dashboardView, setDashboardView] = useState<'summary' | 'analysis'>(
		'summary',
	)

	const [dashboard, setDashboard] = useState<AnyRecord>({})
	const [cash, setCash] = useState<AnyRecord>({})
	const [customers, setCustomers] = useState<AnyRecord[]>([])
	const [vehicles, setVehicles] = useState<AnyRecord[]>([])
	const [services, setServices] = useState<AnyRecord[]>([])
	const [serviceMaterials, setServiceMaterials] = useState<AnyRecord[]>([])
	const [sectors, setSectors] = useState<AnyRecord[]>([])
	const [reservations, setReservations] = useState<AnyRecord[]>([])
	const [workOrders, setWorkOrders] = useState<AnyRecord[]>([])
	const [payments, setPayments] = useState<AnyRecord[]>([])
	const [debts, setDebts] = useState<AnyRecord[]>([])
	const [debtPayments, setDebtPayments] = useState<AnyRecord[]>([])
	const [fixedExpenses, setFixedExpenses] = useState<AnyRecord[]>([])
	const [fixedExpenseOccurrences, setFixedExpenseOccurrences] = useState<AnyRecord[]>([])
	const [materials, setMaterials] = useState<AnyRecord[]>([])
	const [suppliers, setSuppliers] = useState<AnyRecord[]>([])
	const [stockMovements, setStockMovements] = useState<AnyRecord[]>([])
	const [purchases, setPurchases] = useState<AnyRecord[]>([])
	const [consumptions, setConsumptions] = useState<AnyRecord[]>([])
	const [materialOpenUnits, setMaterialOpenUnits] = useState<AnyRecord[]>([])
	const [tools, setTools] = useState<AnyRecord[]>([])
	const [quotes, setQuotes] = useState<AnyRecord[]>([])
	const [tasks, setTasks] = useState<AnyRecord[]>([])
	const [publicRequests, setPublicRequests] = useState<AnyRecord[]>([])
	const [whatsappConfig, setWhatsappConfig] = useState<AnyRecord | null>(null)
	const [whatsappTemplates, setWhatsappTemplates] = useState<AnyRecord[]>([])
	const [whatsappAutomationRules, setWhatsappAutomationRules] = useState<AnyRecord[]>([])
	const [whatsappMessages, setWhatsappMessages] = useState<AnyRecord[]>([])
	const [publicRequestSelections, setPublicRequestSelections] = useState<
		PublicRequestSelections
	>({})
	const [employees, setEmployees] = useState<AnyRecord[]>([])
	const [selectedEmployee, setSelectedEmployee] = useState<AnyRecord | null>(null)
	const [employeeAuditLogs, setEmployeeAuditLogs] = useState<AnyRecord[]>([])
	const [employeeAuditLogsLoading, setEmployeeAuditLogsLoading] = useState(false)
	const [employeeAuditLogsError, setEmployeeAuditLogsError] = useState<string | null>(null)
	const [auditLogs, setAuditLogs] = useState<AnyRecord[]>([])
	const [auditFilters, setAuditFilters] = useState<AuditLogFilters>(() => {
		const d = new Date()
		d.setDate(d.getDate() - 90)
		return { from: d.toISOString().slice(0, 10) }
	})
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
			lockCategory: false,
		})
	const [cashCategoryForm, setCashCategoryForm] = useState<AnyRecord>({
		movement_type: 'expense',
		name: '',
		originalName: '',
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
		vehicle_type: 'auto',
		notes: '',
	})
	const [serviceForm, setServiceForm] = useState<AnyRecord>({
		id: '',
		name: '',
		icon: '',
		sector: null,
		service_type: 'wash',
		base_price: '',
		price_moto: '',
		price_auto: '',
		price_camioneta: '',
		price_combi: '',
		price_camion: '',
		estimated_duration_minutes: '60',
		estimated_material_cost: '',
		notes: '',
	})
	const [serviceMaterialLines, setServiceMaterialLines] = useState<AnyRecord[]>([])
	const [reservationForm, setReservationForm] = useState<AnyRecord>(
		blankReservationForm(),
	)
	const [paymentForm, setPaymentForm] = useState<AnyRecord>(blankPaymentForm())
	const [movementForm, setMovementForm] = useState<AnyRecord>(
		blankCashMovementForm(selectedDay),
	)
	const [debtForm, setDebtForm] = useState<AnyRecord>(blankDebtForm(today))
	const [fixedExpenseForm, setFixedExpenseForm] = useState<AnyRecord>(
		blankFixedExpenseForm(today),
	)
	const [payOccurrenceForm, setPayOccurrenceForm] = useState<{
		id: string | number
		fixed_expense: string | number
		method: string
		paid_at: string
		amount: string
		original_amount: string
		update_template: boolean
	}>({ id: '', fixed_expense: '', method: 'transfer', paid_at: today, amount: '', original_amount: '', update_template: false })
	const [debtPaymentForm, setDebtPaymentForm] = useState<AnyRecord>(
		blankDebtPaymentForm(today),
	)
	const [cashLoadTab, setCashLoadTab] = useState<
		'cash-movement' | 'payment' | 'debt-payment'
	>('cash-movement')
	const [materialForm, setMaterialForm] = useState<AnyRecord>({
		id: '',
		sector: null,
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
	const [historicalUsageForm, setHistoricalUsageForm] = useState<AnyRecord>({
		material: '',
		service: '',
		reservations: [] as string[],
		opened_at: '',
		finished_at: '',
		stock_quantity_to_decrement: '1',
		observations: '',
		update_recipe: false,
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
	const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null)
	const [profileAvatarInputKey, setProfileAvatarInputKey] = useState(0)
	const [profileAvatarPreview, setProfileAvatarPreview] = useState<
		string | null
	>(null)
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
	const reservationStatusConfig: ReservationStatusConfig = useMemo(
		() => reservationStatusConfigFromProfile(businessForm),
		[
			businessForm.reservation_use_pending,
			businessForm.reservation_use_in_progress,
			businessForm.reservation_use_ready,
			businessForm.reservation_use_canceled,
			businessForm.reservation_auto_charge_on_delivery,
		],
	)
	const workStatusColumns = useMemo(
		() => buildWorkStatusColumns(reservationStatusConfig),
		[reservationStatusConfig],
	)
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
		close: () => closeDetailModal(),
	}
	const profileExit = {
		close: () => closeProfileModal(),
	}
	const consumptionExit = {
		close: () => setConsumeForOrder(null),
	}
	const paymentExit = {
		close: () => closePaymentModal(),
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
		setFullscreenSupported(isFullscreenSupported(document))
		setFullscreenActive(isFullscreenActive(document))

		const syncFullscreenState = () => {
			setFullscreenActive(isFullscreenActive(document))
		}

		document.addEventListener('fullscreenchange', syncFullscreenState)
		return () => {
			document.removeEventListener('fullscreenchange', syncFullscreenState)
		}
	}, [])

	useEffect(() => {
		const handlePopState = () => {
			const nextNavigation = readNavigationStateFromUrl(
				window.location.href,
				navigationConfig,
			)
			navigationHistoryModeRef.current = 'replaceState'
			setActive(nextNavigation.section as Section)
			setSettingsSection(nextNavigation.settingsSection as SettingsSection)
			setSearchPageQuery(searchQueryFromBrowser())
			setSidebarMobileOpen(false)
		}
		window.addEventListener('popstate', handlePopState)
		return () => {
			window.removeEventListener('popstate', handlePopState)
		}
	}, [])

	useEffect(() => {
		const baseUrl = navigationUrlForState(
			window.location.href,
			{ section: active, settingsSection },
			navigationConfig,
		)
		// El termino buscado solo viaja en la URL dentro de la seccion buscador,
		// para que sobreviva refresh/back sin ensuciar el resto de secciones.
		const url = new URL(baseUrl, window.location.origin)
		const trimmedQuery = searchPageQuery.trim()
		if (active === 'search' && trimmedQuery) {
			url.searchParams.set('q', trimmedQuery)
		} else {
			url.searchParams.delete('q')
		}
		const nextUrl = `${url.pathname}${url.search}${url.hash}`
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
		if (nextUrl !== currentUrl) {
			window.history[navigationHistoryModeRef.current](null, '', nextUrl)
		}
		navigationHistoryModeRef.current = 'pushState'
	}, [active, settingsSection, searchPageQuery])

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
	useEffect(() => revokeProfileAvatarObjectUrl, [])
	const { flashTarget, flash } = useFlashTarget(FEEDBACK_PULSE_MS)

	const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>(
		{},
	)

	function setError(notice: ApiErrorNotice | null) {
		if (notice) {
			showToast(apiErrorToast(notice))
			setFormFieldErrors(fieldErrorMapFromNotice(notice))
		} else {
			setFormFieldErrors({})
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
				icon: <Undo2 size={15} />,
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
			await pending.execute()
			await loadData({ force: true })
			await refreshOverdueReservationsForSection(
				displayedActive,
				() => overdueReservationsFlow.refresh(loadOverdueReservations),
			)
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
	const profileAvatarObjectUrlRef = useRef<string | null>(null)
	const profileAvatarInputRef = useRef<HTMLInputElement | null>(null)
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

	function revokeProfileAvatarObjectUrl() {
		if (!profileAvatarObjectUrlRef.current) return
		window.URL.revokeObjectURL(profileAvatarObjectUrlRef.current)
		profileAvatarObjectUrlRef.current = null
	}

	function resetProfileAvatarSelection() {
		revokeProfileAvatarObjectUrl()
		setProfileAvatarFile(null)
		setProfileAvatarInputKey((key) => key + 1)
		setProfileAvatarPreview(currentUser?.avatar_url ?? null)
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
		resetProfileAvatarSelection()
		setProfileModalOpen(true)
	}

	function closeProfileModal() {
		setProfileModalOpen(false)
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
					business_type: String(profile.business_type ?? ''),
					contact_phone: String(profile.contact_phone ?? ''),
					contact_email: String(profile.contact_email ?? ''),
					address: String(profile.address ?? ''),
					maps_url: String(profile.maps_url ?? ''),
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
					allow_overlapping_reservations:
						profile.allow_overlapping_reservations === true,
					enforce_capacity_limit:
						profile.enforce_capacity_limit !== false,
					default_capacity_wash: String(
						profile.default_capacity_wash ?? '8',
					),
					default_capacity_detailing: String(
						profile.default_capacity_detailing ?? '4',
					),
					reservation_use_pending:
						profile.reservation_use_pending !== false,
					reservation_use_in_progress:
						profile.reservation_use_in_progress !== false,
					reservation_use_ready:
						profile.reservation_use_ready !== false,
					reservation_use_canceled:
						profile.reservation_use_canceled !== false,
					reservation_auto_charge_on_delivery:
						profile.reservation_auto_charge_on_delivery === true,
					public_landing_enabled:
						profile.public_landing_enabled !== false,
					public_landing_intro: String(
						profile.public_landing_intro ?? '',
					),
					allow_public_booking_requests:
						profile.allow_public_booking_requests !== false,
					allow_public_quote_requests:
						profile.allow_public_quote_requests !== false,
					public_hidden_service_ids: Array.isArray(
						profile.public_hidden_service_ids,
					)
						? profile.public_hidden_service_ids
								.map((value) => Number(value))
								.filter((value) => Number.isFinite(value) && value > 0)
						: [],
					onboarding_dismissed_step_ids: Array.isArray(
						profile.onboarding_dismissed_step_ids,
					)
						? profile.onboarding_dismissed_step_ids.map((value) => String(value))
						: [],
					public_show_service_description:
						profile.public_show_service_description !== false,
					public_show_service_price:
						profile.public_show_service_price === true,
					opening_time: profile.opening_time
						? String(profile.opening_time)
						: null,
					closing_time: profile.closing_time
						? String(profile.closing_time)
						: null,
					working_hours: Array.isArray(profile.working_hours) && profile.working_hours.length === 7
						? (profile.working_hours as WorkingHoursEntry[])
						: DEFAULT_WORKING_HOURS,
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
		revokeBusinessLogoObjectUrl()
		if (!file) {
			setBusinessLogoFile(null)
			setBusinessLogoPreview(businessProfile?.logo_url ?? null)
			return
		}
		const isAllowedLogoFile =
			file.type.startsWith('image/') || isPdfFile(file)
		if (!isAllowedLogoFile) {
			setBusinessLogoFile(null)
			setBusinessLogoPreview(businessProfile?.logo_url ?? null)
			return
		}
		setBusinessLogoFile(file)
		const objectUrl = window.URL.createObjectURL(file)
		businessLogoObjectUrlRef.current = objectUrl
		setBusinessLogoPreview(objectUrl)
	}

	function openBusinessLogoPicker() {
		businessLogoInputRef.current?.click()
	}

	function handleProfileAvatarChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null
		setProfileAvatarFile(file)
		revokeProfileAvatarObjectUrl()
		if (!file) {
			setProfileAvatarPreview(currentUser?.avatar_url ?? null)
			return
		}
		const objectUrl = window.URL.createObjectURL(file)
		profileAvatarObjectUrlRef.current = objectUrl
		setProfileAvatarPreview(objectUrl)
	}

	function openProfileAvatarPicker() {
		profileAvatarInputRef.current?.click()
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
	const sidebarBusinessLogoSrc =
		safeBusinessLogoPreview && !businessLogoIsPdf
			? safeBusinessLogoPreview
			: businessLogoIsPdf && safeBusinessLogoPdfThumbnail
				? safeBusinessLogoPdfThumbnail
				: null

	const {
		thumbnail: sidebarAvatarPdfThumbnail,
	} = usePdfThumbnailPreview(currentUser?.avatar_url ?? null, sidebarAvatarIsPdf, 128)
	const safeSidebarAvatarUrl = safeImageAssetSource(currentUser?.avatar_url)
	const safeSidebarAvatarPdfThumbnail = safeImageAssetSource(
		sidebarAvatarPdfThumbnail,
	)

	const profileAvatarIsPdf = profileAvatarFile
		? isPdfFile(profileAvatarFile)
		: isPdfAssetSource(profileAvatarPreview)
	const { thumbnail: profileAvatarPdfThumbnail } = usePdfThumbnailPreview(
		profileAvatarPreview,
		profileAvatarIsPdf,
		256,
	)
	const safeProfileAvatarPreview = safeImageAssetSource(profileAvatarPreview)
	const safeProfileAvatarPdfThumbnail = safeImageAssetSource(
		profileAvatarPdfThumbnail,
	)

	useEffect(() => {
		syncProfileForm(currentUser)
		resetProfileAvatarSelection()
	}, [currentUser])

	useEffect(() => {
		if (!formModal) return
		setFormFieldErrors({})
		const firstFocus: Record<FormModalKind, string> = {
			customer: 'customer.name',
			vehicle: 'vehicle.customer',
			quote: 'quote.customer',
			service: 'service.name',
			payment: 'payment.work_order',
			'cash-movement': 'cash-movement.type',
			'cash-load': 'cash-movement.type',
			'expense-classification': 'expense-classification.type',
			'cash-category': 'cash-category.name',
			debt: 'debt.concept',
			'debt-payment': 'debt-payment.debt',
			'fixed-expense': 'fixed-expense.concept',
			'fixed-expense-pay': 'fixed-expense-pay.method',
			material: 'material.name',
			supplier: 'supplier.name',
			'stock-movement': 'stock-movement.type',
			'material-purchase': 'material-purchase.material',
			'material-open-unit': 'material-open-unit.material',
			'material-historical-usage': 'material-historical-usage.material',
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

	const { customerForRecord, vehicleForRecord } = createRecordRelationLookups(
		customers,
		vehicles,
	)
	const customerVehicleSearchTextById = useMemo(
		() => customerVehicleSearchTermsByCustomerId(vehicles),
		[vehicles],
	)

	const customerVehicleCountById = useMemo(
		() => customerVehicleCountByCustomerId(vehicles),
		[vehicles],
	)

	const filteredCustomers = useMemo(
		() =>
			filterCustomersForList(
				customers,
				customerCardFilter,
				search,
				customerVehicleSearchTextById,
			),
		[customerCardFilter, customerVehicleSearchTextById, customers, search],
	)

	const filteredVehicles = useMemo(() => {
		return vehicles.filter((item) => vehicleMatchesSearch(item, search))
	}, [vehicles, search])

	const filteredTools = useMemo(
		() => filterToolsForSearch(tools, search, toolStatusLabels),
		[tools, search],
	)

	const filteredDebts = useMemo(() => {
		return debts.filter((item) => debtMatchesFilters(item, debtFilters, search))
	}, [debtFilters, debts, search])

	const filteredSuppliers = useMemo(
		() => filterSuppliersForSearch(suppliers, search),
		[suppliers, search],
	)

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
	const workReservationRow = createWorkReservationRow(workOrderByReservation)
	const sectorSelectOptions = useMemo(
		() => agendaSectorSelectOptions(sectors),
		[sectors],
	)

	const sectorIdByServiceId = useMemo(
		() => sectorIdsByServiceId(services),
		[services],
	)
	const visibleAgendaReservations = useMemo(
		() => filterAgendaReservationsBySector(reservations, agendaSectorId),
		[agendaSectorId, reservations],
	)
	const workStatusGroups = useMemo(
		() =>
			groupReservationsByWorkOrderStatusColumns(
				visibleAgendaReservations,
				workOrders,
				workStatusColumns,
			),
		[visibleAgendaReservations, workOrders, workStatusColumns],
	)
	const workEntryDateGroups = useMemo(
		() => groupReservationsByEntryDate(visibleAgendaReservations, currentDay),
		[currentDay, visibleAgendaReservations],
	)
	const workFreeQuotesWithoutEntryDate = useMemo(
		() => filterFreeQuotesBySector(quotes, sectorIdByServiceId, agendaSectorId),
		[agendaSectorId, quotes, sectorIdByServiceId],
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
	const agendaMonthModel = useMemo(
		() =>
			buildAgendaMonthGrid(
				visibleAgendaReservations,
				workOrders,
				agendaStartDay,
				{
					showStayDays: showStayDaysInAgenda,
					weekStartsOn: 1,
					chipLimit: 3,
					today: currentDay,
				},
				workOrderByReservation,
			),
		[
			agendaStartDay,
			currentDay,
			showStayDaysInAgenda,
			visibleAgendaReservations,
			workOrderByReservation,
			workOrders,
		],
	)
	const agendaMonthWeekdayLabels = useMemo(
		() =>
			(agendaMonthModel.weeks[0]?.days ?? []).map((cell) =>
				formatDayName(cell.isoDate),
			),
		[agendaMonthModel],
	)
	const agendaMonthLabel = formatMonthLabel(agendaStartDay)
	const agendaSectorLabel =
		agendaSectorId === null
			? 'Todos'
			: (sectors.find((s) => s.id === agendaSectorId)?.name ?? 'Sector')
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
	const quoteBoard = useMemo(() => quoteBoardForQuotes(quotes), [quotes])
	const activeQuoteDrag = useMemo(() => {
		if (!activeQuoteDragId) return null
		return quotes.find((item) => String(item.id) === activeQuoteDragId) ?? null
	}, [activeQuoteDragId, quotes])

	const serviceNotesForLine = createServiceNotesForLine(services)

	const quoteTotals = useMemo(() => {
		return quoteTotalsForForm(quoteForm)
	}, [
		quoteForm,
		quoteForm.items,
		quoteForm.vehicle_lines,
		quoteForm.discount_rate,
		quoteForm.tax_rate,
	])

	const auditModuleOptions = useMemo(
		() =>
			sortedAuditValues(
				auditLogs,
				'module',
				(module) => auditModuleLabels[module] ?? module,
			),
		[auditLogs],
	)
	const auditActionOptions = useMemo(
		() =>
			sortedAuditValues(
				auditLogs,
				'action',
				(action) => auditActionLabels[action] ?? action,
			),
		[auditLogs],
	)
	const auditActorOptions = useMemo(
		() => sortedAuditActorValues(auditLogs),
		[auditLogs],
	)
	const auditFiltersActive = hasActiveAuditFilters(auditFilters)

	const auditActionLabel = useCallback(
		(action: string) => auditActionLabels[action] ?? action,
		[],
	)

	const auditModuleLabel = useCallback(
		(module: string) => auditModuleLabels[module] ?? module,
		[],
	)

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
		setBootLoading(true)
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
			setBootLoading(false)
		}
	}

	async function clearAuditFilters() {
		const emptyFilters: AuditLogFilters = {}
		setAuditFilters(emptyFilters)
		if (!canViewEconomy) return
		setBootLoading(true)
		try {
			await refreshAuditLogs(emptyFilters)
		} finally {
			setBootLoading(false)
		}
	}

	type LoadDataOptions = {
		force?: boolean
		preserveActiveLoad?: boolean
		section?: Section
		settingsSection?: SettingsSection
		period?: { from: string; to: string }
	}

	const appDataAppliers: AppDataAppliers = {
		dashboard: setDashboard,
		cash: setCash,
		customers: setCustomers,
		vehicles: setVehicles,
		services: setServices,
		serviceMaterials: setServiceMaterials,
		sectors: setSectors,
		reservations: setReservations,
		workOrders: setWorkOrders,
		payments: setPayments,
		debts: setDebts,
		debtPayments: setDebtPayments,
		fixedExpenses: setFixedExpenses,
		fixedExpenseOccurrences: setFixedExpenseOccurrences,
		materials: setMaterials,
		suppliers: setSuppliers,
		stockMovements: setStockMovements,
		materialOpenUnits: setMaterialOpenUnits,
		purchases: setPurchases,
		consumptions: setConsumptions,
		tools: setTools,
		quotes: setQuotes,
		tasks: setTasks,
		publicRequests: setPublicRequests,
		businessProfile: syncBusinessProfile,
		employees: setEmployees,
		whatsappConfig: setWhatsappConfig,
		whatsappTemplates: setWhatsappTemplates,
		whatsappAutomationRules: setWhatsappAutomationRules,
		whatsappMessages: setWhatsappMessages,
	}

	async function loadData(options: LoadDataOptions = {}): Promise<boolean> {
		const dataScope = { period: options.period ?? period, selectedDay, cashViewMode }
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

		if (!keysToLoad.length) return true

		const controller = beginDataLoad(
			loadDataAbortControllersRef.current,
			options.preserveActiveLoad,
		)

		setLoadingDataSets(
			beginDataSetLoading(loadingDataSetCountsRef.current, keysToLoad),
		)
		setError(null)
		setAgendaLoadError(null)
		setLoadErrorNotice(null)
		try {
			const entries = await loadAppDataSets(keysToLoad, dataScope, {
				apiFetch: (path, opts) =>
					apiFetch(path, {
						...opts,
						signal: controller.signal,
						bypassDedupe: Boolean(options.force),
					}),
				apiList: (path, opts) =>
					apiList(path, {
						...opts,
						signal: controller.signal,
						bypassDedupe: Boolean(options.force),
					}),
			})
			if (controller.signal.aborted) return false
			for (const [key, data] of entries) {
				applyAppDataEntry(key, data, appDataAppliers)
				loadedDataCacheRef.current.add(dataSetCacheKey(key, dataScope))
			}
			return true
		} catch (err: any) {
			if (err?.name === 'AbortError') return false
			const notice = formatApiError(err, {
				fallbackTitle: 'No se pudieron cargar los datos',
				fallbackDescription:
					'Actualiza nuevamente o revisa la conexion con el servidor.',
			})
			setAgendaLoadError(notice)
			setLoadErrorNotice(notice)
			setError(notice)
			return false
		} finally {
			loadDataAbortControllersRef.current.delete(controller)
			setLoadingDataSets(
				finishDataSetLoading(
					loadingDataSetCountsRef.current,
					keysToLoad,
				),
			)
		}
	}

	useEffect(() => {
		const stored = getStoredToken()
		if (stored) {
			setToken(stored)
		}
	}, [])

	useEffect(() => {
		const controllers = loadDataAbortControllersRef.current
		return () => cancelDataLoads(controllers)
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
		setBootLoading(true)
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
					setSessionExpired(true)
				}
			})
			.finally(() => {
				if (!ignore) {
					setBootLoading(false)
				}
			})

		return () => {
			ignore = true
		}
	}, [currentUser, token])

	useEffect(() => {
		const nextIdentity =
			token && currentUser
				? `${String(currentUser.id)}:${String(
						currentUser.business?.id ?? currentUser.business ?? '',
					)}`
				: null
		if (overdueSessionIdentityRef.current === nextIdentity) return

		overdueSessionIdentityRef.current = nextIdentity
		cancelDataLoads(loadDataAbortControllersRef.current)
		overdueAgendaToastShownRef.current = false
		overdueLoadErrorToastVersionRef.current = 0
		overdueReservationsFlow.reset()
	}, [
		currentUser,
		currentUser?.business,
		currentUser?.id,
		overdueReservationsFlow.reset,
		token,
	])

	useEffect(() => {
		if (token && currentUser) {
			if (prevSelectedDayRef.current !== selectedDay || prevCashViewModeRef.current !== cashViewMode) {
				for (const key of [...loadedDataCacheRef.current]) {
					if (key.startsWith('cash:')) loadedDataCacheRef.current.delete(key)
				}
				prevSelectedDayRef.current = selectedDay
				prevCashViewModeRef.current = cashViewMode
			}
			loadData()
		}
	}, [currentUser, displayedActive, selectedDay, cashViewMode, settingsSection, token])

	useEffect(() => {
		if (
			!token ||
			!currentUser ||
			!sectionUsesOverdueReservations(displayedActive)
		) {
			return
		}
		void refreshOverdueReservationsForSection(
			displayedActive,
			() => overdueReservationsFlow.refresh(loadOverdueReservations),
		)
	}, [
		currentUser,
		displayedActive,
		loadOverdueReservations,
		overdueReservationsFlow.refresh,
		token,
	])

	useEffect(() => {
		const toast = overdueLoadErrorToast({
			section: displayedActive,
			loadState: overdueReservationsFlow.loadState,
			listOpen: overdueReservationsFlow.listOpen,
		})
		if (
			!toast ||
			overdueReservationsFlow.loadErrorVersion <= 0 ||
			overdueLoadErrorToastVersionRef.current ===
				overdueReservationsFlow.loadErrorVersion
		) {
			return
		}

		overdueLoadErrorToastVersionRef.current =
			overdueReservationsFlow.loadErrorVersion
		let toastId = 0
		toastId = showToast({
			tone: 'error',
			...toast,
			visibleMs: 8000,
			action: {
				label: 'Reintentar',
				title: 'Reintentar la carga de reservas vencidas',
				onClick: () => {
					dismissToast(toastId)
					void refreshOverdueReservationsForSection(
						displayedActive,
						() =>
							overdueReservationsFlow.refresh(
								loadOverdueReservations,
							),
					)
				},
			},
		})
	}, [
		dismissToast,
		displayedActive,
		loadOverdueReservations,
		overdueReservationsFlow.listOpen,
		overdueReservationsFlow.loadErrorVersion,
		overdueReservationsFlow.loadState,
		overdueReservationsFlow.refresh,
		showToast,
	])

	useEffect(() => {
		const toast = overdueAgendaToast({
			isAgendaActive: displayedActive === 'agenda',
			loadState: overdueReservationsFlow.loadState,
			count: overdueReservationsFlow.rows.length,
			alreadyShown:
				overdueReservationsFlow.toastShown ||
				overdueAgendaToastShownRef.current,
		})
		if (!toast) return

		overdueAgendaToastShownRef.current = true
		overdueReservationsFlow.markToastShown()
		showToast({
			tone: 'attention',
			...toast,
			visibleMs: 8000,
			action: {
				label: 'Ver',
				title: 'Ver reservas vencidas',
				icon: <Eye size={15} />,
				onClick: overdueReservationsFlow.openList,
			},
		})
	}, [
		displayedActive,
		overdueReservationsFlow.loadState,
		overdueReservationsFlow.markToastShown,
		overdueReservationsFlow.openList,
		overdueReservationsFlow.rows.length,
		overdueReservationsFlow.toastShown,
		showToast,
	])

	const prefetchedSectionsRef = useRef<Set<Section>>(new Set())
	function prefetchSection(section: Section) {
		if (!token || !currentUser) return
		if (section === displayedActive) return
		if (prefetchedSectionsRef.current.has(section)) return
		prefetchedSectionsRef.current.add(section)
		loadData({ section })
	}

	const periodReloadTimeoutRef = useRef<number | null>(null)
	function schedulePeriodReload(next: { from: string; to: string }) {
		setPeriod(next)
		if (periodReloadTimeoutRef.current) {
			window.clearTimeout(periodReloadTimeoutRef.current)
		}
		periodReloadTimeoutRef.current = window.setTimeout(() => {
			periodReloadTimeoutRef.current = null
			loadData({ force: true, section: 'dashboard', period: next })
		}, 400)
	}
	function triggerPeriodReloadNow() {
		if (periodReloadTimeoutRef.current) {
			window.clearTimeout(periodReloadTimeoutRef.current)
			periodReloadTimeoutRef.current = null
		}
		loadData({ force: true, section: 'dashboard', period })
	}
	function goToMonth(offset: number) {
		const next = monthRange(period.from, offset)
		if (periodReloadTimeoutRef.current) {
			window.clearTimeout(periodReloadTimeoutRef.current)
			periodReloadTimeoutRef.current = null
		}
		setPeriod(next)
		loadData({ force: true, section: 'dashboard', period: next })
	}
	useEffect(() => {
		return () => {
			if (periodReloadTimeoutRef.current) {
				window.clearTimeout(periodReloadTimeoutRef.current)
				periodReloadTimeoutRef.current = null
			}
		}
	}, [])

	useEffect(() => {
		if (!token || !currentUser) return
		const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
		if (!vapidKey) return
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

		const registerBusinessPush = async () => {
			try {
				const permission = await Notification.requestPermission()
				if (permission !== 'granted') return
				const registration = await navigator.serviceWorker.register('/sw.js')
				await navigator.serviceWorker.ready
				const existing = await registration.pushManager.getSubscription()
				const subscription = existing ?? await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(vapidKey),
				})
				await apiFetch('/auth/me/', {
					method: 'PATCH',
					body: JSON.stringify({ push_subscription: subscription.toJSON() }),
				})
			} catch {
				// Silencioso: el negocio sigue operando sin push
			}
		}
		registerBusinessPush()
	}, [token, currentUser])

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
		setBootLoading(true)
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
					setBootLoading(false)
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

	const flashClass = createFlashClass(flashTarget)
	const recordClass = createRecordClass(flashTarget)

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

	const shouldSuppressEnteringAgendaOverlap =
		agendaOverlapSuppressedStartDay === agendaBoardModel.startDay &&
		agendaSlideWindowsOverlap(agendaSlideMotion, AGENDA_VISIBLE_DAYS)

	// Mientras se cargan los movimientos (skeleton activo) ocultamos las
	// cabeceras reales del tablero para que no se vean las fechas todavia.
	const agendaWeekSkeletonActive =
		agendaRangeMode === 'week' &&
		loading &&
		!agendaLoadError &&
		!agendaBoardModel.segments.length

	const quoteTentativeTimeLabel = createQuoteTentativeTimeLabel(
		useReservationTimes,
	)

	async function runAgendaReservationAction(
		action: AgendaReservationAction,
		reservation: AnyRecord,
		workOrder: AnyRecord | null | undefined,
		row: AgendaOperationalRow,
	) {
		if (action.kind === 'reservation') {
			if (action.action === 'delete') {
				return runAction(
					() =>
						apiFetch(`/reservations/${reservation.id}/`, {
							method: 'DELETE',
						}),
					{
						successTitle: entityFeedbackTitle('reservation', 'deleted'),
					},
				)
			}
			const previousStatus = reservation.status
			const result = await runAction(
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
			if (action.action === 'confirm' && result) {
				void runProactiveWhatsappEvent({
					event: 'reservation_confirmed',
					source: 'reservation',
					sourceId: reservation.id,
					customer: customerForRecord(reservation),
					vehicle: vehicleForRecord(reservation),
					record: reservation,
					reservationId: reservation.id,
				})
			}
			return result
		}

		if (action.kind === 'work-order-status') {
			if (!workOrder) return undefined
			const previousStatus = workOrder.status ?? reservation.status
			const previousWorkOrders = workOrders
			const result = await runOptimistic({
				key: `wo-status:${workOrder.id}`,
				optimistic: () =>
					setWorkOrders((current) =>
						current.map((item) =>
							String(item.id) === String(workOrder.id)
								? { ...item, status: action.status }
								: item,
						),
					),
				rollback: () => setWorkOrders(previousWorkOrders),
				action: () =>
					apiFetch(`/work-orders/${workOrder.id}/status/`, {
						method: 'POST',
						body: JSON.stringify({
							status: action.status,
						}),
					}),
				successTitle: entityFeedbackTitle('workorder', 'updated'),
			})
			const event = whatsappEventForWorkOrderStatus(action.status)
			if (result && event) {
				void runProactiveWhatsappEvent({
					event,
					source: 'workOrder',
					sourceId: workOrder.id,
					customer: customerForRecord(reservation),
					vehicle: vehicleForRecord(reservation),
					record: reservation,
					reservationId: reservation.id,
				})
			}
			return result
		}

		if (workOrder) {
			openPaymentForOrder(workOrder)
		}
		return undefined
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
		const confirmationAlreadySent = whatsappAlreadySent(
			whatsappMessages,
			'reservation_confirmed',
			'reservation',
			reservation.id,
		)
		const readyAlreadySent = Boolean(
			workOrder &&
				whatsappAlreadySent(
					whatsappMessages,
					'work_ready',
					'workOrder',
					workOrder.id,
				),
		)
		const deliveredAlreadySent = Boolean(
			workOrder &&
				whatsappAlreadySent(
					whatsappMessages,
					'work_delivered',
					'workOrder',
					workOrder.id,
				),
		)
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
				id: `agenda:whatsapp:confirm:${reservation.id}`,
				label: confirmationAlreadySent
					? 'Reenviar por WhatsApp: confirmar turno'
					: 'WhatsApp: confirmar turno',
				icon: <MessageCircle size={15} />,
				hidden: !whatsappEventButtonVisible({
					config: whatsappConfig,
					templates: whatsappTemplates,
					event: 'reservation_confirmed',
					phone: customer?.phone,
				}),
				onSelect: () =>
					void sendWhatsappEventWithResendGuard({
						event: 'reservation_confirmed',
						source: 'reservation',
						sourceId: reservation.id,
						customer,
						vehicle,
						record: reservation,
						reservationId: reservation.id,
					}),
			},
			{
				id: `agenda:whatsapp:ready:${reservation.id}`,
				label: readyAlreadySent
					? 'Reenviar por WhatsApp: listo para entregar'
					: 'WhatsApp: listo para entregar',
				icon: <MessageCircle size={15} />,
				hidden:
					!showWork ||
					!workOrder ||
					!whatsappEventButtonVisible({
						config: whatsappConfig,
						templates: whatsappTemplates,
						event: 'work_ready',
						phone: customer?.phone,
					}),
				onSelect: () =>
					void sendWhatsappEventWithResendGuard({
						event: 'work_ready',
						source: 'workOrder',
						sourceId: workOrder?.id ?? '',
						customer,
						vehicle,
						record: reservation,
						reservationId: reservation.id,
					}),
			},
			{
				id: `agenda:whatsapp:delivered:${reservation.id}`,
				label: deliveredAlreadySent
					? 'Reenviar por WhatsApp: trabajo entregado'
					: 'WhatsApp: trabajo entregado',
				icon: <MessageCircle size={15} />,
				hidden:
					!showWork ||
					!workOrder ||
					!whatsappEventButtonVisible({
						config: whatsappConfig,
						templates: whatsappTemplates,
						event: 'work_delivered',
						phone: customer?.phone,
					}),
				onSelect: () =>
					void sendWhatsappEventWithResendGuard({
						event: 'work_delivered',
						source: 'workOrder',
						sourceId: workOrder?.id ?? '',
						customer,
						vehicle,
						record: reservation,
						reservationId: reservation.id,
					}),
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
				icon: <AgendaQuickActionIcon action={action} />,
				tone: agendaActionTone(action),
				requiresConfirm:
					action.kind === 'reservation' &&
					(action.action === 'cancel' || action.action === 'delete'),
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

	const renderQuoteCardContent = createQuoteCardContentRenderer({
		quoteCode,
		quoteHasReservation,
		quoteLaneStatus,
		quoteTentativeTimeLabel,
		onCreateReservationFromQuote: createReservationFromQuote,
		onDownloadQuotePdf: downloadQuotePdf,
		onDownloadQuotePdfAndMarkSent: downloadQuotePdfAndMarkSent,
		onSendQuoteWhatsapp: sendQuoteWhatsapp,
		whatsappButtonVisible: quoteWhatsappButtonVisible,
		whatsappButtonLabel: quoteWhatsappButtonLabel,
		onOpenQuoteReservationInAgenda: openQuoteReservationInAgenda,
	})

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

	function goToDate(isoDate: string) {
		const currentDate = new Date(`${agendaStartDay}T00:00:00`).getTime()
		const targetDate = new Date(`${isoDate}T00:00:00`).getTime()
		const offsetDays = Math.round((targetDate - currentDate) / 86_400_000)
		if (Number.isFinite(offsetDays) && offsetDays !== 0) {
			const slideMotion = agendaSlideMotionFromOffset(offsetDays, AGENDA_VISIBLE_DAYS)
			setAgendaSlideMotion(slideMotion)
			setAgendaOverlapSuppressedStartDay(
				agendaSlideWindowsOverlap(slideMotion, AGENDA_VISIBLE_DAYS)
					? isoDate
					: null,
			)
		}
		setAgendaStartDay(isoDate)
		setSelectedDay(isoDate)
	}

	// Mueve el ancla de la agenda un mes completo (modo mensual). Deja el primer dia
	// del mes destino como inicio, que tambien sirve de ancla si se vuelve a semana.
	function moveAgendaMonth(offset: number) {
		const { from } = monthRange(agendaStartDay, offset)
		setAgendaStartDay(from)
		setSelectedDay(from)
	}

	function handleAgendaToolbarMove(offset: number) {
		if (agendaRangeMode === 'month') {
			moveAgendaMonth(offset)
		} else {
			moveAgenda(offset)
		}
	}

	// Drill-down desde la grilla mensual: vuelve a la vista semanal sobre el dia.
	function selectAgendaDayFromMonth(isoDate: string) {
		setAgendaRangeMode('week')
		goToDate(isoDate)
	}

	function openQuickReservation(day: string, prefillDay = false) {
		setSelectedDay(day)
		setQuickReservationPrefillDay(prefillDay)
		setReservationForm(blankReservationForm(prefillDay ? day : ''))
		setQuickReservationDay(day)
	}

	function showProgressToastSoon() {
		const handle: { id: number | null; timer: number } = {
			id: null,
			timer: window.setTimeout(() => {
				handle.id = showToast({
					tone: 'success',
					title: 'Guardando…',
					description:
						'El servidor está respondiendo. Esto puede tardar unos segundos en el demo.',
					visibleMs: 30000,
				})
			}, 700),
		}
		return handle
	}

	function clearProgressToast(handle: { id: number | null; timer: number }) {
		window.clearTimeout(handle.timer)
		if (handle.id !== null) {
			dismissToast(handle.id)
			handle.id = null
		}
	}

	async function runAction<T>(
		action: () => Promise<T>,
		options?: RunActionOptions<T>,
	) {
		const pendingKey =
			options?.key ?? `runAction:${++runActionCounterRef.current}`
		pendingActions.begin(pendingKey)
		setError(null)
		const progress = showProgressToastSoon()
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
		} finally {
			clearProgressToast(progress)
			pendingActions.end(pendingKey)
		}
	}

	const isActionPending = pendingActions.isPending

	async function runOptimistic<T>(args: {
		key: string
		optimistic: () => void
		rollback: () => void
		action: () => Promise<T>
		successTitle?: string
		successDescription?: string
	}): Promise<T | undefined> {
		pendingActions.begin(args.key)
		args.optimistic()
		setError(null)
		const progress = showProgressToastSoon()
		try {
			const result = await args.action()
			await loadData({ force: true })
			if (args.successTitle) {
				const description =
					args.successDescription ?? successToastDescription(args.successTitle)
				clearPendingUndo()
				showToast({
					tone: 'success',
					title: args.successTitle,
					description,
				})
			}
			return result
		} catch (err: any) {
			args.rollback()
			setError(formatApiError(err))
			return undefined
		} finally {
			clearProgressToast(progress)
			pendingActions.end(args.key)
		}
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
		setAgendaDropDay(agendaDropDayForValue(event.over?.id, weekDays))
	}

	async function handleAgendaDragEnd(event: DragEndEvent) {
		const reservationId = String(
			event.active.data.current?.reservationId ?? activeAgendaReservationId ?? '',
		)
		const originDay = String(event.active.data.current?.day ?? '')
		const nextDay = agendaDropDayForValue(event.over?.id, weekDays)
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
		setWorkStatusDropStatus(
			workStatusDropTargetForOver(
				event.over,
				workStatusColumns,
				orderLabels,
			),
		)
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
			? workOrderForReservation(activeReservation, workOrderByReservation)
			: null
		const workOrderId = String(
			event.active.data.current?.workOrderId ?? workOrder?.id ?? '',
		)
		const canMoveStatus = activeReservation
			? reservationCanMoveWorkStatus(activeReservation, workOrderByReservation)
			: false
		const originColumn = workStatusColumnKeyForValue(
			event.active.data.current?.statusGroup ??
				event.active.data.current?.status ??
				workOrder?.status,
			workStatusColumns,
			orderLabels,
		)
		const targetColumn = workStatusDropTargetForOver(
			event.over,
			workStatusColumns,
			orderLabels,
		)
		const nextStatus = workStatusDropStatusForColumn(
			targetColumn,
			workStatusColumns,
			orderLabels,
		)
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
					? updateReservationWorkOrder(item, optimisticWorkOrder, orderLabels)
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
							orderLabels,
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
			const whatsappEvent = whatsappEventForWorkOrderStatus(nextStatus)
			if (whatsappEvent) {
				void runProactiveWhatsappEvent({
					event: whatsappEvent,
					source: 'workOrder',
					sourceId: workOrderId,
					customer: customerForRecord(activeReservation),
					vehicle: vehicleForRecord(activeReservation),
					record: activeReservation,
					reservationId,
				})
			}
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
		setQuoteDropStatus(parseQuoteDropStatus(event.over?.id))
	}

	async function handleQuoteDragEnd(event: DragEndEvent) {
		const quoteId = String(
			event.active.data.current?.quoteId ?? activeQuoteDragId ?? '',
		)
		const originStatus = parseQuoteDropStatus(
			event.active.data.current?.status,
		)
		const nextStatus = parseQuoteDropStatus(event.over?.id)
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
		const groupLine = item.is_group ? firstGroupReservationLine(item) : null
		const reservation = reservations.find(
			(record) => String(record.id) === reservationId,
		)
		const targetDay = String(
			reservation?.day ?? groupLine?.reservation_day ?? item.reservation_day ?? '',
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
		setSessionExpired(false)
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

	async function handleFullscreenToggle() {
		if (!fullscreenSupported) return
		try {
			const nextState = await toggleDocumentFullscreen(document)
			setFullscreenActive(nextState)
		} catch {
			showToast({
				title: 'No se pudo cambiar la pantalla completa',
				tone: 'error',
			})
		}
	}

	function handleSectionChange(key: string) {
		setActive(key as Section)
		setSidebarMobileOpen(false)
	}

	function submitGlobalSearch(query: string) {
		setSearchPageQuery(query.trim())
		handleSectionChange('search')
	}

	async function openSearchResult(groupType: string, item: GlobalSearchItem) {
		const target = searchResultTargets[groupType]
		if (!target) return
		if (!canViewEconomy && sectionRequiresEmployer(target.section)) return
		handleSectionChange(target.section)
		if (groupType === 'task') {
			// TasksPanel edita en linea: alcanza con cambiar de seccion.
			return
		}
		try {
			const data = await apiFetch<AnyRecord>(target.apiPath(item.id))
			if (groupType === 'fixed_expense') {
				openFixedExpenseForEdit(data)
				return
			}
			if (groupType === 'service') {
				// El modal de servicio edita tambien su receta de materiales: se
				// trae fresca porque el dataset puede no estar cargado todavia.
				const materials = await apiList<AnyRecord>('/service-materials/')
				setServiceMaterials(materials)
				openDetailModal(target.detailTitle, data, {
					serviceMaterialsSource: materials,
				})
				return
			}
			openDetailModal(target.detailTitle, data)
		} catch (err: any) {
			setError(
				formatApiError(err, {
					fallbackTitle: 'No se pudo abrir el resultado',
					fallbackDescription:
						'El registro ya no existe o no se pudo cargar. Actualiza e intenta nuevamente.',
				}),
			)
		}
	}

	const pendingPublicRequests = publicRequests.filter(
		(item) => item.status === 'pending',
	)
	const managedPublicRequests = publicRequests.filter(
		(item) => item.status !== 'pending',
	)
	const pendingPublicRequestsCount = pendingPublicRequests.length
	const pendingTasksCount = tasks.filter((t) => (t as any).status === 'pending').length
	const overdueTasksCount = tasks.filter((t) => (t as any).status === 'pending' && (t as any).is_overdue === true).length
	const activeEmployeeCount = employees.filter(
		(item) => item.is_active !== false,
	).length
	const inactiveEmployeeCount = employees.length - activeEmployeeCount
	const title = sectionMeta[displayedActive]
	const navItems = buildSidebarNavigation({
		canViewEconomy,
		pendingPublicRequestsCount,
		pendingTasksCount,
		overdueTasksCount,
	})
	const customerVehicles = vehiclesMatchingCustomer(
		vehicles,
		reservationForm.customer,
	)
	const quoteVehicleOptions = vehiclesForOptionalCustomer(
		vehicles,
		quoteForm.customer,
	)
	const customerOptions = customerSelectOptions(customers)
	const visibleCustomerFilterOptions =
		customerFilterOptionsForEconomy(canViewEconomy)
	const vehicleOptions = vehicleSelectOptions(vehicles)
	const customerVehicleOptions = vehicleSelectOptions(customerVehicles)
	const serviceOptions = serviceSelectOptions(
		services,
		canViewEconomy,
		serviceTypeLabels,
	)
	const reservationOptions = reservationSelectOptions(
		reservations,
		useReservationTimes,
		reservationLabels,
	)
	const workOrderOptions = workOrderSelectOptions(workOrders, canViewEconomy)
	const { allDebtOptions, debtOptions } = debtSelectOptions(debts)
	const materialOptions = materialSelectOptions(materials)
	const supplierOptions = supplierSelectOptions(suppliers)
	const openMaterialUnitOptions = openMaterialUnitSelectOptions(materialOpenUnits)
	const quoteVehicleSearchOptions = vehicleSelectOptions(quoteVehicleOptions)
	const quoteReservationVehicleOptions = reservationForQuote
		? vehicleSelectOptions(
				vehiclesMatchingCustomer(vehicles, reservationForQuote.customer),
			)
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
	const {
		validExpenseSubcategoryForCategory,
		validCashSubcategoryForCategory,
	} = createCashSubcategoryValidators(
		incomeCategoryTree,
		expenseCategoryTree,
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
	const {
		incomeCategorySelectOptions,
		expenseCategorySelectOptions,
		debtExpenseCategorySelectOptions,
		fixedExpenseCategorySelectOptions,
		settingsClassificationCategoryOptions,
		selectedMovementSubcategoryValues,
		movementSubcategorySelectOptions,
		debtExpenseSubcategoryValues,
		debtExpenseSubcategorySelectOptions,
		fixedExpenseSubcategoryValues,
		fixedExpenseSubcategorySelectOptions,
		settingsClassificationSubcategoryOptions,
	} = cashCategorySelectOptions({
		cashIncomeCategoryValues,
		cashExpenseCategoryValues,
		movementForm,
		debtForm,
		fixedExpenseForm,
		expenseClassificationForm,
		incomeCategoryTree,
		expenseCategoryTree,
		cashMovements,
		debts,
		fixedExpenses,
	})
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
	const cashSourceKindOptions = cashSourceKindSelectOptions(cashSourceKindValues)
	const cashFlowSummary = useMemo(
		() => buildCashFlowSummary(cashEntries, cashSummaryMode),
		[cashEntries, cashSummaryMode],
	)
	const filteredCashEntries = useMemo(
		() =>
			sortCashEntries(
				cashEntries.filter(
					(item: AnyRecord) =>
						cashEntryMatchesFilters(item, cashFilters) &&
						cashEntryMatchesQuickFilter(item, cashQuickFilter),
				),
				cashSortKey,
			),
		[cashEntries, cashFilters, cashQuickFilter, cashSortKey],
	)
	const demoReadiness = useMemo(
		() => {
			if (!businessProfile) return null

			return buildDemoReadiness({
				businessForm,
				businessProfile,
				businessSlug: String(currentUser?.business?.slug ?? ''),
				dashboard,
				payments,
				publicRequests,
				reservations,
				sectors,
				services,
				whatsappAutomationRules,
				whatsappConfig,
				whatsappTemplates,
				workOrders,
				onboardingTasks: tasks,
			})
		},
		[
			businessForm,
			businessProfile,
			currentUser?.business?.slug,
			dashboard,
			payments,
			publicRequests,
			reservations,
			sectors,
			services,
			whatsappAutomationRules,
			whatsappConfig,
			whatsappTemplates,
			workOrders,
			tasks,
		],
	)
	const firstChargeableWorkOrder = useMemo(
		() => findFirstChargeableWorkOrder(workOrders),
		[workOrders],
	)
	const starterServicesPlan = useMemo(
		() =>
			buildStarterServicesPlan({
				businessType: businessProfile?.business_type,
				services,
				sectors,
			}),
		[businessProfile?.business_type, services, sectors],
	)

	if (!token) {
		return <LoginScreen onLogin={handleLogin} sessionExpired={sessionExpired} />
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
	const stockMovementTotal = stockMovementLinesTotal(stockMovementLines)
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
	const fixedExpenseLoadBlocked = Boolean(
		loadErrorNotice && !fixedExpenses.length && !fixedExpenseOccurrences.length,
	)

	// Fallback uniforme de carga/error para secciones que antes aparecian "pop-in":
	// muestra skeleton mientras carga o un ErrorState con reintento si la carga fallo.
	const sectionFallback = createSectionFallbackRenderer({
		isDataSetLoading,
		errorNotice: loadErrorNotice,
		onReload: () => loadData({ force: true }),
	})

	const {
		materialOpenUnitRows,
		materialUsageRows,
		materialUsageSummary,
		workOrderMaterialUsageSummary,
	} = inventoryUsageSelectors({
		consumptions,
		materialOpenUnits,
		materials,
		stockMovements,
	})

	const renderAgendaWorkDebt = createAgendaWorkDebtRenderer({
		canViewEconomy,
		materialUsageForWorkOrder: workOrderMaterialUsageSummary,
	})
	const renderAgendaReservationCard = createAgendaReservationCardRenderer({
		vehicles,
		useReservationTimes,
		workOrderByReservation,
		canViewEconomy,
		reservationStatusConfig,
		agendaMovePendingId,
		isActionPending,
		getQuickActions: agendaReservationQuickActions,
		detailRecordProps,
		quickActionTargetProps,
		renderQuickActionsTrigger,
		renderWorkDebt: renderAgendaWorkDebt,
		orderLabels,
		reservationLabels,
		onAction: runAgendaReservationAction,
	})
	const renderAgendaDragOverlay = createAgendaDragOverlayRenderer({
		vehicles,
		useReservationTimes,
		workOrderByReservation,
		agendaCardClass: agendaCardClassForRow,
		orderLabels,
		reservationLabels,
		renderWorkDebt: renderAgendaWorkDebt,
	})

	function renderCustomerDashboard() {
		return renderCustomerDashboardForState({
			dashboard: customerDashboard,
			canViewEconomy,
			history: customerDashboardHistory,
			loading: customerDashboardLoading,
			vehicles,
			reservations,
			quotes,
			workOrders,
			useReservationTimes,
			orderLabels,
			reservationLabels,
			quoteStatusLabels,
			paymentMethodLabels: debtPaymentMethodLabels,
			onBack: () => setCustomerDashboard(null),
			onOpenDetail: openDetailModal,
		})
	}

	const inventorySummary = inventorySummaryForMaterials(
		materials,
		materialUsageSummary,
	)
	const toolSummary = toolSummaryForTools(tools)

	function updateQuoteItem(index: number, patch: AnyRecord) {
		setQuoteForm((current: AnyRecord) =>
			quoteFormWithPatchedItem(current, index, patch),
		)
	}

	function selectQuoteService(
		index: number,
		serviceId: string,
		availableServices: AnyRecord[] = services,
	) {
		const service = availableServices.find(
			(item) => String(item.id) === serviceId,
		)
		updateQuoteItem(index, {
			service: serviceId,
			unit_price: servicePriceForVehicleType(
				service,
				vehicleTypeForId(vehicles, quoteForm.vehicle),
			),
		})
		if (serviceId) {
			focusField(`quote.item.${index}.quantity`)
		}
	}

	function addQuoteItem() {
		setQuoteForm((current: AnyRecord) =>
			quoteFormWithAddedItem(current, blankQuoteItem),
		)
	}

	function removeQuoteItem(index: number) {
		setQuoteForm((current: AnyRecord) =>
			quoteFormWithRemovedItem(current, index, blankQuoteItem),
		)
	}

	function updateReservationItem(index: number, patch: AnyRecord) {
		setReservationForm((current: AnyRecord) =>
			reservationFormWithPatchedItem(current, index, patch),
		)
	}

	function selectReservationService(
		index: number,
		serviceId: string,
		availableServices: AnyRecord[] = services,
	) {
		const service = availableServices.find(
			(item) => String(item.id) === serviceId,
		)
		updateReservationItem(index, {
			service: serviceId,
			unit_price: servicePriceForVehicleType(
				service,
				vehicleTypeForId(vehicles, reservationForm.vehicle),
			),
		})
		if (serviceId) {
			focusField(`reservation.item.${index}.quantity`)
		}
	}

	function addReservationItem() {
		setReservationForm((current: AnyRecord) =>
			reservationFormWithAddedItem(current, blankQuoteItem),
		)
	}

	function removeReservationItem(index: number) {
		setReservationForm((current: AnyRecord) =>
			reservationFormWithRemovedItem(current, index, blankQuoteItem),
		)
	}

	function updateReservationCustomer(value: string) {
		const selection = formForCustomerSelection(
			reservationForm,
			value,
			vehicles,
			services,
		)
		setReservationForm(selection.form)
		if (reservationForm.is_group) {
			focusField('reservation.vehicle_lines.0.vehicle', true)
			return
		}
		focusField(
			selection.vehicle ? 'reservation.service.0' : 'reservation.vehicle',
			!selection.vehicle,
		)
	}

	function updateReservationVehicle(
		value: string,
		availableVehicles = vehicles,
	) {
		setReservationForm(
			formForVehicleSelection(
				reservationForm,
				value,
				availableVehicles,
				services,
			),
		)
		focusField('reservation.service.0', true)
	}

	function updateQuoteCustomer(value: string) {
		const selection = formForCustomerSelection(
			quoteForm,
			value,
			vehicles,
			services,
		)
		setQuoteForm(selection.form)
		if (quoteForm.is_group) {
			focusField('quote.vehicle_lines.0.vehicle', true)
			return
		}
		focusField(
			selection.vehicle ? 'quote.service.0' : 'quote.vehicle',
			!selection.vehicle,
		)
	}

	function updateQuoteVehicle(value: string, availableVehicles = vehicles) {
		setQuoteForm(
			formForVehicleSelection(
				quoteForm,
				value,
				availableVehicles,
				services,
			),
		)
		focusField('quote.service.0', true)
	}

	function updateVehicleCustomer(value: string) {
		setVehicleForm(vehicleFormWithCustomer(vehicleForm, value))
		focusField('vehicle.brand')
	}

	function updateVehicleBrand(value: string) {
		setVehicleForm((current: AnyRecord) =>
			vehicleFormWithBrand(current, value, vehicles),
		)
		focusField('vehicle.model')
	}

	function updateDetailVehicleBrand(value: string) {
		updateDetailEdit(
			detailVehiclePatchForBrand(detailModal?.editData, value, vehicles),
		)
		focusField('detail.vehicle.model')
	}

	function updateMovementCashCategory(value: string) {
		setMovementForm((current: AnyRecord) =>
			cashMovementFormWithCategory(
				current,
				value,
				incomeCategoryTree,
				expenseCategoryTree,
			),
		)
		focusField('cash-movement.subcategory')
	}

	function updateDebtExpenseCategory(value: string) {
		setDebtForm((current: AnyRecord) =>
			debtFormWithExpenseCategory(current, value, expenseCategoryTree),
		)
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

	function updateFixedExpenseCategory(value: string) {
		setFixedExpenseForm((current: AnyRecord) => ({
			...current,
			expense_category: value,
			expense_subcategory: validExpenseSubcategoryForCategory(
				value,
				current.expense_subcategory,
			),
		}))
		focusField('fixed-expense.expense_subcategory')
	}

	function registerFixedExpenseSubcategory(value: string) {
		updateExpenseCategoryTreeLocal(fixedExpenseForm.expense_category, value)
		setFixedExpenseForm({
			...fixedExpenseForm,
			expense_subcategory: value,
		})
		focusField('fixed-expense.notes')
	}

	function resetExpenseClassificationForm() {
		setExpenseClassificationForm({
			movement_type: 'expense',
			category: '',
			subcategory: '',
			originalCategory: '',
			originalSubcategory: '',
			lockCategory: false,
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
			lockCategory: false,
		})
		setFormModal({ kind: 'expense-classification' })
	}

	function openSubcategoryCreator(movementType: string, category: string) {
		const nextType = movementType === 'income' ? 'income' : 'expense'
		setExpenseClassificationForm({
			movement_type: nextType,
			category,
			subcategory: '',
			originalCategory: '',
			originalSubcategory: '',
			lockCategory: true,
		})
		setFormModal({ kind: 'expense-classification' })
		focusField('expense-classification.subcategory')
	}

	function resetCashCategoryForm() {
		setCashCategoryForm({
			movement_type: 'expense',
			name: '',
			originalName: '',
		})
	}

	function openCashCategoryCreator(movementType: string) {
		const nextType = movementType === 'income' ? 'income' : 'expense'
		setCashCategoryForm({
			movement_type: nextType,
			name: '',
			originalName: '',
		})
		setFormModal({ kind: 'cash-category' })
		focusField('cash-category.name')
	}

	function openCashCategoryEditor(movementType: string, category: string) {
		const nextType = movementType === 'income' ? 'income' : 'expense'
		setCashCategoryForm({
			movement_type: nextType,
			name: category,
			originalName: category,
		})
		setFormModal({ kind: 'cash-category' })
		focusField('cash-category.name')
	}

	async function saveCashCategory(event: FormEvent) {
		event.preventDefault()
		if (!canViewEconomy) return
		const name = String(cashCategoryForm.name ?? '').trim()
		if (!name) return
		const original = String(cashCategoryForm.originalName ?? '').trim()
		const isIncome = cashCategoryForm.movement_type === 'income'
		const field = isIncome ? 'income_category_tree' : 'expense_category_tree'
		const currentTree = businessFormRef.current[field]
		let nextTree
		if (original && original !== name) {
			nextTree = isIncome
				? renameIncomeCategory(currentTree, original, name)
				: renameExpenseCategory(currentTree, original, name)
		} else {
			nextTree = isIncome
				? addIncomeCategory(currentTree, name)
				: addExpenseCategory(currentTree, name)
		}
		const saved = await persistBusinessProfile(
			{ ...businessFormRef.current, [field]: nextTree },
			{
				successTitle: original
					? 'Categoria actualizada'
					: 'Categoria creada',
			},
		)
		if (saved) {
			resetCashCategoryForm()
			formModalExit.close()
		}
	}

	async function deleteCashCategory(movementType: string, category: string) {
		if (!canViewEconomy) return
		const isIncome = movementType === 'income'
		const field = isIncome ? 'income_category_tree' : 'expense_category_tree'
		const nextTree = isIncome
			? removeIncomeCategory(businessFormRef.current[field], category)
			: removeExpenseCategory(businessFormRef.current[field], category)
		await persistBusinessProfile(
			{ ...businessFormRef.current, [field]: nextTree },
			{ successTitle: 'Categoria eliminada' },
		)
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
		const vehicle = singleVehicleIdForCustomer(vehicles, value)
		updateDetailEdit({ customer: value, vehicle })
		focusField(
			vehicle ? `detail.${kind}.service` : `detail.${kind}.vehicle`,
			!vehicle,
		)
	}

	function openAdjustmentForClosedDay(day: string) {
		setMovementForm(
			blankCashMovementForm(today, {
				category: 'Ajustes',
				subcategory: 'Ajuste de cierre',
				amount: '',
				adjusts_closed_day: day,
				description: `Ajuste compensatorio por cierre ${formatDateLabel(day)}.`,
			}),
		)
		setFormModal({ kind: 'cash-movement' })
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

	function openCashEntryDetail(item: AnyRecord) {
		if (item.source_kind === 'debt_payment') {
			openDetailModal(
				'Pago de deuda',
				debtPaymentDetailData(item, debtPayments),
			)
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
		setSelectedDay((current) => addCashPeriod(current || today, cashViewMode, offset))
	}

	function openAgendaForCashPeriod() {
		setWorkViewMode('agenda')
		if (cashViewMode === 'month') {
			const monthStart = cashMonthStart(selectedDay)
			setAgendaRangeMode('month')
			setAgendaStartDay(monthStart)
			setSelectedDay(monthStart)
			setAgendaOverlapSuppressedStartDay(null)
		} else {
			setAgendaRangeMode('week')
			goToDate(cashViewMode === 'week' ? cashWeekStart(selectedDay) : selectedDay)
		}
		setActive('agenda')
	}

	function openCashForAgendaPeriod() {
		if (agendaRangeMode === 'month') {
			const monthStart = cashMonthStart(agendaStartDay)
			setCashViewMode('month')
			setSelectedDay(monthStart)
		} else {
			setCashViewMode('week')
			setSelectedDay(cashWeekStart(agendaStartDay))
		}
		setActive('cash')
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

	function reopenCashDay() {
		return runAction(
			() =>
				apiFetch('/cash/reopen/', {
					method: 'POST',
					body: JSON.stringify({ date: selectedDay }),
				}),
			{
				successTitle: 'Caja reabierta',
				successDescription: () =>
					`La caja de ${formatDateLabel(selectedDay)} fue reabierta.`,
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
				vehicle_type: 'auto',
				notes: '',
			})
		}
		if (kind === 'quote') {
		setQuoteForm(blankQuoteFormWithBusinessDefaults(businessFormRef.current))
		}
		if (kind === 'service') {
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				sector: null,
				service_type: 'wash',
				base_price: '',
				price_moto: '',
				price_auto: '',
				price_camioneta: '',
				price_combi: '',
				price_camion: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
			setServiceMaterialLines([])
		}
		if (kind === 'payment') {
			setPaymentForm(blankPaymentForm())
		}
		if (kind === 'cash-movement') {
			setMovementForm(blankCashMovementForm(selectedDay))
		}
		if (kind === 'cash-load') {
			setMovementForm(blankCashMovementForm(selectedDay))
			setPaymentForm(blankPaymentForm())
			setDebtPaymentForm(blankDebtPaymentForm(today))
			setCashLoadTab('cash-movement')
		}
		if (kind === 'expense-classification') {
			resetExpenseClassificationForm()
		}
		if (kind === 'stock-movement') {
			setStockMovementDocumentFile(null)
		}
		if (kind === 'fixed-expense') {
			setFixedExpenseForm(blankFixedExpenseForm(selectedDay))
		}
		setFormModal({ kind })
	}

	function applyQuickSelection(
		target: string,
		value: string,
		created?: { vehicle?: AnyRecord; service?: AnyRecord },
	) {
		const createdVehicle = created?.vehicle
		const availableVehicles =
			createdVehicle &&
			!vehicles.some(
				(vehicle) => String(vehicle.id) === String(createdVehicle.id),
			)
				? [...vehicles, createdVehicle]
				: vehicles
		const createdService = created?.service
		const availableServices =
			createdService &&
			!services.some(
				(service) => String(service.id) === String(createdService.id),
			)
				? [...services, createdService]
				: services
		const reservationGroupTarget = groupQuickTargetForOwner(
			target,
			'reservation',
		)
		if (reservationGroupTarget) {
			setReservationForm((current: AnyRecord) =>
				reservationGroupTarget.field === 'vehicle'
					? formForGroupVehicleLineSelection(
							current,
							reservationGroupTarget.lineIndex,
							value,
							availableVehicles,
							availableServices,
						)
					: formForGroupServiceLineSelection(
							current,
							reservationGroupTarget.lineIndex,
							reservationGroupTarget.itemIndex,
							value,
							availableVehicles,
							availableServices,
						),
			)
			if (reservationGroupTarget.field === 'vehicle') {
				focusField(
					`reservation.vehicle_lines.${reservationGroupTarget.lineIndex}.service.0`,
					true,
				)
			}
			return
		}
		if (target === 'reservation.customer') {
			updateReservationCustomer(value)
		}
		if (target === 'reservation.vehicle') {
			updateReservationVehicle(value, availableVehicles)
		}
		if (target === 'reservation.service') {
			selectReservationService(0, value, availableServices)
			focusField('reservation.day')
		}
		if (target.startsWith('reservation.service.')) {
			selectReservationService(
				Number(target.replace('reservation.service.', '')),
				value,
				availableServices,
			)
		}
		if (target === 'quote.customer') {
			updateQuoteCustomer(value)
		}
		const quoteGroupTarget = groupQuickTargetForOwner(
			target,
			'quote',
		)
		if (quoteGroupTarget) {
			setQuoteForm((current: AnyRecord) =>
				quoteGroupTarget.field === 'vehicle'
					? formForGroupVehicleLineSelection(
							current,
							quoteGroupTarget.lineIndex,
							value,
							availableVehicles,
							availableServices,
						)
					: formForGroupServiceLineSelection(
							current,
							quoteGroupTarget.lineIndex,
							quoteGroupTarget.itemIndex,
							value,
							availableVehicles,
							availableServices,
						),
			)
			if (quoteGroupTarget.field === 'vehicle') {
				focusField(
					`quote.vehicle_lines.${quoteGroupTarget.lineIndex}.service.0`,
					true,
				)
			}
			return
		}
		if (target === 'quote.vehicle') {
			updateQuoteVehicle(value, availableVehicles)
		}
		if (target.startsWith('quote.service.')) {
			selectQuoteService(
				Number(target.replace('quote.service.', '')),
				value,
				availableServices,
			)
		}
		const detailQuoteGroupTarget = groupQuickTargetForOwner(
			target,
			'detail.quote',
		)
		if (detailQuoteGroupTarget) {
			setDetailModal((current) => {
				if (!current || current.kind !== 'quote') return current
				return {
					...current,
					editData:
						detailQuoteGroupTarget.field === 'vehicle'
							? formForGroupVehicleLineSelection(
									current.editData,
									detailQuoteGroupTarget.lineIndex,
									value,
									availableVehicles,
									availableServices,
								)
							: formForGroupServiceLineSelection(
									current.editData,
									detailQuoteGroupTarget.lineIndex,
									detailQuoteGroupTarget.itemIndex,
									value,
									availableVehicles,
									availableServices,
								),
				}
			})
			if (detailQuoteGroupTarget.field === 'vehicle') {
				focusField(
					`detail.quote.vehicle_lines.${detailQuoteGroupTarget.lineIndex}.service.0`,
					true,
				)
			}
			return
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
			target.startsWith('detail.quote')
				? detailModal?.editData?.customer ?? ''
				: target.startsWith('reservation')
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
				vehicle_type: 'auto',
				notes: '',
			})
		}
		if (kind === 'service') {
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				sector: null,
				service_type: 'wash',
				base_price: '',
				price_moto: '',
				price_auto: '',
				price_camioneta: '',
				price_combi: '',
				price_camion: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
			setServiceMaterialLines([])
		}
		if (kind === 'material') {
			setMaterialForm({
				id: '',
				sector: null,
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
			setVehicles((current) =>
				current.some((vehicle) => String(vehicle.id) === String(created.id))
					? current
					: [...current, created],
			)
			applyQuickSelection(quickCreate.target, String(created.id), {
				vehicle: created,
			})
			setVehicleForm({
				id: '',
				customer: '',
				license_plate: '',
				brand: '',
				model: '',
				color: '',
				vehicle_type: 'auto',
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

	async function createStarterServices() {
		if (!canViewEconomy) return
		const plan = buildStarterServicesPlan({
			businessType: businessProfile?.business_type,
			services,
			sectors,
		})
		if (!plan.drafts.length) {
			handleSectionChange('services')
			return
		}
		await runAction(
			async () => {
				const created: AnyRecord[] = []
				for (const draft of plan.drafts) {
					const service = await apiFetch<AnyRecord>('/services/', {
						method: 'POST',
						body: JSON.stringify(serviceCreatePayload(draft)),
					})
					created.push(service)
				}
				setServices((current) => {
					const byId = new Map<string, AnyRecord>()
					for (const item of current) byId.set(String(item.id), item)
					for (const item of created) byId.set(String(item.id), item)
					return Array.from(byId.values())
				})
				handleSectionChange('services')
				return {
					created,
					existingCount: plan.existingTemplates.length,
				}
			},
			{
				key: 'onboarding:starter-services',
				flashTarget: (result) =>
					recordFlashKey('service', result.created[0]?.id ?? null),
				successTitle: (result) =>
					result.created.length === 1
						? 'Servicio base creado'
						: 'Servicios base creados',
				successDescription: (result) =>
					`${result.created.length} servicios quedaron listos para editar precios, duracion y detalle.`,
			},
		)
	}

	async function saveQuickService(event: FormEvent) {
		event.preventDefault()
		if (!quickCreate || !canViewEconomy) return
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>('/services/', {
				method: 'POST',
				body: JSON.stringify(serviceCreatePayload(serviceForm)),
			})
			setServices((current) =>
				current.some((service) => String(service.id) === String(created.id))
					? current
					: [...current, created],
			)
			applyQuickSelection(quickCreate.target, String(created.id), {
				service: created,
			})
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				sector: null,
				service_type: 'wash',
				base_price: '',
				price_moto: '',
				price_auto: '',
				price_camioneta: '',
				price_combi: '',
				price_camion: '',
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
				sector: null,
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
			key: 'save:supplier:quick',
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
					body: businessProfilePayload(
						nextBusinessForm,
						options,
						businessLogoFile,
					),
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

	async function dismissOnboardingStep(stepId: DemoReadinessStepId) {
		if (!canViewEconomy) return
		const dismissedStepIds = Array.isArray(
			businessFormRef.current.onboarding_dismissed_step_ids,
		)
			? businessFormRef.current.onboarding_dismissed_step_ids.map((value) =>
					String(value),
				)
			: []
		if (dismissedStepIds.includes(stepId)) return

		return runAction(
			async () => {
				const saved = await apiFetch<AnyRecord>('/settings/business-profile/', {
					method: 'PATCH',
					body: JSON.stringify({
						onboarding_dismissed_step_ids: [...dismissedStepIds, stepId],
					}),
				})
				syncBusinessProfile(saved)
				return saved
			},
			{
				key: 'onboarding:dismiss-step',
				successTitle: 'Paso quitado de la alta guiada',
			},
		)
	}

	async function saveWhatsappConfig(patch: AnyRecord) {
		return runAction(
			async () => {
				const saved = await apiFetch<AnyRecord>('/whatsapp/config/', {
					method: 'PATCH',
					body: JSON.stringify(patch),
				})
				setWhatsappConfig(saved)
				return saved
			},
			{ successTitle: 'WhatsApp guardado' },
		)
	}

	async function createWhatsappTemplate(data: AnyRecord) {
		return runAction(
			async () => {
				const created = await apiFetch<AnyRecord>('/whatsapp/templates/', {
					method: 'POST',
					body: JSON.stringify(data),
				})
				setWhatsappTemplates((current) => [...current, created])
				return created
			},
			{ successTitle: 'Template creado' },
		)
	}

	async function updateWhatsappTemplate(id: number | string, patch: AnyRecord) {
		return runAction(
			async () => {
				const saved = await apiFetch<AnyRecord>(`/whatsapp/templates/${id}/`, {
					method: 'PATCH',
					body: JSON.stringify(patch),
				})
				setWhatsappTemplates((current) =>
					current.map((item) => (String(item.id) === String(id) ? saved : item)),
				)
				return saved
			},
			{ successTitle: 'Template actualizado' },
		)
	}

	async function updateWhatsappAutomationRule(id: number | string, patch: AnyRecord) {
		return runAction(
			async () => {
				const saved = await apiFetch<AnyRecord>(
					`/whatsapp/automation-rules/${id}/`,
					{
						method: 'PATCH',
						body: JSON.stringify(patch),
					},
				)
				setWhatsappAutomationRules((current) =>
					current.map((item) => (String(item.id) === String(id) ? saved : item)),
				)
				return saved
			},
			{ successTitle: 'Automatizacion actualizada' },
		)
	}

	async function prepareWhatsappDemo() {
		return runAction(
			async () => {
				const initialPlan = buildWhatsAppDemoBootstrapPlan({
					config: whatsappConfig,
					templates: whatsappTemplates,
					automationRules: whatsappAutomationRules,
				})
				const savedConfig = await apiFetch<AnyRecord>('/whatsapp/config/', {
					method: 'PATCH',
					body: JSON.stringify(initialPlan.configPatch),
				})
				setWhatsappConfig(savedConfig)

				const latestRules = await apiList<AnyRecord>('/whatsapp/automation-rules/')
				setWhatsappAutomationRules(latestRules)

				const templatePlan = buildWhatsAppDemoBootstrapPlan({
					config: savedConfig,
					templates: whatsappTemplates,
					automationRules: latestRules,
				})
				const createdTemplates: AnyRecord[] = []
				for (const template of templatePlan.templatesToCreate) {
					const created = await apiFetch<AnyRecord>('/whatsapp/templates/', {
						method: 'POST',
						body: JSON.stringify(template),
					})
					createdTemplates.push(created)
				}
				const nextTemplates = [...whatsappTemplates]
				for (const template of createdTemplates) {
					if (!nextTemplates.some((item) => String(item.id) === String(template.id))) {
						nextTemplates.push(template)
					}
				}
				setWhatsappTemplates(nextTemplates)

				let nextRules = latestRules
				const ruleUpdates = buildWhatsAppAutomationRuleUpdates({
					automationRules: latestRules,
					templates: nextTemplates,
				})
				for (const update of ruleUpdates) {
					const savedRule = await apiFetch<AnyRecord>(
						`/whatsapp/automation-rules/${update.id}/`,
						{
							method: 'PATCH',
							body: JSON.stringify(update.patch),
						},
					)
					nextRules = nextRules.map((rule) =>
						String(rule.id) === String(update.id) ? savedRule : rule,
					)
				}
				setWhatsappAutomationRules(nextRules)

				return {
					config: savedConfig,
					templates: nextTemplates,
					automationRules: nextRules,
				}
			},
			{ successTitle: 'WhatsApp demo preparado' },
		)
	}

	async function sendWhatsappEvent({
		event,
		source,
		sourceId,
		customer,
		vehicle,
		record,
		reservationId,
	}: WhatsappEventSendOptions) {
		if (isFreeWhatsappMode(whatsappConfig)) {
			return openFreeWhatsapp({
				event,
				customer,
				vehicle,
				record,
				reservationId:
					source === 'reservation' ? sourceId : reservationId ?? null,
				workOrderId: source === 'workOrder' ? sourceId : null,
				quoteId: source === 'quote' ? sourceId : null,
			})
		}

		const endpoint =
			source === 'reservation'
				? `/reservations/${sourceId}/send-whatsapp/`
				: source === 'workOrder'
					? `/work-orders/${sourceId}/send-whatsapp/`
					: `/quotes/${sourceId}/send-whatsapp/`
		return runAction(
			async () => {
				const result = await apiFetch<AnyRecord>(endpoint, {
					method: 'POST',
					...(source === 'workOrder'
						? { body: JSON.stringify({ event }) }
						: {}),
				})
				if (source === 'quote' && result?.quote) {
					setQuotes((current) =>
						current.map((item) =>
							String(item.id) === String(sourceId) ? result.quote : item,
						),
					)
				}
				if (result?.message) {
					setWhatsappMessages((current) => [result.message, ...current])
				}
				return result
			},
			{
				flashTarget:
					source === 'quote' ? recordFlashKey('quote', sourceId) : undefined,
				successTitle: 'Mensaje enviado por WhatsApp',
			},
		)
	}

	async function sendWhatsappEventWithResendGuard(
		options: WhatsappEventSendOptions,
	) {
		let alreadySent = whatsappAlreadySent(
			whatsappMessages,
			options.event,
			options.source,
			options.sourceId,
		)
		// En modo pago el envio automatico sale server-side (hook backend) y puede
		// no estar en el estado local: consultar al server antes de reenviar sin
		// aviso. Si la consulta falla, no reenviamos en silencio.
		if (!alreadySent && !isFreeWhatsappMode(whatsappConfig)) {
			const sourceField =
				options.source === 'workOrder' ? 'work_order' : options.source
			let serverMessages: AnyRecord[] | null = null
			try {
				serverMessages = await apiList<AnyRecord>(
					`/whatsapp/messages/?event=${encodeURIComponent(options.event)}&${sourceField}=${encodeURIComponent(String(options.sourceId))}`,
				)
			} catch {
				serverMessages = null
			}
			if (serverMessages === null) {
				showToast({
					tone: 'error',
					title: 'No se pudo verificar envios previos',
					description: 'Reintenta en unos segundos.',
				})
				return undefined
			}
			const sentServer = serverMessages.filter((message) =>
				['sent', 'delivered', 'read'].includes(
					String(message.status ?? '').toLowerCase(),
				),
			)
			if (sentServer.length) {
				setWhatsappMessages((current) => {
					const ids = new Set(current.map((message) => String(message.id)))
					const fresh = sentServer.filter(
						(message) => !ids.has(String(message.id)),
					)
					return fresh.length ? [...fresh, ...current] : current
				})
				alreadySent = true
			}
		}
		if (alreadySent) {
			const confirmed = await requestConfirm({
				title: 'Reenviar por WhatsApp',
				message: 'Ya existe un mensaje enviado para este evento. ¿Reenviar?',
				confirmLabel: 'Reenviar',
				cancelLabel: 'Cancelar',
			})
			if (!confirmed) return undefined
		}
		return sendWhatsappEvent(options)
	}

	function showProactiveWhatsappToast(options: WhatsappEventSendOptions) {
		let toastId = 0
		toastId = showToast({
			tone: 'success',
			title: `Pasó: ${whatsappEventLabels[options.event] ?? options.event}`,
			description: 'Elegí si querés enviar el mensaje por WhatsApp.',
			persistent: true,
			actions: [
				{
					label: 'Enviar',
					onClick: () => {
						dismissToast(toastId)
						void sendWhatsappEventWithResendGuard(options)
					},
				},
				{
					label: 'Descartar',
					onClick: () => dismissToast(toastId),
				},
			],
		})
	}

	async function runProactiveWhatsappEvent(options: WhatsappEventSendOptions) {
		const dispatch = dispatchForEvent(whatsappAutomationRules, options.event)
		if (dispatch === 'manual') return
		if (dispatch === 'notify') {
			showProactiveWhatsappToast(options)
			return
		}
		if (!isFreeWhatsappMode(whatsappConfig)) return

		const opened = await sendWhatsappEvent(options)
		if (!opened) showProactiveWhatsappToast(options)
	}

	function quoteWhatsappButtonVisible(quote: AnyRecord) {
		const customer = customerForRecord(quote)
		return whatsappEventButtonVisible({
			config: whatsappConfig,
			templates: whatsappTemplates,
			event: 'quote_sent',
			phone: customer?.phone || quote.customer_snapshot_phone || quote.customer_phone,
		})
	}

	function quoteWhatsappButtonLabel(quote: AnyRecord) {
		return whatsappAlreadySent(
			whatsappMessages,
			'quote_sent',
			'quote',
			quote.id,
		)
			? 'Reenviar por WhatsApp'
			: 'WhatsApp'
	}

	async function sendQuoteWhatsapp(quote: AnyRecord) {
		return sendWhatsappEventWithResendGuard({
			event: 'quote_sent',
			source: 'quote',
			sourceId: quote.id,
			customer: customerForRecord(quote),
			vehicle: vehicleForRecord(quote),
			record: quote,
		})
	}

	// Modo gratis: abre WhatsApp (wa.me) con el mensaje renderizado y registra el
	// envio en el Historial (fire-and-forget). No usa la API de Meta.
	function openFreeWhatsapp(options: {
		event: string
		customer: AnyRecord | null | undefined
		vehicle?: AnyRecord | null
		record?: AnyRecord | null
		reservationId?: number | string | null
		workOrderId?: number | string | null
		quoteId?: number | string | null
	}) {
		const { event } = options
		const customer = options.customer ?? null
		const record = options.record ?? null
		const phone = String(
			customer?.phone || record?.customer_snapshot_phone || record?.customer_phone || '',
		).trim()
		const body = renderFreeTemplate(
			freeTemplateBody(whatsappTemplates, event),
			buildFreeVariables(event, {
				cliente: customer?.name ?? record?.customer_name,
				vehiculo: options.vehicle
					? vehicleDisplayTitle(options.vehicle)
					: record?.vehicle_label,
				servicios: record?.service_name ?? record?.services,
				fecha_turno: record?.day ? formatDateLabel(record.day) : '',
				hora_turno: record?.start_time ? formatTimeLabel(record.start_time) : '',
				codigo: record?.public_code ?? '',
				total: record?.total != null ? money(record.total) : '',
				validez: record?.valid_until ? formatDateLabel(record.valid_until) : '',
				negocio: currentUser?.business?.name ?? businessProfile?.name ?? '',
			}),
		)
		const href = buildFreeWhatsappHref(phone, body)
		if (!href) {
			showToast({
				tone: 'error',
				title: 'No se pudo abrir WhatsApp',
				description: !phone
					? 'El cliente no tiene telefono cargado.'
					: 'Falta configurar el mensaje de este modulo en Configuracion > WhatsApp.',
			})
			return false
		}
		const popup =
			typeof window !== 'undefined' ? window.open(href, '_blank') : null
		if (!popup) return false
		try {
			popup.opener = null
		} catch {
			// Algunos navegadores no permiten tocar opener en una ventana remota.
		}
		void apiFetch<AnyRecord>('/whatsapp/free/log/', {
			method: 'POST',
			body: JSON.stringify({
				event,
				rendered_body: body,
				recipient_phone: phone,
				recipient_name:
					customer?.name ?? record?.customer_snapshot_name ?? record?.customer_name ?? '',
				customer: customer?.id ?? null,
				reservation: options.reservationId ?? null,
				work_order: options.workOrderId ?? null,
				quote: options.quoteId ?? null,
			}),
		})
			.then((message) => {
				if (message) setWhatsappMessages((current) => [message, ...current])
			})
			.catch(() => {})
		return true
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

	function deselectEmployee() {
		setSelectedEmployee(null)
		setEmployeeAuditLogs([])
		setEmployeeAuditLogsError(null)
		setEmployeeAuditLogsLoading(false)
	}

	async function selectEmployee(employee: AnyRecord) {
		setSelectedEmployee(employee)
		setEmployeeAuditLogs([])
		setEmployeeAuditLogsError(null)
		setEmployeeAuditLogsLoading(true)
		try {
			const logs = await apiFetch<AnyRecord[]>(
				`/audit-log/?entity_type=User&entity_id=${employee.id}`,
			)
			setEmployeeAuditLogs(Array.isArray(logs) ? logs : [])
		} catch {
			setEmployeeAuditLogsError('No se pudo cargar el historial')
		} finally {
			setEmployeeAuditLogsLoading(false)
		}
	}

	async function changeEmployeePassword(pk: number | string, newPassword: string) {
		await runAction(
			async () => {
				const updated = await apiFetch<AnyRecord>(`/auth/employees/${pk}/`, {
					method: 'PATCH',
					body: JSON.stringify({ password: newPassword }),
				})
				setSelectedEmployee(updated)
				setEmployees((prev) =>
					prev.map((e) => (String(e.id) === String(pk) ? updated : e)),
				)
				return updated
			},
			{ successTitle: 'Contraseña actualizada' },
		)
	}

	async function toggleEmployeeActive(pk: number | string, isActive: boolean) {
		await runAction(
			async () => {
				const updated = await apiFetch<AnyRecord>(`/auth/employees/${pk}/`, {
					method: 'PATCH',
					body: JSON.stringify({ is_active: !isActive }),
				})
				setSelectedEmployee(updated)
				setEmployees((prev) =>
					prev.map((e) => (String(e.id) === String(pk) ? updated : e)),
				)
				return updated
			},
			{
				successTitle: isActive ? 'Empleado desactivado' : 'Empleado activado',
			},
		)
	}

	async function saveProfile(event: FormEvent) {
		event.preventDefault()
		if (!currentUser) return
		setError(null)
		const payload = new FormData()
		payload.append('username', String(profileForm.username ?? '').trim())
		payload.append('email', String(profileForm.email ?? '').trim())
		payload.append(
			'phone_country_code',
			String(profileForm.phone_country_code ?? '+54'),
		)
		payload.append(
			'phone_number',
			String(profileForm.phone_number ?? '').trim(),
		)
		if (profileAvatarFile) {
			payload.append('avatar', profileAvatarFile)
		}
		// subscription_type es de solo lectura: lo controla facturacion/admin del
		// lado servidor (el endpoint /me ya no lo acepta).
		pendingActions.begin('save:profile')
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
		} finally {
			pendingActions.end('save:profile')
		}
	}

	function openDetailModal(
		title: string,
		data: AnyRecord,
		options: {
			serviceMaterialsSource?: AnyRecord[]
			startEditing?: boolean
		} = {},
	) {
		const kind = detailKindFromTitle(title)
		if (!canViewEconomy && detailRequiresEconomy(kind)) return
		if (kind === 'service') {
			const source = options.serviceMaterialsSource ?? serviceMaterials
			const lines = source
				.filter((m) => String(m.service) === String(data.id))
				.map((m) => ({
					id: String(m.id),
					material: String(m.material),
					quantity: String(m.quantity),
					material_name: m.material_name,
					material_unit: m.material_unit,
				}))
			setServiceMaterialLines(lines)
		}
		setDetailModal({
			title,
			kind,
			data,
			editData: { ...data },
			editing:
				shouldStartDetailEditing(kind, options.startEditing) &&
				editableDetailKind(kind),
		})
	}

	function startDetailEditing() {
		setDetailModal((current) =>
			current && editableDetailKind(current.kind)
				? { ...current, editing: true, editData: { ...current.data } }
				: current,
		)
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
		return (
			<QuickActionsTrigger
				title={title}
				actions={actions}
				ariaLabel={ariaLabel}
				onOpen={openQuickActionsFromTrigger}
			/>
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

	function openHistoricalUsage(material?: AnyRecord) {
		setHistoricalUsageForm({
			material: material ? String(material.id) : '',
			service: '',
			reservations: [],
			opened_at: '',
			finished_at: '',
			stock_quantity_to_decrement: '1',
			observations: '',
			update_recipe: false,
		})
		setFormModal({ kind: 'material-historical-usage' })
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
			hidden: !path || !canViewEconomy,
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
			{
				id: `customer:whatsapp:${customer.id}`,
				label: 'WhatsApp',
				icon: <MessageCircle size={15} />,
				hidden:
					!isFreeWhatsappMode(whatsappConfig) ||
					!hasActiveWhatsappTemplate(whatsappTemplates, 'manual') ||
					!String(customer.phone ?? '').trim(),
				onSelect: () =>
					openFreeWhatsapp({
						event: 'manual',
						customer,
						record: customer,
					}),
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
				hidden: !canViewEconomy,
				onSelect: () => openServiceDashboard(service),
			},
			{
				id: `service:edit:${service.id}`,
				label: 'Editar servicio',
				icon: <Pencil size={15} />,
				hidden: !canViewEconomy,
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
			? debtPaymentDetailData(entry, debtPayments)
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
				id: `quote:whatsapp:${quote.id}`,
				label: quoteWhatsappButtonLabel(quote) === 'WhatsApp'
					? 'Enviar WhatsApp'
					: 'Reenviar por WhatsApp',
				icon: <MessageCircle size={15} />,
				hidden: !quoteWhatsappButtonVisible(quote),
				onSelect: () => void sendQuoteWhatsapp(quote),
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

	const detailReservationItems = createDetailReservationItems(services)

	function updateDetailReservationItem(index: number, patch: AnyRecord) {
		setDetailModal((current) => {
			if (!current) return current
			return {
				...current,
				editData: detailReservationDataWithPatchedItem(
					current.editData,
					index,
					patch,
					services,
				),
			}
		})
	}

	function selectDetailReservationService(index: number, serviceId: string) {
		const service = services.find((item) => String(item.id) === serviceId)
		updateDetailReservationItem(index, {
			service: serviceId,
			unit_price: servicePriceForVehicleType(
				service,
				vehicleTypeForId(vehicles, detailModal?.editData?.vehicle),
			),
		})
	}

	function addDetailReservationItem() {
		setDetailModal((current) =>
			current
				? {
						...current,
						editData: detailReservationDataWithAddedItem(
							current.editData,
							services,
							blankQuoteItem,
						),
				  }
				: current,
		)
	}

	function removeDetailReservationItem(index: number) {
		setDetailModal((current) => {
			if (!current) return current
			return {
				...current,
				editData: detailReservationDataWithRemovedItem(
					current.editData,
					index,
					services,
					blankQuoteItem,
				),
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

	async function returnFromOverdueReservationChild() {
		const result = await overdueReservationsFlow.returnFromChild(
			loadOverdueReservations,
		)
		if (result.status === 'complete') {
			showToast({
				tone: 'success',
				title: 'Agenda al dia',
				description: 'No quedan reservas vencidas pendientes de resolver.',
			})
		}
	}

	function closeDetailModal() {
		setDetailModal(null)
		void returnFromOverdueReservationChild()
	}

	function closePaymentModal() {
		setPaymentForOrder(null)
		setAgendaPaymentForm(blankAgendaPaymentForm(''))
		void returnFromOverdueReservationChild()
	}

	async function openOverdueReservationEditor(
		reservation: OverdueReservation,
	) {
		const result = await overdueReservationsFlow.openReservation(reservation, {
			hydrateAgenda: () =>
				loadData({ section: 'agenda', preserveActiveLoad: true }),
			loadReservation: (id) =>
				apiFetch<AnyRecord>(`/reservations/${id}/`, {
					bypassDedupe: true,
				}),
		})
		if (result.ok) {
			openDetailModal('Reserva', result.reservation)
			return
		}
		if (result.error) {
			setError(
				formatApiError(result.error, {
					fallbackTitle: 'No se pudo abrir la reserva',
					fallbackDescription:
						'Reintenta desde el listado de reservas vencidas.',
				}),
			)
		}
	}

	function openOverdueReservationPayment(order: AnyRecord) {
		if (!canViewEconomy) return
		overdueReservationsFlow.openPayment()
		openPaymentForOrder(order)
	}

	function refreshCurrentWorkspace() {
		void loadData({ force: true })
		void refreshOverdueReservationsForSection(
			displayedActive,
			() => overdueReservationsFlow.refresh(loadOverdueReservations),
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
		if (quote.is_group) {
			const groupLines = ensureGroupVehicleLines(quote)
			const readyToSchedule =
				groupLines.length > 0 &&
				groupLines.every((line) => Boolean(line.reservation_day))
			if (!readyToSchedule) {
				openDetailModal('Cotizacion', quote, { startEditing: true })
				setError(
					createValidationNotice(
						'Faltan fechas',
						'Para agendar una cotizacion grupal, cada auto necesita fecha.',
						[
							{
								path: 'vehicle_lines',
								label: 'Autos',
								message: 'Completa la fecha de cada auto del grupo.',
							},
						],
					),
				)
				return
			}
			await runAction(
				() =>
					apiFetch(`/quotes/${quote.id}/reservations/`, {
						method: 'POST',
					}),
				{
					flashTarget: (updated: AnyRecord) => {
						const line = firstGroupReservationLine(updated)
						return line?.reservation
							? recordFlashKey('reservation', line.reservation)
							: recordFlashKey('quote', updated?.id)
					},
					successTitle: 'Reservas creadas',
				},
			)
			return
		}
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
		return isEditableDetailKind(kind)
	}

	const { cleanDetailPayload, normalizedDetailPayload } =
		createDetailPayloadHelpers({ services, vehicles })

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
		const isService = detailModal.kind === 'service'
		if (!isDetailDirty() && !isService) return
		if (detailModal.kind === 'quote' && detailModal.editData?.is_group) {
			const notice = groupValidationNotice(
				'Revisa los autos del grupo',
				'Cada auto necesita identificacion, servicios y una agenda consistente.',
				ensureGroupVehicleLines(detailModal.editData),
			)
			if (notice) {
				setError(notice)
				return
			}
		}
		const path = detailEndpoint(detailModal.kind, detailModal.data.id)
		if (!path) return
		const currentDetail = detailModal
		await runAction(async () => {
			if (isDetailDirty()) {
				await apiFetch(path, {
					method: 'PATCH',
					body: JSON.stringify(
						cleanDetailPayload(detailModal.kind, detailModal.editData),
					),
				})
			}
			if (isService) {
				await syncServiceMaterialLines(String(detailModal.data.id))
				setServiceMaterialLines([])
			}
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

	const renderDetailEditActions = createDetailEditActionsRenderer({
		detail: detailModal,
		onDelete: deleteDetail,
		disabled: !isDetailDirty(),
	})

	function renderDetailEditForm() {
		if (!detailModal) return null
		const data = detailModal.editData
		const vehicleOptionsForDetail = detailVehicleOptions(
			detailModal.kind,
			data,
			vehicleOptions,
			vehicles,
		)

		const coreDetailForm = renderCoreDetailFormRouter({
			detail: detailModal,
			onSubmit: saveDetailEdit,
			onPatch: updateDetailEdit,
			focusNextOnEnter,
			canViewEconomy,
			customerHistoryLoading,
			customerHistory,
			orderLabels,
			onOpenDetail: openDetailModal,
			vehicleOptions,
			vehicles,
			customerOptions,
			vehicleBrandValues,
			onUpdateVehicleBrand: updateDetailVehicleBrand,
			focusField,
			sectorOptions: sectorSelectOptions,
			sectors,
			serviceMaterialLines,
			materials,
			materialOptions,
			onAddMaterialLine: addServiceMaterialLine,
			onRemoveMaterialLine: removeServiceMaterialLine,
			onUpdateMaterialLine: updateServiceMaterialLine,
			materialUsageSummary,
			materialOpenUnitRows,
			renderActions: renderDetailEditActions,
		})
		if (coreDetailForm !== undefined) {
			return coreDetailForm
		}

		const operationalDetailForm = renderOperationalDetailFormRouter({
			detail: detailModal,
			onSubmit: saveDetailEdit,
			onPatch: updateDetailEdit,
			customerOptions,
			vehicleOptions: vehicleOptionsForDetail,
			reservationLabels,
			onUpdateCustomer: updateDetailCustomer,
			onFocusField: focusField,
			focusNextOnEnter,
			useReservationTimes,
			reservationItems: detailReservationItems,
			serviceOptions,
			onAddService: addDetailReservationItem,
			onSelectService: selectDetailReservationService,
			onUpdateService: updateDetailReservationItem,
			onRemoveService: removeDetailReservationItem,
			canViewEconomy,
			orderLabels,
			onOpenDetail: openDetailModal,
			onCreateQuote: createQuoteFromReservation,
			services,
			selectedDay,
			onOpenConsumption: openConsumptionForOrder,
			quoteStatusLabels,
			vehicles,
			quoteVehicleOptions: vehicleOptions,
			openQuickCreate,
			serviceNotesForLine,
			flashClass,
			fieldFlashKey,
			quoteTentativeTimeLabel,
			onDownloadQuotePdf: downloadQuotePdf,
			onDownloadQuotePdfAndMarkSent: downloadQuotePdfAndMarkSent,
			renderActions: renderDetailEditActions,
		})
		if (operationalDetailForm !== undefined) {
			return operationalDetailForm
		}

		const financialDetailForm = renderFinancialDetailFormRouter({
			detail: detailModal,
			onSubmit: saveDetailEdit,
			onPatch: updateDetailEdit,
			cashIncomeCategoryValues,
			cashExpenseCategoryValues,
			expenseCategoryTree,
			cashMovements,
			validExpenseSubcategory: validExpenseSubcategoryForCategory,
			onCreateExpenseSubcategory: updateExpenseCategoryTreeLocal,
			supplierOptions,
			suppliers,
			debts,
			debtStatusLabels,
			debtOptions: allDebtOptions,
			debtPaymentMethodLabels,
			defaultPaymentMethod: DEFAULT_PAYMENT_METHOD,
			renderActions: renderDetailEditActions,
		})
		if (financialDetailForm !== undefined) {
			return financialDetailForm
		}

		const inventoryDetailForm = renderInventoryDetailFormRouter({
			detail: detailModal,
			onSubmit: saveDetailEdit,
			onPatch: updateDetailEdit,
			toolStatusOptions,
			toolStatusLabels,
			materialOptions,
			workOrderOptions,
			renderActions: renderDetailEditActions,
		})
		if (inventoryDetailForm !== undefined) {
			return inventoryDetailForm
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
			key: 'save:customer',
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
				vehicle_type: 'auto',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			key: 'save:vehicle',
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

	function addServiceMaterialLine() {
		setServiceMaterialLines(addServiceMaterialLineForLines(serviceMaterialLines))
	}

	function removeServiceMaterialLine(index: number) {
		setServiceMaterialLines(
			removeServiceMaterialLineForLines(serviceMaterialLines, index),
		)
	}

	function updateServiceMaterialLine(index: number, changes: AnyRecord) {
		setServiceMaterialLines(
			updateServiceMaterialLineForLines(serviceMaterialLines, index, changes),
		)
	}

	async function syncServiceMaterialLines(serviceId: string) {
		const existingIds = new Set(
			serviceMaterials
				.filter((m) => String(m.service) === String(serviceId))
				.map((m) => String(m.id)),
		)
		const currentIds = new Set(
			serviceMaterialLines
				.filter((l) => l.id)
				.map((l) => String(l.id)),
		)
		const toDelete = [...existingIds].filter((id) => !currentIds.has(id))
		await Promise.all(
			toDelete.map((id) => apiFetch(`/service-materials/${id}/`, { method: 'DELETE' })),
		)
		const validLines = serviceMaterialLines.filter(
			(l) => l.material && Number(l.quantity) > 0,
		)
		await Promise.all(
			validLines.map((line) => {
				if (line.id) {
					return apiFetch(`/service-materials/${line.id}/`, {
						method: 'PATCH',
						body: JSON.stringify({ quantity: line.quantity }),
					})
				}
				return apiFetch('/service-materials/', {
					method: 'POST',
					body: JSON.stringify({
						service: serviceId,
						material: line.material,
						quantity: line.quantity,
					}),
				})
			}),
		)
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
				body: JSON.stringify(serviceCreatePayload(serviceForm)),
			})
			await syncServiceMaterialLines(String(saved.id))
			setServiceForm({
				id: '',
				name: '',
				icon: '',
				sector: null,
				service_type: 'wash',
				base_price: '',
				price_moto: '',
				price_auto: '',
				price_camioneta: '',
				price_combi: '',
				price_camion: '',
				estimated_duration_minutes: '60',
				notes: '',
			})
			setServiceMaterialLines([])
			formModalExit.close()
			return saved
		}, {
			key: 'save:service',
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
		if (reservationForm.is_group) {
			const groupLines = ensureGroupVehicleLines(reservationForm)
			const notice = groupValidationNotice(
				'Revisa los autos del grupo',
				'Cada auto necesita identificacion, servicios y una agenda consistente.',
				groupLines,
			)
			if (notice) {
				setError(notice)
				return
			}
			const mode = groupReservationMode(groupLines)
			if (mode === 'quote' && !canViewEconomy) {
				setError(
					createValidationNotice(
						'Falta la fecha',
						'Sin fecha se crea una cotizacion libre, pero tu usuario no tiene acceso a cotizaciones.',
						[
							{
								path: 'vehicle_lines',
								label: 'Autos',
								message: 'Agrega fecha a cada auto para crear reservas.',
							},
						],
					),
				)
				return
			}
			const createdQuote = await runAction(async () => {
				const created = await apiFetch<AnyRecord>('/quotes/', {
					method: 'POST',
					body: JSON.stringify({
						is_group: true,
						create_reservations: mode === 'reservation',
						customer: reservationForm.customer,
						observations: reservationForm.notes,
						vehicle_lines: groupVehicleLinePayload(
							groupLines,
							services,
							vehicles,
						),
					}),
				})
				setReservationForm(blankReservationForm())
				quickReservationExit.close()
				return created
			}, {
				key: 'save:reservation',
				flashTarget: (created: AnyRecord) => {
					if (mode === 'reservation') {
						const line = firstGroupReservationLine(created)
						if (line?.reservation) {
							return recordFlashKey('reservation', line.reservation)
						}
					}
					return recordFlashKey('quote', created?.id)
				},
				successTitle:
					mode === 'reservation'
						? 'Reservas creadas'
						: entityFeedbackTitle('quote', 'created'),
				...(mode === 'quote' ? { undo: undoCreatedRecord('quote') } : {}),
			})
			if (createdQuote) {
				if (mode === 'reservation') {
					setActive('agenda')
				} else {
					setActive('quotes')
					openDetailModal('Cotizacion', createdQuote)
				}
			}
			return
		}
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
						items: serviceLinePayloadForServices(reservationItems, services),
					}),
				})
				setReservationForm(blankReservationForm())
				quickReservationExit.close()
				return created
			}, {
				key: 'save:reservation',
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
						items: serviceLinePayloadForServices(reservationItems, services),
					}),
			})
			const createdQuote = await apiFetch<AnyRecord>(`/reservations/${created.id}/quote/`, {
				method: 'POST',
			})
			setReservationForm(blankReservationForm())
			quickReservationExit.close()
			return { ...created, _created_quote_id: createdQuote?.id }
		}, {
			key: 'save:reservation',
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
			key: 'save:payment',
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
				body: JSON.stringify(cashMovementPayload(movementForm)),
			})
			setMovementForm(blankCashMovementForm(selectedDay))
			formModalExit.close()
			return created
		}, {
			key: 'save:cash',
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
					concept: debtForm.concept,
					creditor: debtForm.creditor,
					supplier: debtForm.supplier || null,
					principal_amount: debtForm.principal_amount,
					origin_date: debtForm.origin_date,
					due_date: debtForm.due_date || null,
					expense_category: debtForm.expense_category,
					expense_subcategory: debtForm.expense_subcategory,
					notes: debtForm.notes,
				}),
			})
			setDebtForm(blankDebtForm(today))
			formModalExit.close()
			return created
		}, {
			key: 'save:debt',
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('debt', created?.id),
			successTitle: entityFeedbackTitle('debt', 'created'),
			undo: undoCreatedRecord('debt'),
		})
	}

	async function saveFixedExpense(event: FormEvent) {
		event.preventDefault()
		const editingId = fixedExpenseForm.id
		await runAction(async () => {
			const created = await apiFetch<AnyRecord>(
				editingId ? `/fixed-expenses/${editingId}/` : '/fixed-expenses/',
				{
					method: editingId ? 'PATCH' : 'POST',
					body: JSON.stringify({
						concept: fixedExpenseForm.concept,
						supplier: fixedExpenseForm.supplier || null,
						amount: fixedExpenseForm.amount,
						expense_category: fixedExpenseForm.expense_category,
						expense_subcategory: fixedExpenseForm.expense_subcategory,
						notes: fixedExpenseForm.notes,
						interval_unit: fixedExpenseForm.interval_unit || 'months',
						interval_count: Number(fixedExpenseForm.interval_count || 1),
						start_date: fixedExpenseForm.start_date,
						due_offset_days: Number(fixedExpenseForm.due_offset_days || 0),
						end_date: fixedExpenseForm.end_date || null,
						max_cycles: fixedExpenseForm.max_cycles
							? Number(fixedExpenseForm.max_cycles)
							: null,
						auto_pay: Boolean(fixedExpenseForm.auto_pay),
						payment_method: fixedExpenseForm.payment_method || 'transfer',
					}),
				},
			)
			setFixedExpenseForm(blankFixedExpenseForm(today))
			formModalExit.close()
			return created
		}, {
			key: 'save:fixed-expense',
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('fixed-expense', created?.id),
			successTitle: entityFeedbackTitle(
				'fixed-expense',
				editingId ? 'updated' : 'created',
			),
			undo: editingId ? undefined : undoCreatedRecord('fixed-expense'),
		})
	}

	function payFixedExpenseOccurrence(item: AnyRecord) {
		const amount = String(item.amount ?? '')
		setPayOccurrenceForm({
			id: item.id,
			fixed_expense: item.fixed_expense,
			method: 'transfer',
			paid_at: today,
			amount,
			original_amount: amount,
			update_template: false,
		})
		setFormModal({ kind: 'fixed-expense-pay' })
	}

	async function confirmFixedExpenseOccurrencePayment(event: FormEvent) {
		event.preventDefault()
		await runAction(
			async () => {
				const body: AnyRecord = {
					method: payOccurrenceForm.method,
					paid_at: payOccurrenceForm.paid_at,
				}
				if (payOccurrenceForm.amount !== '') {
					body.amount = payOccurrenceForm.amount
				}
				const result = await apiFetch<AnyRecord>(
					`/fixed-expense-occurrences/${payOccurrenceForm.id}/pay/`,
					{
						method: 'POST',
						body: JSON.stringify(body),
					},
				)
				const shouldUpdateTemplate =
					payOccurrenceForm.update_template &&
					payOccurrenceForm.amount !== '' &&
					Number(payOccurrenceForm.amount) !== Number(payOccurrenceForm.original_amount)
				if (shouldUpdateTemplate) {
					await apiFetch(`/fixed-expenses/${payOccurrenceForm.fixed_expense}/`, {
						method: 'PATCH',
						body: JSON.stringify({ amount: payOccurrenceForm.amount }),
					})
				}
				formModalExit.close()
				return result
			},
			{
				successTitle: entityFeedbackTitle('fixed-expense-occurrence', 'updated'),
			},
		)
	}

	async function pauseFixedExpense(id: string | number) {
		await runAction(
			async () =>
				apiFetch<AnyRecord>(`/fixed-expenses/${id}/pause/`, { method: 'POST' }),
			{ successTitle: 'Gasto fijo pausado' },
		)
	}

	async function resumeFixedExpense(id: string | number) {
		await runAction(
			async () =>
				apiFetch<AnyRecord>(`/fixed-expenses/${id}/resume/`, { method: 'POST' }),
			{ successTitle: 'Gasto fijo reanudado' },
		)
	}

	async function deleteFixedExpense(id: string | number) {
		const confirmed = await requestConfirm({
			title: 'Eliminar gasto fijo',
			message:
				'Eliminar el gasto fijo. Los periodos ya generados se conservan. ¿Continuar?',
			confirmLabel: 'Eliminar',
			cancelLabel: 'Cancelar',
			tone: 'danger',
		})
		if (!confirmed) return
		await runAction(
			async () =>
				apiFetch<AnyRecord>(`/fixed-expenses/${id}/`, { method: 'DELETE' }),
			{ successTitle: entityFeedbackTitle('fixed-expense', 'deleted') },
		)
	}

	async function unpayFixedExpenseOccurrence(id: string | number) {
		const confirmed = await requestConfirm({
			title: 'Revertir pago',
			message: 'Revertir el pago elimina el egreso de la caja. ¿Continuar?',
			confirmLabel: 'Revertir pago',
			cancelLabel: 'Cancelar',
			tone: 'danger',
		})
		if (!confirmed) return
		await runAction(
			async () =>
				apiFetch<AnyRecord>(`/fixed-expense-occurrences/${id}/unpay/`, {
					method: 'POST',
				}),
			{ successTitle: 'Pago revertido' },
		)
	}

	function openFixedExpenseForEdit(plan: AnyRecord) {
		setFixedExpenseForm({
			id: plan.id,
			concept: plan.concept ?? '',
			supplier: plan.supplier ? String(plan.supplier) : '',
			amount: String(plan.amount ?? ''),
			expense_category: plan.expense_category ?? 'Servicios',
			expense_subcategory: plan.expense_subcategory ?? 'Otros',
			notes: plan.notes ?? '',
			interval_unit: plan.interval_unit ?? 'months',
			interval_count: String(plan.interval_count ?? '1'),
			start_date: plan.start_date ?? today,
			due_offset_days: String(plan.due_offset_days ?? '0'),
			end_date: plan.end_date ?? '',
			max_cycles: plan.max_cycles != null ? String(plan.max_cycles) : '',
			auto_pay: Boolean(plan.auto_pay),
			payment_method: plan.payment_method ?? 'transfer',
		})
		setFormModal({ kind: 'fixed-expense' })
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
			key: 'save:debt-payment',
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
				sector: null,
				name: '',
				unit: 'ml',
				stock_quantity: '0',
				estimated_unit_cost: '0',
				notes: '',
			})
			formModalExit.close()
			return saved
		}, {
			key: 'save:material',
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
			key: 'save:supplier',
			flashTarget: (created: AnyRecord) => recordFlashKey('supplier', created?.id),
			successTitle: entityFeedbackTitle('supplier', 'created'),
			undo: undoCreatedRecord('supplier'),
		})
	}

	function updateStockMovementLine(index: number, patch: AnyRecord) {
		setStockMovementForm((current: AnyRecord) =>
			stockMovementFormWithPatchedLine(current, index, patch),
		)
	}

	function addStockMovementLine() {
		setStockMovementForm((current: AnyRecord) =>
			stockMovementFormWithAddedLine(current),
		)
	}

	function removeStockMovementLine(index: number) {
		setStockMovementForm((current: AnyRecord) =>
			stockMovementFormWithRemovedLine(current, index),
		)
	}

	async function saveStockMovement(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const payload = buildStockMovementPayload(stockMovementForm, {
				requiresSupplier: stockMovementRequiresSupplier,
				requiresCustomer: stockMovementRequiresCustomer,
				requiresReservation: stockMovementRequiresReservation,
				documentFile: stockMovementDocumentFile,
			})
			const created = await apiFetch<AnyRecord>('/stock-movements/', {
				method: 'POST',
				body:
					stockMovementDocumentFile
						? (payload as FormData)
						: JSON.stringify(payload),
			})
			setStockMovementForm(blankStockMovementForm(selectedDay))
			setStockMovementDocumentFile(null)
			formModalExit.close()
			return created
		}, {
			key: 'save:stock',
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

	async function saveHistoricalUsage(event: FormEvent) {
		event.preventDefault()
		await runAction(async () => {
			const payload: AnyRecord = {
				material: historicalUsageForm.material,
				service: historicalUsageForm.service,
				reservations: historicalUsageForm.reservations,
				stock_quantity_to_decrement:
					historicalUsageForm.stock_quantity_to_decrement || '1',
				observations: historicalUsageForm.observations,
			}
			if (historicalUsageForm.opened_at) payload.opened_at = historicalUsageForm.opened_at
			if (historicalUsageForm.finished_at) payload.finished_at = historicalUsageForm.finished_at
			const created = await apiFetch<AnyRecord>(
				'/material-open-units/register-usage/',
				{ method: 'POST', body: JSON.stringify(payload) },
			)
			// Volcado opcional a la receta: consumo estimado por servicio de esta unidad.
			const jobs = numberValue(created?.work_orders_count)
			const unitQuantity = numberValue(created?.stock_quantity_to_decrement)
			if (historicalUsageForm.update_recipe && jobs > 0 && unitQuantity > 0) {
				await apiFetch('/service-materials/upsert/', {
					method: 'POST',
					body: JSON.stringify({
						service: historicalUsageForm.service,
						material: historicalUsageForm.material,
						quantity: (unitQuantity / jobs).toFixed(3),
					}),
				})
			}
			setHistoricalUsageForm({
				material: '',
				service: '',
				reservations: [],
				opened_at: '',
				finished_at: '',
				stock_quantity_to_decrement: '1',
				observations: '',
				update_recipe: false,
			})
			formModalExit.close()
			return created
		}, {
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('material-open-unit', created?.id),
			successTitle: 'Consumo historico registrado',
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
		setConsumptionForm(consumptionFormWithMode(consumptionForm, mode))
	}

	const renderConsumptionFields = createMaterialConsumptionFieldsRenderer({
		consumptionForm,
		setConsumptionForm,
		workOrderOptions,
		materialOptions,
		openMaterialUnitOptions,
		selectedConsumptionMaterial,
		selectedOpenUnit,
		materials,
		onChangeMode: updateConsumptionMode,
		flashClass,
		fieldFlashKey,
		onOpenQuickCreate: openQuickCreate,
	})

	async function saveQuote(event: FormEvent) {
		event.preventDefault()
		if (quoteForm.is_group) {
			const groupLines = ensureGroupVehicleLines(quoteForm)
			const notice = groupValidationNotice(
				'Revisa los autos del grupo',
				'Cada auto necesita identificacion, servicios y una agenda consistente.',
				groupLines,
			)
			if (notice) {
				setError(notice)
				return
			}
			await runAction(async () => {
				const created = await apiFetch<AnyRecord>('/quotes/', {
					method: 'POST',
					body: JSON.stringify({
						is_group: true,
						customer: quoteForm.customer,
						valid_until: quoteForm.valid_until || null,
						tax_rate: quoteForm.tax_rate || '0',
						discount_rate: quoteForm.discount_rate || '0',
						observations: quoteForm.observations,
						terms: quoteForm.terms,
						payment_instructions: quoteForm.payment_instructions,
						vehicle_lines: groupVehicleLinePayload(
							groupLines,
							services,
							vehicles,
						),
					}),
				})
				setQuoteForm(blankQuoteFormWithBusinessDefaults(businessFormRef.current))
				formModalExit.close()
				return created
			}, {
				key: 'save:quote',
				flashTarget: (created: AnyRecord) =>
					recordFlashKey('quote', created?.id),
				successTitle: entityFeedbackTitle('quote', 'created'),
				undo: undoCreatedRecord('quote'),
			})
			return
		}
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
					items: serviceLinePayloadForServices(quoteItems, services),
				}),
			})
				setQuoteForm(blankQuoteFormWithBusinessDefaults(businessFormRef.current))
			formModalExit.close()
			return created
		}, {
			key: 'save:quote',
			flashTarget: (created: AnyRecord) =>
				recordFlashKey('quote', created?.id),
			successTitle: entityFeedbackTitle('quote', 'created'),
			undo: undoCreatedRecord('quote'),
		})
	}

	function publicRequestSelection(item: AnyRecord) {
		return publicRequestSelectionForId(publicRequestSelections, item.id)
	}

	function patchPublicRequestSelection(
		item: AnyRecord,
		patch: PublicRequestSelection,
	) {
		setPublicRequestSelections((current) =>
			patchPublicRequestSelectionForState(current, item.id, patch),
		)
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
		const payload = publicRequestConversionPayload(selection)
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
		setPublicRequestSelections((current) =>
			clearPublicRequestSelection(current, item.id),
		)
		setActive(converted.created_type === 'reservation' ? 'agenda' : 'quotes')
	}

	return (
		<>
			<EntityDataLists
				customerNameValues={customerNameValues}
				customerPhoneValues={customerPhoneValues}
				customerEmailValues={customerEmailValues}
				vehiclePlateValues={vehiclePlateValues}
				vehicleColorValues={vehicleColorValues}
				serviceNameValues={serviceNameValues}
				materialNameValues={materialNameValues}
				materialCategoryValues={materialCategoryValues}
				materialUnitValues={materialUnitValues}
				supplierNameValues={supplierNameValues}
				supplierLegalNameValues={supplierLegalNameValues}
				supplierCategoryValues={supplierCategoryValues}
				supplierTaxConditionValues={supplierTaxConditionValues}
				toolNameValues={toolNameValues}
				debtConceptValues={debtConceptValues}
				debtCreditorValues={debtCreditorValues}
				cashCategoryValues={cashCategoryValues}
				cashIncomeCategoryValues={cashIncomeCategoryValues}
				cashExpenseCategoryValues={cashExpenseCategoryValues}
				selectedMovementSubcategoryValues={selectedMovementSubcategoryValues}
				debtExpenseSubcategoryValues={debtExpenseSubcategoryValues}
				cashSubcategoryValues={cashSubcategoryValues}
				settingsClassificationSubcategoryOptions={
					settingsClassificationSubcategoryOptions
				}
			/>
			<AnimatePresence initial={false}>
				{profileModalOpen
					? renderProfileModal({
							hasCurrentUser: Boolean(currentUser),
							onClose: profileExit.close,
							renderProfile: () =>
								currentUser ? (
									<ProfileModal
										submitting={isActionPending('save:profile')}
										onSubmit={saveProfile}
										currentUser={currentUser}
										profileForm={profileForm}
										setProfileForm={setProfileForm}
										canViewEconomy={canViewEconomy}
										onLogout={handleProfileLogout}
										roleLabel={profileRoleLabel(currentUser)}
										activeText={profileActiveText(currentUser)}
										trialText={profileTrialText(currentUser)}
										joinedText={profileJoinedText(currentUser)}
										lastLoginText={profileLastLoginText(currentUser)}
										avatarInputRef={profileAvatarInputRef}
										avatarInputKey={profileAvatarInputKey}
										avatarPreview={safeProfileAvatarPreview}
										avatarPdfThumbnail={safeProfileAvatarPdfThumbnail}
										avatarIsPdf={profileAvatarIsPdf}
										avatarInitial={profileInitial(currentUser)}
										hasStoredAvatar={Boolean(currentUser.avatar_url)}
										onAvatarChange={handleProfileAvatarChange}
										onOpenAvatarPicker={openProfileAvatarPicker}
									/>
								) : null,
						})
					: null}
				{formModal &&
				(formModal.kind === 'customer' ||
					formModal.kind === 'vehicle' ||
					(canViewEconomy &&
						(formModal.kind === 'quote' ||
							formModal.kind === 'service' ||
							formModal.kind === 'payment'))) ? renderCoreFormModal({
					kind: formModal?.kind,
					canViewEconomy,
					onClose: formModalExit.close,
					customerFormProps: {
						fieldErrors: formFieldErrors,
						submitLabel: 'Guardar cliente',
						onSubmit: saveCustomer,
						customerForm,
						setCustomerForm,
						focusNextOnEnter,
						submitting: isActionPending('save:customer'),
					},
					vehicleFormProps: {
						fieldErrors: formFieldErrors,
						submitLabel: 'Guardar vehiculo',
						onSubmit: saveVehicle,
						vehicleForm,
						setVehicleForm,
						customerOptions,
						vehicleBrandSelectOptions,
						vehicleModelSelectOptions,
						flashClass,
						fieldFlashKey,
						openQuickCreate,
						updateVehicleCustomer,
						updateVehicleBrand,
						focusField,
						focusNextOnEnter,
						submitting: isActionPending('save:vehicle'),
					},
					quoteFormProps: {
						fieldErrors: formFieldErrors,
						submitLabel: 'Crear cotizacion',
						onSubmit: saveQuote,
						quoteForm,
						setQuoteForm,
						customerOptions,
						quoteVehicleSearchOptions,
						serviceOptions,
						vehicles,
						services,
						canViewEconomy,
						useReservationTimes,
						quoteTotals,
						openQuickCreate,
						updateQuoteCustomer,
						updateQuoteVehicle,
						addQuoteItem,
						selectQuoteService,
						updateQuoteItem,
						removeQuoteItem,
						serviceNotesForLine,
						focusField,
						focusNextOnEnter,
						flashClass,
						fieldFlashKey,
						submitting: isActionPending('save:quote'),
					},
					serviceFormProps: {
						fieldErrors: formFieldErrors,
						submitting: isActionPending('save:service'),
						submitLabel: 'Guardar servicio',
						onSubmit: saveService,
						serviceForm,
						setServiceForm,
						sectors,
						materialOptions,
						materials,
						serviceMaterialLines,
						addServiceMaterialLine,
						removeServiceMaterialLine,
						updateServiceMaterialLine,
						focusNextOnEnter,
						focusField,
					},
					paymentFormProps: {
						fieldErrors: formFieldErrors,
						submitLabel: 'Guardar pago',
						onSubmit: savePayment,
						paymentForm,
						setPaymentForm,
						workOrders,
						workOrderOptions,
						selectedWorkOrderForPayment,
						focusField,
						focusNextOnEnter,
						submitting: isActionPending('save:payment'),
					},
				}) : null}
				{canViewEconomy && formModal?.kind === 'cash-movement'
					? renderCashMovementModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Guardar movimiento',
								onSubmit: saveCashMovement,
								movementForm,
								setMovementForm,
								incomeCategorySelectOptions,
								expenseCategorySelectOptions,
								movementSubcategorySelectOptions,
								updateMovementCashCategory,
								registerMovementSubcategory,
								validCashSubcategoryForCategory,
								focusField,
								focusNextOnEnter,
								submitting: isActionPending('save:cash'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'cash-load'
					? renderCashLoadModal({
							cashLoadTab,
							cashLoadTabOptions,
							onTabChange: (nextValue) => {
								const tab = nextValue as typeof cashLoadTab
								setCashLoadTab(tab)
								if (tab === 'cash-movement') {
									focusField('cash-movement.type')
								} else if (tab === 'payment') {
									focusField('payment.work_order', true)
								} else {
									focusField('debt-payment.debt', true)
								}
							},
							onClose: formModalExit.close,
							renderCashMovementForm: () => (
								<CashMovementForm
									fieldErrors={formFieldErrors}
									submitLabel="Guardar movimiento"
									onSubmit={saveCashMovement}
									movementForm={movementForm}
									setMovementForm={setMovementForm}
									incomeCategorySelectOptions={incomeCategorySelectOptions}
									expenseCategorySelectOptions={expenseCategorySelectOptions}
									movementSubcategorySelectOptions={
										movementSubcategorySelectOptions
									}
									updateMovementCashCategory={updateMovementCashCategory}
									registerMovementSubcategory={registerMovementSubcategory}
									validCashSubcategoryForCategory={
										validCashSubcategoryForCategory
									}
									focusField={focusField}
									focusNextOnEnter={focusNextOnEnter}
									submitting={isActionPending('save:cash')}
								/>
							),
							renderPaymentForm: () => (
								<PaymentForm
									fieldErrors={formFieldErrors}
									submitLabel="Guardar pago"
									onSubmit={savePayment}
									paymentForm={paymentForm}
									setPaymentForm={setPaymentForm}
									workOrders={workOrders}
									workOrderOptions={workOrderOptions}
									selectedWorkOrderForPayment={selectedWorkOrderForPayment}
									focusField={focusField}
									focusNextOnEnter={focusNextOnEnter}
									submitting={isActionPending('save:payment')}
								/>
							),
							renderDebtPaymentForm: () => (
								<DebtPaymentForm
									fieldErrors={formFieldErrors}
									submitting={isActionPending('save:debt-payment')}
									submitLabel="Guardar pago de deuda"
									onSubmit={saveDebtPayment}
									debtPaymentForm={debtPaymentForm}
									setDebtPaymentForm={setDebtPaymentForm}
									debtOptions={debtOptions}
									selectedDebtForPayment={selectedDebtForPayment}
									focusField={focusField}
									focusNextOnEnter={focusNextOnEnter}
								/>
							),
						})
					: null}
				{canViewEconomy && formModal?.kind === 'expense-classification'
					? renderExpenseClassificationModal({
							title: expenseClassificationForm.originalCategory
								? 'Editar subcategoria de caja'
								: expenseClassificationForm.lockCategory
									? 'Nueva subcategoria de caja'
									: 'Nueva clasificacion de caja',
							onReset: resetExpenseClassificationForm,
							onClose: formModalExit.close,
							formProps: {
								form: expenseClassificationForm,
								setForm: setExpenseClassificationForm,
								onSubmit: saveExpenseClassification,
								categoryOptions: settingsClassificationCategoryOptions,
								focusField,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'cash-category'
					? renderCashCategoryModal({
							title: cashCategoryForm.originalName
								? 'Editar categoria de caja'
								: 'Nueva categoria de caja',
							onReset: resetCashCategoryForm,
							onClose: formModalExit.close,
							formProps: {
								form: cashCategoryForm,
								setForm: setCashCategoryForm,
								onSubmit: saveCashCategory,
								focusField,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'debt'
					? renderDebtModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Guardar deuda',
								onSubmit: saveDebt,
								debtForm,
								setDebtForm,
								supplierOptions,
								suppliers,
								debtExpenseCategorySelectOptions,
								debtExpenseSubcategorySelectOptions,
								updateDebtExpenseCategory,
								registerDebtSubcategory,
								focusField,
								focusNextOnEnter,
								submitting: isActionPending('save:debt'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'fixed-expense'
					? renderFixedExpenseModal({
							title: fixedExpenseForm.id
								? 'Editar gasto fijo'
								: 'Nuevo gasto fijo',
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Guardar gasto fijo',
								onSubmit: saveFixedExpense,
								fixedExpenseForm,
								setFixedExpenseForm,
								supplierOptions,
								suppliers,
								categorySelectOptions: fixedExpenseCategorySelectOptions,
								subcategorySelectOptions: fixedExpenseSubcategorySelectOptions,
								updateCategory: updateFixedExpenseCategory,
								registerSubcategory: registerFixedExpenseSubcategory,
								focusField,
								focusNextOnEnter,
								submitting: isActionPending('save:fixed-expense'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'fixed-expense-pay'
					? renderFixedExpensePaymentModal({
							form: payOccurrenceForm,
							setForm: setPayOccurrenceForm,
							onSubmit: confirmFixedExpenseOccurrencePayment,
							paymentMethodOptions: Object.entries(
								debtPaymentMethodLabels,
							).map(([value, label]) => ({ value, label })),
							formatMoney: money,
							onClose: formModalExit.close,
						})
					: null}
				{canViewEconomy && formModal?.kind === 'debt-payment'
					? renderDebtPaymentModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitting: isActionPending('save:debt-payment'),
								onSubmit: saveDebtPayment,
								debtPaymentForm,
								setDebtPaymentForm,
								debtOptions,
								selectedDebtForPayment,
								focusField,
								focusNextOnEnter,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'material'
					? renderMaterialModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Guardar material',
								onSubmit: saveMaterial,
								materialForm,
								setMaterialForm,
								focusNextOnEnter,
								sectors,
								submitting: isActionPending('save:material'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'supplier'
					? renderSupplierModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Guardar proveedor',
								onSubmit: saveSupplier,
								supplierForm,
								setSupplierForm,
								focusNextOnEnter,
								submitting: isActionPending('save:supplier'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'stock-movement'
					? renderStockMovementModal({
							onClose: formModalExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Crear movimiento',
								onSubmit: saveStockMovement,
								stockMovementForm,
								setStockMovementForm,
								stockMovementDocumentFile,
								setStockMovementDocumentFile,
								stockMovementTypeOptions,
								stockDocumentTypeOptions,
								customerOptions,
								supplierOptions,
								reservationOptions,
								materialOptions,
								stockPaymentMethodOptions,
								materials,
								stockMovementLines,
								selectedDay,
								stockMovementRequiresSupplier,
								stockMovementRequiresCustomer,
								stockMovementRequiresReservation,
								stockMovementTotal,
								blankStockMovementForm,
								updateStockMovementLine,
								addStockMovementLine,
								removeStockMovementLine,
								openQuickCreate,
								createSupplierFromName,
								flashClass,
								fieldFlashKey,
								submitting: isActionPending('save:stock'),
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'material-purchase'
					? renderMaterialPurchaseModal({
							onClose: formModalExit.close,
							formProps: {
								submitLabel: 'Guardar compra',
								purchaseForm,
								setPurchaseForm,
								onSubmit: savePurchase,
								materialOptions,
								materialClassName: flashClass(fieldFlashKey('purchase.material')),
								onOpenMaterial: () =>
									openQuickCreate('material', 'purchase.material'),
								selectedMaterial: selectedPurchaseMaterial,
								focusField,
								focusNextOnEnter,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'material-open-unit'
					? renderMaterialOpenUnitModal({
							onClose: formModalExit.close,
							formProps: {
								submitLabel: 'Abrir unidad',
								openUnitForm,
								setOpenUnitForm,
								onSubmit: saveOpenUnit,
								materialOptions,
								workOrderOptions,
								materialClassName: flashClass(
									fieldFlashKey('open-unit.material'),
								),
								onOpenMaterial: () =>
									openQuickCreate('material', 'open-unit.material'),
								selectedMaterial: selectedOpenUnitFormMaterial,
								focusField,
								focusNextOnEnter,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'material-historical-usage'
					? renderHistoricalMaterialUsageModal({
							onClose: formModalExit.close,
							formProps: {
								submitLabel: 'Registrar consumo',
								historicalUsageForm,
								setHistoricalUsageForm,
								onSubmit: saveHistoricalUsage,
								materialOptions,
								serviceOptions,
								materials,
								reservations,
								today,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'material-consumption'
					? renderMaterialConsumptionModal({
							onClose: formModalExit.close,
							onSubmit: saveConsumption,
							renderFields: () => renderConsumptionFields(true),
							submitLabel: 'Registrar consumo',
							submitting: pendingActions.pending,
						})
					: null}
				{canViewEconomy && formModal?.kind === 'tool'
					? renderToolModal({
							onClose: formModalExit.close,
							formProps: {
								submitLabel: 'Guardar herramienta',
								toolForm,
								setToolForm,
								onSubmit: saveTool,
								toolStatusOptions,
								focusNextOnEnter,
								focusField,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{canViewEconomy && formModal?.kind === 'employee'
					? renderEmployeeModal({
							onClose: formModalExit.close,
							formProps: {
								submitLabel: 'Crear empleado',
								employeeForm,
								setEmployeeForm,
								onSubmit: saveEmployee,
								focusNextOnEnter,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{reservationForQuote
					? renderQuoteReservationModal({
							quoteId: reservationForQuote.id,
							onClose: quoteReservationExit.close,
							formProps: {
								form: quoteReservationForm,
								onSubmit: saveReservationFromQuote,
								onPatch: (patch) =>
									setQuoteReservationForm({ ...quoteReservationForm, ...patch }),
								vehicleOptions: quoteReservationVehicleOptions,
								showVehicleSelect: !reservationForQuote.vehicle,
								useReservationTimes,
								submitting: pendingActions.pending,
							},
						})
					: null}
				{quickReservationDay
					? renderQuickReservationModal({
							day: quickReservationDay,
							title: quickReservationPrefillDay
								? `Nueva reserva - ${formatDayName(quickReservationDay)} ${formatDayLabel(quickReservationDay)}`
								: 'Crear cotizacion o reserva',
							onClose: quickReservationExit.close,
							formProps: {
								fieldErrors: formFieldErrors,
								submitLabel: reservationForm.is_group
									? groupReservationMode(
											ensureGroupVehicleLines(reservationForm),
										) === 'reservation'
										? 'Crear reservas'
										: 'Crear cotizacion'
									: reservationForm.day
										? 'Crear reserva'
										: 'Crear cotizacion',
								onSubmit: saveReservation,
								prefillDayMode: Boolean(quickReservationPrefillDay),
								reservationForm,
								setReservationForm,
								customerOptions,
								customerVehicleOptions,
								serviceOptions,
								vehicles,
								canViewEconomy,
								useReservationTimes,
								allowOverlap:
									businessForm.allow_overlapping_reservations === true,
								openingTime: businessForm.opening_time as string | null,
								closingTime: businessForm.closing_time as string | null,
								workingHours: businessForm.working_hours as
									| WorkingHoursEntry[]
									| undefined,
								enforceCapacity:
									businessForm.enforce_capacity_limit !== false,
								sectors,
								services,
								reservations,
								openQuickCreate,
								updateReservationCustomer,
								updateReservationVehicle,
								addReservationItem,
								selectReservationService,
								updateReservationItem,
								removeReservationItem,
								focusField,
								focusNextOnEnter,
								flashClass,
								fieldFlashKey,
								submitting: isActionPending('save:reservation'),
							},
						})
					: null}
				{quickCreate
					? renderQuickCreateModal({
							kind: quickCreate.kind,
							canViewEconomy,
							onClose: quickCreateExit.close,
							customerFormProps: {
								customerForm,
								setCustomerForm,
								onSubmit: saveQuickCustomer,
								submitting: pendingActions.pending,
							},
							vehicleFormProps: {
								vehicleForm,
								setVehicleForm,
								onSubmit: saveQuickVehicle,
								customerOptions,
								vehicleBrandSelectOptions,
								vehicleModelSelectOptions,
								customerClassName: flashClass(fieldFlashKey('vehicle.customer')),
								onAddCustomer: () =>
									openQuickCreate('customer', 'vehicle.customer'),
								updateVehicleBrand,
								submitting: pendingActions.pending,
							},
							serviceFormProps: {
								serviceForm,
								setServiceForm,
								onSubmit: saveQuickService,
								sectorOptions: sectorSelectOptions,
								onSectorChange: (value) =>
									setServiceForm({
										...serviceForm,
										sector: value ? Number(value) : null,
										service_type: value
											? serviceTypeForSectorId(value, sectors)
											: 'wash',
									}),
								onBasePriceChange: (value) =>
									setServiceForm(applyBasePriceToTypes(serviceForm, value)),
								submitting: pendingActions.pending,
							},
							materialFormProps: {
								materialForm,
								setMaterialForm,
								onSubmit: saveQuickMaterial,
								submitting: pendingActions.pending,
							},
							supplierFormProps: {
								fieldErrors: formFieldErrors,
								submitLabel: 'Crear proveedor',
								onSubmit: saveQuickSupplier,
								supplierForm,
								setSupplierForm,
								focusNextOnEnter,
								submitting: isActionPending('save:supplier:quick'),
							},
						})
					: null}
				{overdueReservationsFlow.listOpen ? (
					<OverdueReservationsModal
						canViewEconomy={canViewEconomy}
						loadState={overdueReservationsFlow.loadState}
						reservations={overdueReservationsFlow.rows}
						onClose={overdueReservationsFlow.closeList}
						onOpenPayment={openOverdueReservationPayment}
						onOpenReservation={(reservation) => {
							void openOverdueReservationEditor(reservation)
						}}
						onRetry={() => {
							void overdueReservationsFlow.refresh(
								loadOverdueReservations,
							)
						}}
					/>
				) : null}
				{renderWorkOrderConsumptionModal({
					canViewEconomy,
					order: consumeForOrder,
					onClose: consumptionExit.close,
					onSubmit: saveConsumption,
					renderFields: () => renderConsumptionFields(false),
					submitting: pendingActions.pending,
				})}
				{renderWorkOrderPaymentModal({
					canViewEconomy,
					order: paymentForOrder,
					onClose: paymentExit.close,
					form: agendaPaymentForm,
					onSubmit: savePayment,
					onPatch: (patch) =>
						setAgendaPaymentForm({ ...agendaPaymentForm, ...patch }),
					onPaymentTypeChange: (value) =>
						setAgendaPaymentForm({
							...agendaPaymentForm,
							payment_type: value || DEFAULT_PAYMENT_TYPE,
						}),
					onMethodChange: (value) =>
						setAgendaPaymentForm({
							...agendaPaymentForm,
							method: value || DEFAULT_PAYMENT_METHOD,
						}),
					orderLabels,
					submitting: pendingActions.pending,
				})}
				{detailModal &&
				(canViewEconomy || !detailRequiresEconomy(detailModal.kind)) ? (
					<DetailModal
						key={`detail:${detailModal.kind}:${detailModal.data?.id ?? detailModal.title}`}
						title={detailModal.title}
						kind={detailModal.kind}
						data={detailModal.data}
						editing={detailModal.editing}
						editable={editableDetailKind(detailModal.kind)}
						onEdit={startDetailEditing}
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
							<SidebarHeaderContent
								showBusinessProfile={Boolean(businessProfile)}
								businessName={String(businessProfile?.name ?? 'negocio')}
								businessImageAlt={String(businessProfile?.name ?? '')}
								businessLogoSrc={sidebarBusinessLogoSrc}
								businessSlug={
									currentUser?.business?.slug
										? String(currentUser.business.slug)
										: null
								}
								collapsed={sidebarCollapsed}
								onOpenBusinessSettings={() => {
									handleSectionChange('settings')
									setSettingsSection('business')
								}}
								onSubmitQuery={submitGlobalSearch}
								onOpenResult={openSearchResult}
							/>
						}
						items={navItems}
						active={active}
						onChange={handleSectionChange}
						onItemHover={(key) => prefetchSection(key as Section)}
						footer={
							<SidebarFooterContent
								themeMode={themeMode}
								collapsed={sidebarCollapsed}
								mobileOpen={sidebarMobileOpen}
								sidebarNavId={SIDEBAR_NAV_ID}
								onToggleTheme={toggleThemeMode}
								fullscreenActive={fullscreenActive}
								fullscreenSupported={fullscreenSupported}
								onToggleFullscreen={handleFullscreenToggle}
								onToggleSidebar={() => {
									if (sidebarMobileOpen) {
										closeSidebarMobileMenu()
										return
									}
									setSidebarCollapsed((current) => !current)
								}}
								onOpenProfile={openProfileModal}
								currentUser={currentUser}
								safeAvatarUrl={safeSidebarAvatarUrl}
								avatarIsPdf={sidebarAvatarIsPdf}
								safeAvatarPdfThumbnail={safeSidebarAvatarPdfThumbnail}
							/>
						}
					/>
				}
			>
				<GlobalProgressBar active={pendingActions.pending} />
			<ConfirmDialog />
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
					<WorkspaceHeaderContent
						title={title.label}
						activeView={displayedActive}
						canViewEconomy={canViewEconomy}
						showAgendaSectorControl={sectorSelectOptions.length > 0}
						agendaSectorOptions={[
							{ value: 'todos', label: 'Todos' },
							...sectorSelectOptions,
						]}
						agendaSectorValue={
							agendaSectorId === null ? 'todos' : String(agendaSectorId)
						}
						onAgendaSectorChange={(nextValue) =>
							setAgendaSectorId(
								nextValue === 'todos' ? null : Number(nextValue),
							)
						}
						period={period}
						dashboardView={dashboardView}
						onDashboardPeriodSubmit={(event) => {
							event.preventDefault()
							triggerPeriodReloadNow()
						}}
						onPreviousMonth={() => goToMonth(-1)}
						onNextMonth={() => goToMonth(1)}
						onFromChange={(from) =>
							schedulePeriodReload({ ...period, from })
						}
						onToChange={(to) => schedulePeriodReload({ ...period, to })}
						onDashboardViewChange={setDashboardView}
						dashboardLoading={isDataSetLoading('dashboard')}
						mobileToggleRef={sidebarMobileToggleRef}
						sidebarNavId={SIDEBAR_NAV_ID}
						mobileOpen={sidebarMobileOpen}
						onToggleMobileMenu={toggleSidebarMobileMenu}
						onCreateReservation={() => openQuickReservation(selectedDay)}
						onRefresh={refreshCurrentWorkspace}
						loading={loading}
					/>
				{displayedActive === 'dashboard' ? (
					<DashboardPanel
						birthdayAlerts={
							<BirthdayAlertsPanel
								alerts={dashboard.birthday_alerts ?? []}
								alertDays={dashboard.birthday_alert_days ?? 3}
								recordClass={recordClass}
								detailRecordProps={detailRecordProps}
							/>
						}
						canViewEconomy={canViewEconomy}
						currentUser={currentUser}
						dashboard={dashboard}
						dashboardView={dashboardView}
						demoReadiness={demoReadiness}
						firstChargeableWorkOrder={firstChargeableWorkOrder}
						tasks={tasks}
						starterServicesLoading={isActionPending('onboarding:starter-services')}
						starterServicesPlan={starterServicesPlan}
						loading={loading}
						onCreateFirstReservation={() => openQuickReservation(selectedDay, true)}
						onCreateStarterServices={createStarterServices}
						onDismissOnboardingStep={dismissOnboardingStep}
						onOpenFirstPayment={openPaymentForOrder}
						onOpenOverdueReservations={
							overdueReservationsFlow.openList
						}
						onOpenPaymentForOrder={openPaymentForOrder}
						onOpenSection={handleSectionChange}
						onOpenSettingsSection={(section: DemoReadinessSettingsSection) => {
							setSettingsSection(section as SettingsSection)
							handleSectionChange('settings')
						}}
						overdueReservations={overdueReservationsFlow.rows}
						overdueReservationsLoadState={
							overdueReservationsFlow.loadState
						}
					/>
				) : null}

				{displayedActive === 'search' ? (
					<SearchResultsPanel
						query={searchPageQuery.trim()}
						onSubmitQuery={submitGlobalSearch}
						onOpenResult={openSearchResult}
					/>
				) : null}

				{displayedActive === 'notifications' ? (
					<PublicRequestsView
						pendingRequests={pendingPublicRequests}
						managedRequests={managedPublicRequests}
						pendingCount={pendingPublicRequestsCount}
						selectionFor={publicRequestSelection}
						onPatchSelection={patchPublicRequestSelection}
						onConvert={convertPublicRequest}
						onArchive={archivePublicRequest}
						recordClass={recordClass}
					/>
				) : null}

				{displayedActive === 'customers' ? (
					<>
						{customerDashboard && canViewEconomy ? (
							renderCustomerDashboard()
						) : (
							<CustomersWorkspace
								showLoadingSkeleton={
									isDataSetLoading('customers') && !customers.length
								}
								customers={filteredCustomers}
								loading={isDataSetLoading('customers')}
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
								onEdit={(item) =>
									openDetailModal('Cliente', item, { startEditing: true })
								}
								onDelete={(item) =>
									runAction(
										() =>
											apiFetch(`/customers/${item.id}/`, {
												method: 'DELETE',
											}),
										{
											successTitle: entityFeedbackTitle('customer', 'deleted'),
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
							/>
						)}
					</>
				) : null}

				{displayedActive === 'suppliers' ? (
					supplierDashboard && canViewEconomy ? (
						<SupplierDashboardPanel
							supplier={supplierDashboard}
							history={supplierDashboardHistory}
							loading={supplierDashboardLoading}
							onBack={() => setSupplierDashboard(null)}
							onNewPurchase={openStockPurchaseForSupplier}
							onNewDebt={openDebtForSupplier}
							onOpenDetail={openDetailModal}
						/>
					) : (
						<SuppliersWorkspace
							suppliers={filteredSuppliers}
							search={search}
							onSearchChange={setSearch}
							onCreateSupplier={() => openFormModal('supplier')}
							onCreatePurchase={() => openFormModal('stock-movement')}
							canViewEconomy={canViewEconomy}
							getRecordClassName={(item) => recordClass('supplier', item.id)}
							quickActionTargetProps={quickActionTargetProps}
							supplierQuickActions={supplierQuickActions}
							renderQuickActionsTrigger={renderQuickActionsTrigger}
							onOpenDashboard={openSupplierDashboard}
							onNewPurchaseForSupplier={openStockPurchaseForSupplier}
							onEdit={(item) =>
								openDetailModal('Proveedor', item, { startEditing: true })
							}
							onDeactivate={(item) =>
								runAction(
									() =>
										apiFetch(`/suppliers/${item.id}/`, {
											method: 'DELETE',
										}),
									{
										successTitle: entityFeedbackTitle('supplier', 'deleted'),
										undo: undoRestoreActiveRecord('supplier', item),
									},
								)
							}
							money={money}
							formatDateLabel={formatDateLabel}
						/>
					)
				) : null}

				{displayedActive === 'vehicles' ? (
					<VehiclesWorkspace
						vehicles={filteredVehicles}
						search={search}
						onSearchChange={setSearch}
						onCreate={() => openFormModal('vehicle')}
						getRecordClassName={(item) => recordClass('vehicle', item.id)}
						detailProps={(item) => detailRecordProps('Vehiculo', item)}
						quickActionTargetProps={quickActionTargetProps}
						vehicleQuickActions={vehicleQuickActions}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						onEdit={(item) =>
							openDetailModal('Vehiculo', item, { startEditing: true })
						}
						onDeactivate={(item) =>
							runAction(
								() =>
									apiFetch(`/vehicles/${item.id}/`, {
										method: 'DELETE',
									}),
								{
									successTitle: entityFeedbackTitle('vehicle', 'deleted'),
									undo: undoRestoreActiveRecord('vehicle', item),
								},
							)
						}
					/>
				) : null}

				{displayedActive === 'services' &&
				(isDataSetLoading('services') || Boolean(loadErrorNotice)) &&
				!services.length ? (
					sectionFallback('services', false, 'Cargando servicios')
				) : displayedActive === 'services' ? (
					<ServicesPanel
						canViewEconomy={canViewEconomy}
						customerDaysAgoText={customerDaysAgoText}
						customerScheduleLabel={customerScheduleLabel}
						orderLabels={orderLabels}
						quickActionTargetProps={quickActionTargetProps}
						quoteStatusLabels={quoteStatusLabels}
						quotes={quotes}
						recordClass={recordClass}
						renderCustomerRankingPanel={renderCustomerRankingPanel}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						reservationLabels={reservationLabels}
						reservations={reservations}
						serviceDashboard={serviceDashboard}
						serviceDashboardHistory={serviceDashboardHistory}
						serviceDashboardLoading={serviceDashboardLoading}
						serviceQuickActions={serviceQuickActions}
						serviceTypeLabels={serviceTypeLabels}
						sectors={sectors}
						services={services}
						starterServicesLoading={isActionPending('onboarding:starter-services')}
						starterServicesPlan={starterServicesPlan}
						workOrders={workOrders}
						onBackToServices={() => setServiceDashboard(null)}
						onCreateStarterServices={createStarterServices}
						onCreateService={() => openFormModal('service')}
						onDeleteService={(item) =>
							runAction(
								() =>
									apiFetch(`/services/${item.id}/`, {
										method: 'DELETE',
									}),
								{
									successTitle: entityFeedbackTitle('service', 'deleted'),
									undo: undoRestoreActiveRecord('service', item),
								},
							)
						}
						onOpenQuoteDetail={(item) => openDetailModal('Cotizacion', item)}
						onOpenReservationDetail={(item) => openDetailModal('Reserva', item)}
						onOpenServiceDashboard={openServiceDashboard}
						onOpenServiceDetail={(item) => openDetailModal('Servicio', item)}
						onOpenWorkOrderDetail={(item) =>
							openDetailModal('Orden de trabajo', item)
						}
					/>
				) : null}

				{displayedActive === 'agenda' ? (
					<AgendaViewControls
						agendaSectorLabel={agendaSectorLabel}
						visibleReservationCount={visibleAgendaReservations.length}
						workViewMode={workViewMode}
						agendaRangeMode={agendaRangeMode}
						agendaRangeModes={agendaRangeModes}
						workViewModes={workViewModes}
						onAgendaRangeChange={setAgendaRangeMode}
						onWorkViewChange={setWorkViewMode}
					/>
				) : null}

				{displayedActive === 'agenda' && workViewMode === 'agenda' ? (
					<AgendaSchedulePanel
						currentDay={agendaStartDay}
						endLabel={formatDayLabel(weekEndDay)}
						startLabel={formatDayLabel(agendaStartDay)}
						visibleDays={AGENDA_VISIBLE_DAYS}
						rangeMode={agendaRangeMode}
						title={
							agendaRangeMode === 'month'
								? `Agenda de ${agendaMonthLabel}`
								: undefined
						}
						onMove={handleAgendaToolbarMove}
						onToday={goToToday}
						onGoToDate={goToDate}
						onOpenCashForRange={openCashForAgendaPeriod}
						agendaLoadError={agendaLoadError}
						onReload={() => loadData({ force: true })}
						monthWeeks={agendaMonthModel.weeks}
						monthWeekdayLabels={agendaMonthWeekdayLabels}
						onSelectDay={selectAgendaDayFromMonth}
						onSelectReservation={(chip) =>
							selectAgendaDayFromMonth(
								String(chip.reservation.day ?? agendaStartDay),
							)
						}
						chipClassName={agendaMonthChipClass}
						chipLabel={agendaMonthChipLabel}
						dayAriaLabel={(isoDate) =>
							`Ver agenda del ${formatFullDateLabel(isoDate)}`
						}
						agendaWeekSkeletonActive={agendaWeekSkeletonActive}
						renderWeekBoard={() => (
							<AgendaWeekBoard
								agendaBoardModel={agendaBoardModel}
								agendaSensors={agendaSensors}
								agendaSlideMotion={agendaSlideMotion}
								agendaWeekSkeletonActive={agendaWeekSkeletonActive}
								shouldSuppressEnteringAgendaOverlap={
									shouldSuppressEnteringAgendaOverlap
								}
								visibleDays={AGENDA_VISIBLE_DAYS}
								currentDay={currentDay}
								agendaDropDay={agendaDropDay}
								agendaMovePendingId={agendaMovePendingId}
								selectedDay={selectedDay}
								workingHours={
									businessForm.working_hours as WorkingHoursEntry[] | undefined
								}
								onDragStart={handleAgendaDragStart}
								onDragOver={handleAgendaDragOver}
								onDragEnd={handleAgendaDragEnd}
								onDragCancel={handleAgendaDragCancel}
								onBoardAnimationComplete={() => {
									setAgendaOverlapSuppressedStartDay((current) =>
										current === agendaBoardModel.startDay ? null : current,
									)
								}}
								onOpenQuickReservation={openQuickReservation}
								recordClass={recordClass}
								agendaCardClass={agendaCardClassForRow}
								flashClass={flashClass}
								renderReservationCard={renderAgendaReservationCard}
								renderDragOverlay={(row) =>
									renderAgendaDragOverlay(row, { statusMode: 'work-order' })
								}
								activeAgendaRow={activeAgendaRow}
							/>
						)}
					/>
				) : null}

				{displayedActive === 'agenda' && workViewMode === 'status' &&
				(isDataSetLoading('reservations') || Boolean(loadErrorNotice)) &&
				!reservations.length ? (
					sectionFallback('reservations', false, 'Cargando trabajos')
				) : displayedActive === 'agenda' && workViewMode === 'status' ? (
					<WorkStatusView
						sensors={agendaSensors}
						onDragStart={handleWorkStatusDragStart}
						onDragOver={handleWorkStatusDragOver}
						onDragEnd={handleWorkStatusDragEnd}
						onDragCancel={handleWorkStatusDragCancel}
						statusColumns={workStatusColumns}
						workStatusGroups={workStatusGroups}
						workStatusDropStatus={workStatusDropStatus}
						workStatusMovePendingId={workStatusMovePendingId}
						activeWorkStatusRow={activeWorkStatusRow}
						workOrderByReservation={workOrderByReservation}
						recordClass={recordClass}
						agendaCardClass={agendaCardClassForRow}
						flashClass={flashClass}
						renderReservationCard={renderAgendaReservationCard}
						renderDragOverlay={(row) =>
							renderAgendaDragOverlay(row, { statusMode: 'work-order' })
						}
					/>
				) : null}

				{displayedActive === 'agenda' && workViewMode === 'entry-date' &&
				(isDataSetLoading('reservations') || Boolean(loadErrorNotice)) &&
				!reservations.length ? (
					sectionFallback('reservations', false, 'Cargando ingresos')
				) : displayedActive === 'agenda' && workViewMode === 'entry-date' ? (
					<WorkEntryDateView
						workEntryDateGroups={workEntryDateGroups}
						workFreeQuotesWithoutEntryDate={workFreeQuotesWithoutEntryDate}
						selectedDay={selectedDay}
						onCreateReservation={() => openQuickReservation(selectedDay)}
						getReservationRow={workReservationRow}
						recordClass={recordClass}
						agendaCardClass={agendaCardClassForRow}
						flashClass={flashClass}
						renderReservationCard={renderAgendaReservationCard}
						quoteQuickActions={quoteQuickActions}
						detailRecordProps={detailRecordProps as (kind: string, data: AnyRecord) => Record<string, unknown>}
						quickActionTargetProps={quickActionTargetProps as (title: string, actions: QuickAction[]) => Record<string, unknown>}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						renderQuoteCardContent={renderQuoteCardContent}
					/>
				) : null}


				{displayedActive === 'cash' ? (
					<CashPanel
						cashClosure={cash.closure}
						cashEntries={cashEntries}
						cashEntryKey={cashEntryKey}
						cashEntryQuickActions={cashEntryQuickActions}
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
						cashQuickFilter={cashQuickFilter}
						cashSortKey={cashSortKey}
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
						cashViewMode={cashViewMode}
						selectedDay={selectedDay}
						onCashFilterChange={updateCashFilter}
						onCashQuickFilterChange={setCashQuickFilter}
						onCashSortChange={setCashSortKey}
						onCashSummaryModeChange={setCashSummaryMode}
						onCashViewModeChange={setCashViewMode}
						onClearCashFilters={() => {
							setCashFilters(CASH_FILTER_DEFAULTS)
							setCashQuickFilter('all')
						}}
						onCloseDay={closeCashDay}
						onReopenDay={reopenCashDay}
						onCreateMovement={() => openFormModal('cash-load')}
						onOpenAgendaForCashPeriod={openAgendaForCashPeriod}
						onMoveSelectedDay={moveSelectedCashDay}
						onOpenCashEntryDetail={openCashEntryDetail}
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
				{displayedActive === 'fixed-expenses' ? (
					<FixedExpensePanel
						fixedExpenses={fixedExpenses}
						occurrences={fixedExpenseOccurrences}
						loading={loading}
						loadBlocked={fixedExpenseLoadBlocked}
						loadErrorNotice={loadErrorNotice}
						recordClass={recordClass}
						search={search}
						onSearchChange={setSearch}
						onCreateFixedExpense={() => openFormModal('fixed-expense')}
						onEditFixedExpense={openFixedExpenseForEdit}
						onOpenOccurrenceDetail={(item) =>
							openDetailModal('Pago de gasto fijo', item)
						}
						onPayOccurrence={payFixedExpenseOccurrence}
						onUnpayOccurrence={unpayFixedExpenseOccurrence}
						onPauseFixedExpense={pauseFixedExpense}
						onResumeFixedExpense={resumeFixedExpense}
						onDeleteFixedExpense={deleteFixedExpense}
						onRefresh={() => loadData({ force: true })}
					/>
				) : null}
				{displayedActive === 'inventory' && Boolean(loadErrorNotice) && !materials.length ? (
					sectionFallback('materials', false, 'Cargando inventario')
				) : displayedActive === 'inventory' && isDataSetLoading('materials') && !materials.length ? (
					<div className="grid">
						<section className="panel">
							<SkeletonList rows={6} columns={4} label="Cargando inventario" />
						</section>
					</div>
				) : displayedActive === 'inventory' ? (
					<InventoryPanel
						loading={isDataSetLoading('materials')}
						sectors={sectors}
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
						onOpenHistoricalUsage={() => openHistoricalUsage()}
					/>
				) : null}

				{displayedActive === 'tools' &&
				(isDataSetLoading('tools') || Boolean(loadErrorNotice)) &&
				!filteredTools.length ? (
					sectionFallback('tools', false, 'Cargando herramientas')
				) : displayedActive === 'tools' ? (
					<ToolsPanel
						detailRecordProps={detailRecordProps}
						filteredTools={filteredTools}
						quickActionTargetProps={quickActionTargetProps}
						recordClass={recordClass}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						search={search}
						toolQuickActions={toolQuickActions}
						toolStatusLabels={toolStatusLabels}
						toolSummary={toolSummary}
						toolTotalValue={toolTotalValue}
						onDeleteTool={(item) =>
							runAction(
								() =>
									apiFetch(`/tools/${item.id}/`, {
										method: 'DELETE',
									}),
								{
									successTitle: entityFeedbackTitle('tool', 'deleted'),
									undo: undoRestoreActiveRecord('tool', item),
								},
							)
						}
						onOpenToolDetail={(item) => openDetailModal('Herramienta', item)}
						onOpenToolForm={() => openFormModal('tool')}
						onSearchChange={setSearch}
					/>
				) : null}

				{displayedActive === 'tasks' &&
				(isDataSetLoading('tasks') || Boolean(loadErrorNotice)) &&
				!tasks.length ? (
					sectionFallback('tasks', false, 'Cargando tareas')
				) : displayedActive === 'tasks' ? (
					<TasksPanel
						tasks={tasks as any}
						loading={isDataSetLoading('tasks')}
						employees={employees as any}
						customers={customers.map((item) => ({
							id: Number(item.id),
							name: String(item.name ?? `Cliente ${item.id}`),
						}))}
						vehicles={vehicles.map((item) => {
							const plate = String(item.license_plate ?? '').trim()
							const detail = [item.brand, item.model]
								.map((part) => String(part ?? '').trim())
								.filter(Boolean)
								.join(' ')
							const label = [plate, detail].filter(Boolean).join(' - ') ||
								`Vehiculo ${item.id}`
							return {
								id: Number(item.id),
								label,
								customerId: item.customer != null ? Number(item.customer) : null,
							}
						})}
						currentUser={currentUser}
						canViewEconomy={canViewEconomy}
						fieldErrors={formFieldErrors}
						onFormOpen={() => setError(null)}
						onCreate={async (payload) => {
							return await runAction(
								() =>
									apiFetch('/tasks/', {
										method: 'POST',
										body: JSON.stringify(payload),
									}),
								{ successTitle: 'Tarea creada' },
							)
						}}
						onUpdate={async (id, payload) => {
							return await runAction(
								() =>
									apiFetch(`/tasks/${id}/`, {
										method: 'PATCH',
										body: JSON.stringify(payload),
									}),
								{ successTitle: 'Tarea actualizada' },
							)
						}}
						onDelete={async (id) => {
							await runAction(
								() => apiFetch(`/tasks/${id}/`, { method: 'DELETE' }),
								{
									successTitle: 'Tarea eliminada',
									undo: {
										execute: async () => {
											await apiFetch(`/tasks/${id}/restore/`, {
												method: 'POST',
											})
										},
										successTitle: 'Tarea restaurada',
									},
								},
							)
						}}
						onComplete={async (id) => {
							const original = tasks.find(
								(item) => Number(item.id) === id,
							)
							if (!original) return
							const optimistic = {
								...original,
								status: 'done',
								completed_at: new Date().toISOString(),
								is_overdue: false,
							}
							await runOptimistic({
								key: `task-complete-${id}`,
								optimistic: () =>
									setTasks((current) =>
										current.map((item) =>
											Number(item.id) === id ? optimistic : item,
										),
									),
								rollback: () =>
									setTasks((current) =>
										current.map((item) =>
											Number(item.id) === id ? original : item,
										),
									),
								action: () =>
									apiFetch(`/tasks/${id}/complete/`, { method: 'POST' }),
								successTitle: 'Tarea completada',
							})
						}}
						onReopen={async (id) => {
							const original = tasks.find(
								(item) => Number(item.id) === id,
							)
							if (!original) return
							const optimistic = {
								...original,
								status: 'pending',
								completed_at: null,
								completed_by: null,
								completed_by_username: null,
							}
							await runOptimistic({
								key: `task-reopen-${id}`,
								optimistic: () =>
									setTasks((current) =>
										current.map((item) =>
											Number(item.id) === id ? optimistic : item,
										),
									),
								rollback: () =>
									setTasks((current) =>
										current.map((item) =>
											Number(item.id) === id ? original : item,
										),
									),
								action: () =>
									apiFetch(`/tasks/${id}/reopen/`, { method: 'POST' }),
								successTitle: 'Tarea reabierta',
							})
						}}
					/>
				) : null}

				{displayedActive === 'quotes' &&
				(isDataSetLoading('quotes') || Boolean(loadErrorNotice)) &&
				!quotes.length ? (
					sectionFallback('quotes', false, 'Cargando cotizaciones')
				) : displayedActive === 'quotes' ? (
					<QuotesPanel
						activeQuoteDrag={activeQuoteDrag}
						agendaSensors={agendaSensors}
						detailRecordProps={detailRecordProps}
						quickActionTargetProps={quickActionTargetProps}
						quoteBoard={quoteBoard}
						quoteCode={quoteCode}
						quoteDropStatus={quoteDropStatus}
						quoteHasReservation={quoteHasReservation}
						quoteLaneStatus={quoteLaneStatus}
						quoteMovePendingId={quoteMovePendingId}
						quoteQuickActions={quoteQuickActions}
						quoteTentativeTimeLabel={quoteTentativeTimeLabel}
						recordClass={recordClass}
						renderQuickActionsTrigger={renderQuickActionsTrigger}
						onCreateQuote={() => openFormModal('quote')}
						onCreateReservationFromQuote={createReservationFromQuote}
						onDownloadQuotePdf={downloadQuotePdf}
						onDownloadQuotePdfAndMarkSent={downloadQuotePdfAndMarkSent}
						onSendQuoteWhatsapp={sendQuoteWhatsapp}
						whatsappButtonVisible={quoteWhatsappButtonVisible}
						whatsappButtonLabel={quoteWhatsappButtonLabel}
						onOpenQuoteReservationInAgenda={openQuoteReservationInAgenda}
						onQuoteDragCancel={handleQuoteDragCancel}
						onQuoteDragEnd={handleQuoteDragEnd}
						onQuoteDragOver={handleQuoteDragOver}
						onQuoteDragStart={handleQuoteDragStart}
					/>
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
						whatsappAutomationRules={whatsappAutomationRules}
						whatsappConfig={whatsappConfig}
						whatsappMessages={whatsappMessages}
						whatsappTemplates={whatsappTemplates}
						incomeCategoryTree={incomeCategoryTree}
						expenseCategoryTree={expenseCategoryTree}
						currentUserId={currentUser?.id ?? null}
						employees={employees}
						selectedEmployee={selectedEmployee}
						employeeAuditLogs={employeeAuditLogs}
						employeeAuditLogsLoading={employeeAuditLogsLoading}
						employeeAuditLogsError={employeeAuditLogsError}
						expandedAuditLogId={expandedAuditLogId}
						inactiveEmployeeCount={inactiveEmployeeCount}
						loading={loading}
						safeBusinessLogoPdfThumbnail={safeBusinessLogoPdfThumbnail}
						safeBusinessLogoPreview={safeBusinessLogoPreview}
						sectors={sectors}
						services={services}
						settingsSection={settingsSection}
						settingsSectionLabel={settingsSectionLabel}
						settingsSectionOptions={settingsSectionOptions}
						showStayDaysInAgenda={showStayDaysInAgenda}
						useReservationTimes={useReservationTimes}
						reservationUsePending={reservationStatusConfig.usePending}
						reservationUseInProgress={reservationStatusConfig.useInProgress}
						reservationUseReady={reservationStatusConfig.useReady}
						reservationUseCanceled={reservationStatusConfig.useCanceled}
						reservationAutoChargeOnDelivery={
							reservationStatusConfig.autoChargeOnDelivery
						}
						onApplyAuditFilters={applyAuditFilters}
						onAuditActionLabel={auditActionLabel}
						onAuditModuleLabel={auditModuleLabel}
						onBusinessLogoChange={handleBusinessLogoChange}
						onClearAuditFilters={clearAuditFilters}
						onDeleteExpenseClassification={deleteExpenseClassification}
						onEditExpenseClassification={openExpenseClassificationEditor}
						onAddSubcategory={openSubcategoryCreator}
						onOpenCashCategoryForm={openCashCategoryCreator}
						onEditCashCategory={openCashCategoryEditor}
						onDeleteCashCategory={deleteCashCategory}
						onOpenBusinessLogoPicker={openBusinessLogoPicker}
						onSelectEmployee={selectEmployee}
						onDeselectEmployee={deselectEmployee}
						onChangeEmployeePassword={changeEmployeePassword}
						onToggleEmployeeActive={toggleEmployeeActive}
						onOpenEmployeeForm={() => openFormModal('employee')}
						onCreateSector={(data) =>
							runAction(() =>
								apiFetch('/sectors/', {
									method: 'POST',
									body: JSON.stringify(data),
								}),
							)
						}
						onSaveSector={(id, patch) =>
							runAction(() =>
								apiFetch(`/sectors/${id}/`, {
									method: 'PATCH',
									body: JSON.stringify(patch),
								}),
							)
						}
						onPatchBusinessForm={patchBusinessForm}
						onRefreshAuditLogs={() => refreshAuditLogs()}
						onRefreshData={() => loadData({ force: true })}
						onSaveBusinessProfile={saveBusinessProfile}
						onPrepareWhatsappDemo={prepareWhatsappDemo}
						onSaveWhatsappConfig={saveWhatsappConfig}
						onSettingsSectionChange={(section) => {
								setSettingsSection(section)
								if (section !== 'users') deselectEmployee()
							}}
						onToggleAuditLog={setExpandedAuditLogId}
						onCreateWhatsappTemplate={createWhatsappTemplate}
						onUpdateWhatsappAutomationRule={updateWhatsappAutomationRule}
						onUpdateWhatsappTemplate={updateWhatsappTemplate}
						onUpdateAuditFilter={updateAuditFilter}
					/>
				) : null}
				</AnimatedWorkspaceView>
			</AppShell>
		</>
	)
}

