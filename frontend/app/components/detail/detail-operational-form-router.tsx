import { type ReactNode } from 'react'

import { type AnyRecord } from '@/lib/page-support'

import { renderQuoteDetailEditor } from './quote-detail-edit-renderer'
import { renderReservationDetailEditor } from './reservation-detail-edit-renderer'
import { renderWorkOrderDetailEditor } from './work-order-detail-edit-renderer'

type DetailState = {
	kind: string
	data: AnyRecord
	editData: AnyRecord
}

type ReservationDetailEditorProps = Parameters<
	typeof renderReservationDetailEditor
>[0]
type WorkOrderDetailEditorProps = Parameters<typeof renderWorkOrderDetailEditor>[0]
type QuoteDetailEditorProps = Parameters<typeof renderQuoteDetailEditor>[0]

type OperationalDetailFormRouterProps = {
	detail: DetailState
	onSubmit: ReservationDetailEditorProps['onSubmit']
	onPatch: ReservationDetailEditorProps['onPatch']
	customerOptions: ReservationDetailEditorProps['customerOptions']
	vehicleOptions: ReservationDetailEditorProps['vehicleOptions']
	reservationLabels: ReservationDetailEditorProps['reservationLabels']
	onUpdateCustomer: ReservationDetailEditorProps['onUpdateCustomer']
	onFocusField: ReservationDetailEditorProps['onFocusField']
	focusNextOnEnter: ReservationDetailEditorProps['focusNextOnEnter']
	useReservationTimes: ReservationDetailEditorProps['useReservationTimes']
	reservationItems: ReservationDetailEditorProps['reservationItems']
	serviceOptions: ReservationDetailEditorProps['serviceOptions']
	onAddService: ReservationDetailEditorProps['onAddService']
	onSelectService: ReservationDetailEditorProps['onSelectService']
	onUpdateService: ReservationDetailEditorProps['onUpdateService']
	onRemoveService: ReservationDetailEditorProps['onRemoveService']
	canViewEconomy: ReservationDetailEditorProps['canViewEconomy']
	orderLabels: ReservationDetailEditorProps['orderLabels']
	onOpenDetail: ReservationDetailEditorProps['onOpenDetail']
	onCreateQuote: ReservationDetailEditorProps['onCreateQuote']
	services: WorkOrderDetailEditorProps['services']
	selectedDay: WorkOrderDetailEditorProps['selectedDay']
	onOpenConsumption: WorkOrderDetailEditorProps['onOpenConsumption']
	quoteStatusLabels: QuoteDetailEditorProps['quoteStatusLabels']
	vehicles: QuoteDetailEditorProps['vehicles']
	quoteVehicleOptions: QuoteDetailEditorProps['vehicleOptions']
	openQuickCreate: QuoteDetailEditorProps['openQuickCreate']
	serviceNotesForLine: QuoteDetailEditorProps['serviceNotesForLine']
	flashClass: QuoteDetailEditorProps['flashClass']
	fieldFlashKey: QuoteDetailEditorProps['fieldFlashKey']
	quoteTentativeTimeLabel: QuoteDetailEditorProps['quoteTentativeTimeLabel']
	onDownloadQuotePdf: QuoteDetailEditorProps['onDownloadQuotePdf']
	onDownloadQuotePdfAndMarkSent: QuoteDetailEditorProps['onDownloadQuotePdfAndMarkSent']
	renderActions: ReservationDetailEditorProps['renderActions']
}

export function renderOperationalDetailFormRouter({
	detail,
	onSubmit,
	onPatch,
	customerOptions,
	vehicleOptions,
	reservationLabels,
	onUpdateCustomer,
	onFocusField,
	focusNextOnEnter,
	useReservationTimes,
	reservationItems,
	serviceOptions,
	onAddService,
	onSelectService,
	onUpdateService,
	onRemoveService,
	canViewEconomy,
	orderLabels,
	onOpenDetail,
	onCreateQuote,
	services,
	selectedDay,
	onOpenConsumption,
	quoteStatusLabels,
	vehicles,
	quoteVehicleOptions,
	openQuickCreate,
	serviceNotesForLine,
	flashClass,
	fieldFlashKey,
	quoteTentativeTimeLabel,
	onDownloadQuotePdf,
	onDownloadQuotePdfAndMarkSent,
	renderActions,
}: OperationalDetailFormRouterProps): ReactNode | undefined {
	const data = detail.editData

	if (detail.kind === 'reservation') {
		return renderReservationDetailEditor({
			data,
			originalData: detail.data,
			onSubmit,
			onPatch,
			customerOptions,
			vehicleOptions,
			reservationLabels,
			onUpdateCustomer,
			onFocusField,
			focusNextOnEnter,
			useReservationTimes,
			reservationItems,
			serviceOptions,
			onAddService,
			onSelectService,
			onUpdateService,
			onRemoveService,
			canViewEconomy,
			orderLabels,
			onOpenDetail,
			onCreateQuote,
			renderActions,
		})
	}

	if (detail.kind === 'workorder') {
		return renderWorkOrderDetailEditor({
			data,
			originalData: detail.data,
			onSubmit,
			onPatch,
			customerOptions,
			vehicleOptions,
			serviceOptions,
			orderLabels,
			onUpdateCustomer,
			onFocusField,
			focusNextOnEnter,
			canViewEconomy,
			services,
			selectedDay,
			onOpenConsumption,
			renderActions,
		})
	}

	if (detail.kind === 'quote') {
		return renderQuoteDetailEditor({
			data,
			onSubmit,
			onPatch,
			quoteStatusLabels,
			vehicles,
			vehicleOptions: quoteVehicleOptions,
			serviceOptions,
			services,
			canViewEconomy,
			useReservationTimes,
			openQuickCreate,
			serviceNotesForLine,
			focusNextOnEnter,
			flashClass,
			fieldFlashKey,
			quoteTentativeTimeLabel,
			onDownloadQuotePdf,
			onDownloadQuotePdfAndMarkSent,
			renderActions,
		})
	}

	return undefined
}
