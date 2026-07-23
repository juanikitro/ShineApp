'use client'

import { type FormEvent } from 'react'

import { CalendarDays } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type QuoteReservationFormProps = {
	form: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	vehicleOptions: SelectOption[]
	showVehicleSelect: boolean
	useReservationTimes: boolean
	submitting: boolean
}

export function QuoteReservationForm({
	form,
	onSubmit,
	onPatch,
	vehicleOptions,
	showVehicleSelect,
	useReservationTimes,
	submitting,
}: QuoteReservationFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			{showVehicleSelect ? (
				<SearchSelect
					label="Vehiculo"
					value={form.vehicle}
					options={vehicleOptions}
					name="quote_reservation_vehicle"
					onChange={(value) => onPatch({ vehicle: value })}
				/>
			) : null}
			<div className="form-row">
				<Field label="Fecha de reserva">
					<input
						name="quote_reservation_day"
						required
						type="date"
						value={form.day}
						onChange={(event) => onPatch({ day: event.target.value })}
					/>
				</Field>
			</div>
			{useReservationTimes ? (
				<div className="form-row">
					<Field label="Hora de ingreso">
						<input
							type="time"
							name="quote_reservation_start_time"
							value={form.start_time}
							onChange={(event) =>
								onPatch({ start_time: event.target.value })
							}
						/>
					</Field>
					<Field label="Hora de egreso">
						<input
							type="time"
							name="quote_reservation_exit_time"
							value={form.exit_time}
							onChange={(event) => onPatch({ exit_time: event.target.value })}
						/>
					</Field>
				</div>
			) : null}
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<CalendarDays size={16} />}
			>
				Crear reserva
			</Button>
		</form>
	)
}
