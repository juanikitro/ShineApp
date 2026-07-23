import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { Package } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { type SelectOption } from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'
import {
	workOrderServicePatch,
	workOrderStatusFocusKey,
} from '@/lib/work-order-detail'

import { WorkOrderDetailEditForm } from './WorkOrderDetailEditForm'

type WorkOrderDetailEditorProps = {
	data: AnyRecord
	originalData: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	customerOptions: SelectOption[]
	vehicleOptions: SelectOption[]
	serviceOptions: SelectOption[]
	orderLabels: Record<string, string>
	onUpdateCustomer: (kind: string, value: string) => void
	onFocusField: (focusKey: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	canViewEconomy: boolean
	services: AnyRecord[]
	selectedDay: string
	onOpenConsumption: (order: AnyRecord, defaultDay?: string | null) => void
	renderActions: () => ReactNode
}

export function renderWorkOrderDetailEditor({
	data,
	originalData,
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
}: WorkOrderDetailEditorProps): ReactNode {
	return (
		<WorkOrderDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			customerOptions={customerOptions}
			vehicleOptions={vehicleOptions}
			serviceOptions={serviceOptions}
			statusOptions={Object.entries(orderLabels).map(([value, label]) => ({
				value,
				label,
			}))}
			onCustomerChange={(value) => onUpdateCustomer('workorder', value)}
			onVehicleChange={(value) => {
				onPatch({ vehicle: value })
				onFocusField('detail.workorder.service', true)
			}}
			onServiceChange={(value) => {
				onPatch(workOrderServicePatch(data, value, services, canViewEconomy))
				onFocusField('detail.workorder.status', true)
			}}
			onStatusChange={(value) => {
				onPatch({ status: value })
				onFocusField(workOrderStatusFocusKey(canViewEconomy))
			}}
			focusNextOnEnter={focusNextOnEnter}
			canViewEconomy={canViewEconomy}
			consumptionAction={
				canViewEconomy && originalData.id ? (
					<div className="modal-actions">
						<Button
							type="button"
							variant="ghost"
							onClick={() =>
								onOpenConsumption(
									originalData,
									originalData._agenda_day ?? selectedDay,
								)
							}
						>
							<Package size={16} />
							Consumir material
						</Button>
					</div>
				) : null
			}
			actions={renderActions()}
		/>
	)
}
