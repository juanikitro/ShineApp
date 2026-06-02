'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Plus } from 'lucide-react'

import { AnimatedLabelSwap } from '@/app/components/motion/AnimatedLabelSwap'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord, money } from '@/lib/page-support'

function serviceLinesTotal(items: AnyRecord[]) {
	return items.reduce(
		(total: number, item: AnyRecord) =>
			total + Number(item.quantity || 0) * Number(item.unit_price || 0),
		0,
	)
}

type ReservationFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	prefillDayMode: boolean
	reservationForm: AnyRecord
	setReservationForm: (form: AnyRecord) => void
	customerOptions: SelectOption[]
	customerVehicleOptions: SelectOption[]
	serviceOptions: SelectOption[]
	canViewEconomy: boolean
	useReservationTimes: boolean
	openQuickCreate: (kind: string, target: string) => void
	updateReservationCustomer: (value: string) => void
	updateReservationVehicle: (value: string) => void
	addReservationItem: () => void
	selectReservationService: (index: number, value: string) => void
	updateReservationItem: (index: number, changes: AnyRecord) => void
	removeReservationItem: (index: number) => void
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	flashClass: (key: string | null) => string
	fieldFlashKey: (target: string) => string
}

export function ReservationForm({
	submitLabel,
	onSubmit,
	prefillDayMode,
	reservationForm,
	setReservationForm,
	customerOptions,
	customerVehicleOptions,
	serviceOptions,
	canViewEconomy,
	useReservationTimes,
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
}: ReservationFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			{prefillDayMode ? (
				<div className="info-note">
					La fecha de la columna queda cargada automaticamente. Si la quitas y
					dejas la hora vacia, se crea una cotizacion libre.
				</div>
			) : (
				<div className="info-note">
					Sin fecha se crea una cotizacion libre. Si cargas fecha, se crea la
					reserva con su cotizacion y la agenda se mantiene abierta.
				</div>
			)}
			<SearchSelect
				label="Cliente"
				value={reservationForm.customer}
				options={customerOptions}
				name="reservation_customer"
				focusKey="reservation.customer"
				className={flashClass(fieldFlashKey('reservation.customer'))}
				onAdd={() => openQuickCreate('customer', 'reservation.customer')}
				onChange={updateReservationCustomer}
			/>
			<SearchSelect
				label="Vehiculo"
				value={reservationForm.vehicle}
				options={customerVehicleOptions}
				name="reservation_vehicle"
				focusKey="reservation.vehicle"
				className={flashClass(fieldFlashKey('reservation.vehicle'))}
				onAdd={() => openQuickCreate('vehicle', 'reservation.vehicle')}
				onChange={updateReservationVehicle}
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
							Number(item.quantity || 0) * Number(item.unit_price || 0)
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
										<NumericInput
											data-focus-key={`reservation.item.${index}.price`}
											name={`reservation_items_${index}_unit_price`}
											prefix="$"
											value={item.unit_price}
											onChange={(raw) =>
												updateReservationItem(index, {
													unit_price: raw,
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
					<strong>
						{money(serviceLinesTotal(reservationForm.items ?? []))}
					</strong>
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
		</form>
	)
}
