'use client'

import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type WorkOrderDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	customerOptions: SelectOption[]
	vehicleOptions: SelectOption[]
	serviceOptions: SelectOption[]
	statusOptions: SelectOption[]
	onCustomerChange: (value: string) => void
	onVehicleChange: (value: string) => void
	onServiceChange: (value: string) => void
	onStatusChange: (value: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	canViewEconomy: boolean
	consumptionAction?: ReactNode
	actions?: ReactNode
}

export function WorkOrderDetailEditForm({
	data,
	onSubmit,
	onPatch,
	customerOptions,
	vehicleOptions,
	serviceOptions,
	statusOptions,
	onCustomerChange,
	onVehicleChange,
	onServiceChange,
	onStatusChange,
	focusNextOnEnter,
	canViewEconomy,
	consumptionAction,
	actions,
}: WorkOrderDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Cliente"
				value={String(data.customer ?? '')}
				options={customerOptions}
				focusKey="detail.workorder.customer"
				onChange={onCustomerChange}
			/>
			<SearchSelect
				label="Vehiculo"
				value={String(data.vehicle ?? '')}
				options={vehicleOptions}
				focusKey="detail.workorder.vehicle"
				onChange={onVehicleChange}
			/>
			<SearchSelect
				label="Servicio"
				value={String(data.service ?? '')}
				options={serviceOptions}
				focusKey="detail.workorder.service"
				onChange={onServiceChange}
			/>
			<div className="form-row">
				<SearchSelect
					label="Estado"
					value={String(data.status ?? '')}
					options={statusOptions}
					focusKey="detail.workorder.status"
					onChange={onStatusChange}
				/>
				{canViewEconomy ? (
					<Field label="Total">
						<input
							data-focus-key="detail.workorder.total_amount"
							type="number"
							min="0"
							value={data.total_amount ?? ''}
							onChange={(event) =>
								onPatch({ total_amount: event.target.value })
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
					value={String(data.estimated_delivery_at ?? '').slice(0, 16)}
					onChange={(event) =>
						onPatch({ estimated_delivery_at: event.target.value })
					}
					onKeyDown={focusNextOnEnter('detail.workorder.internal_notes')}
				/>
			</Field>
			<Field label="Notas internas">
				<textarea
					data-focus-key="detail.workorder.internal_notes"
					value={data.internal_notes ?? ''}
					onChange={(event) => onPatch({ internal_notes: event.target.value })}
				/>
			</Field>
			{consumptionAction}
			{actions}
		</form>
	)
}
