'use client'

import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type ReservationDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	customerOptions: SelectOption[]
	vehicleOptions: SelectOption[]
	statusOptions: SelectOption[]
	onCustomerChange: (value: string) => void
	onVehicleChange: (value: string) => void
	onStatusChange: (value: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	useReservationTimes: boolean
	serviceLinesEditor?: ReactNode
	workOrderSummary?: ReactNode
	actions?: ReactNode
}

export function ReservationDetailEditForm({
	data,
	onSubmit,
	onPatch,
	customerOptions,
	vehicleOptions,
	statusOptions,
	onCustomerChange,
	onVehicleChange,
	onStatusChange,
	focusNextOnEnter,
	useReservationTimes,
	serviceLinesEditor,
	workOrderSummary,
	actions,
}: ReservationDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Cliente"
				value={String(data.customer ?? '')}
				options={customerOptions}
				focusKey="detail.reservation.customer"
				onChange={onCustomerChange}
			/>
			<SearchSelect
				label="Vehiculo"
				value={String(data.vehicle ?? '')}
				options={vehicleOptions}
				focusKey="detail.reservation.vehicle"
				onChange={onVehicleChange}
			/>
			{serviceLinesEditor}
			<div className="form-row">
				<Field label="Fecha de ingreso">
					<input
						data-focus-key="detail.reservation.day"
						type="date"
						value={data.day ?? ''}
						onChange={(event) => onPatch({ day: event.target.value })}
						onKeyDown={focusNextOnEnter('detail.reservation.exit_day')}
					/>
				</Field>
				<Field label="Fecha de egreso">
					<input
						data-focus-key="detail.reservation.exit_day"
						type="date"
						value={data.exit_day ?? ''}
						onChange={(event) => onPatch({ exit_day: event.target.value })}
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
							onChange={(event) => onPatch({ start_time: event.target.value })}
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
							onChange={(event) => onPatch({ exit_time: event.target.value })}
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
				options={statusOptions}
				focusKey="detail.reservation.status"
				onChange={onStatusChange}
			/>
			<Field label="Notas">
				<textarea
					data-focus-key="detail.reservation.notes"
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{workOrderSummary}
			{actions}
		</form>
	)
}
