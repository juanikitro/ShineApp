import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { FileText } from 'lucide-react'

import { AgendaWorkOrderSummary } from '@/app/components/agenda/AgendaWorkOrderSummary'
import { Button } from '@/app/components/ui/Button'
import { type SelectOption } from '@/app/components/ui/SearchSelect'
import { reservationShowsWork } from '@/lib/agenda-display'
import { type AnyRecord, money } from '@/lib/page-support'

import { ReservationDetailEditForm } from './ReservationDetailEditForm'
import { ReservationServiceLinesEditor } from './ReservationServiceLinesEditor'

type ReservationDetailEditorProps = {
	data: AnyRecord
	originalData: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	customerOptions: SelectOption[]
	vehicleOptions: SelectOption[]
	reservationLabels: Record<string, string>
	onUpdateCustomer: (kind: string, value: string) => void
	onFocusField: (focusKey: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	useReservationTimes: boolean
	reservationItems: (data: AnyRecord) => AnyRecord[]
	serviceOptions: SelectOption[]
	onAddService: () => void
	onSelectService: (index: number, serviceId: string) => void
	onUpdateService: (index: number, patch: AnyRecord) => void
	onRemoveService: (index: number) => void
	canViewEconomy: boolean
	orderLabels: Record<string, string>
	onOpenDetail: (title: string, data: AnyRecord) => void
	onCreateQuote: (reservation: AnyRecord) => void
	renderActions: (beforeSubmit?: ReactNode) => ReactNode
}

export function renderReservationDetailEditor({
	data,
	originalData,
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
}: ReservationDetailEditorProps): ReactNode {
	return (
		<ReservationDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			customerOptions={customerOptions}
			vehicleOptions={vehicleOptions}
			statusOptions={Object.entries(reservationLabels).map(
				([value, label]) => ({ value, label }),
			)}
			onCustomerChange={(value) => onUpdateCustomer('reservation', value)}
			onVehicleChange={(value) => {
				onPatch({ vehicle: value })
				onFocusField('detail.reservation.service.0', true)
			}}
			onStatusChange={(value) => {
				onPatch({ status: value })
				onFocusField('detail.reservation.notes')
			}}
			focusNextOnEnter={focusNextOnEnter}
			useReservationTimes={useReservationTimes}
			serviceLinesEditor={
				<ReservationServiceLinesEditor
					items={reservationItems(data)}
					serviceOptions={serviceOptions}
					formatMoney={money}
					onAdd={onAddService}
					onSelectService={onSelectService}
					onUpdate={onUpdateService}
					onRemove={onRemoveService}
				/>
			}
			workOrderSummary={
				reservationShowsWork(data, data.work_order) ? (
					<AgendaWorkOrderSummary
						workOrder={data.work_order}
						canViewEconomy={canViewEconomy}
						orderLabels={orderLabels}
						showDetailAction
						onOpenDetail={(workOrder) =>
							onOpenDetail('Orden de trabajo', workOrder)
						}
					/>
				) : null
			}
			actions={renderActions(
				canViewEconomy ? (
					<Button
						type="button"
						variant="ghost"
						onClick={() => onCreateQuote(originalData)}
					>
						<FileText size={16} />
						Crear cotizacion
					</Button>
				) : null,
			)}
		/>
	)
}
