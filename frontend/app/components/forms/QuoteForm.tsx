'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { FileText, Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord, money } from '@/lib/page-support'

type QuoteTotals = {
	total: number
	subtotal: number
	discountAmount: number
	taxAmount: number
}

type QuoteFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	quoteForm: AnyRecord
	setQuoteForm: (form: AnyRecord) => void
	customerOptions: SelectOption[]
	quoteVehicleSearchOptions: SelectOption[]
	serviceOptions: SelectOption[]
	canViewEconomy: boolean
	useReservationTimes: boolean
	quoteTotals: QuoteTotals
	openQuickCreate: (kind: string, target: string) => void
	updateQuoteCustomer: (value: string) => void
	updateQuoteVehicle: (value: string) => void
	addQuoteItem: () => void
	selectQuoteService: (index: number, value: string) => void
	updateQuoteItem: (index: number, changes: AnyRecord) => void
	removeQuoteItem: (index: number) => void
	serviceNotesForLine: (item: AnyRecord) => string
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	flashClass: (key: string | null) => string
	fieldFlashKey: (target: string) => string
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function QuoteForm({
	submitLabel,
	onSubmit,
	quoteForm,
	setQuoteForm,
	customerOptions,
	quoteVehicleSearchOptions,
	serviceOptions,
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
	submitting = false,
	fieldErrors,
}: QuoteFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
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
				onChange={updateQuoteVehicle}
			/>
			<div className="form-row">
				<Field label="Fecha tentativa" error={fieldErrors?.['reservation_day']}>
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
					<Field label="Hora tentativa" error={fieldErrors?.['reservation_start_time']}>
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
				{(quoteForm.items ?? []).map((item: AnyRecord, index: number) => {
					const lineTotal =
						Number(item.quantity || 0) * Number(item.unit_price || 0)
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
									<NumericInput
										data-focus-key={`quote.item.${index}.price`}
										prefix="$"
										value={item.unit_price}
										onChange={(raw) =>
											updateQuoteItem(index, {
												unit_price: raw,
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
				})}
				<div className="quote-total">
					<span>Total cotizacion</span>
					<strong>{money(quoteTotals.total)}</strong>
				</div>
			</div>
			<details className="quote-advanced">
				<summary>Avanzado comercial</summary>
				<div className="form-row">
					<Field label="Valida hasta" error={fieldErrors?.['valid_until']}>
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
					<Field label="Descuento %" error={fieldErrors?.['discount_rate']}>
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
					<Field label="IVA %" error={fieldErrors?.['tax_rate']}>
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
				<Field label="Terminos" error={fieldErrors?.['terms']}>
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
				<Field label="Instrucciones de pago" error={fieldErrors?.['payment_instructions']}>
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
			<Field label="Observaciones" error={fieldErrors?.['observations']}>
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
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<FileText size={16} />}
				data-focus-key="quote.submit"
			>
				{submitLabel}
			</Button>
		</form>
	)
}
