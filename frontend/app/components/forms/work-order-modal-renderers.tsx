import { type FormEvent, type ReactNode } from 'react'

import { AgendaWorkOrderSummary } from '@/app/components/agenda/AgendaWorkOrderSummary'
import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'
import { serviceDisplayName } from '@/lib/service-display'

import { AgendaWorkOrderPaymentForm } from './AgendaWorkOrderPaymentForm'
import { WorkOrderMaterialConsumptionForm } from './WorkOrderMaterialConsumptionForm'

type AnyRecord = Record<string, any>

export function renderWorkOrderConsumptionModal({
	canViewEconomy,
	order,
	onClose,
	onSubmit,
	renderFields,
	submitting,
}: {
	canViewEconomy: boolean
	order: AnyRecord | null
	onClose: () => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	renderFields: () => ReactNode
	submitting: boolean
}): ReactNode {
	if (!canViewEconomy || !order) return null

	return (
		<Modal
			key={`consumption:${order.id}`}
			title="Consumir materiales del trabajo"
			onClose={onClose}
		>
			<WorkOrderMaterialConsumptionForm
				onSubmit={onSubmit}
				info={
					<>
						{order.customer_name} - {order.vehicle_label} -{' '}
						{serviceDisplayName(order)}
					</>
				}
				fields={renderFields()}
				submitting={submitting}
			/>
		</Modal>
	)
}

export function renderWorkOrderPaymentModal({
	canViewEconomy,
	order,
	onClose,
	form,
	onSubmit,
	onPatch,
	onPaymentTypeChange,
	onMethodChange,
	orderLabels,
	submitting,
}: {
	canViewEconomy: boolean
	order: AnyRecord | null
	onClose: () => void
	form: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	onPaymentTypeChange: (value: string) => void
	onMethodChange: (value: string) => void
	orderLabels: Record<string, string>
	submitting: boolean
}): ReactNode {
	if (!canViewEconomy || !order) return null

	return (
		<Modal
			key={`payment:${order.id}`}
			title="Cobrar trabajo de la reserva"
			onClose={onClose}
		>
			<AgendaWorkOrderPaymentForm
				form={form}
				onSubmit={onSubmit}
				onPatch={onPatch}
				onPaymentTypeChange={onPaymentTypeChange}
				onMethodChange={onMethodChange}
				info={
					<>
						{order.customer_name} - {order.vehicle_label} -{' '}
						{serviceDisplayName(order)}
					</>
				}
				workOrderSummary={
					<AgendaWorkOrderSummary
						workOrder={order}
						canViewEconomy={canViewEconomy}
						orderLabels={orderLabels}
					/>
				}
				submitting={submitting}
			/>
		</Modal>
	)
}
