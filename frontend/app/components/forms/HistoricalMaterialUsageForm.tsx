'use client'

import { type FormEvent } from 'react'

import { Package } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { Toggle } from '@/app/components/ui/Toggle'
import {
	historicalUsageDetails,
	historicalUsageFormForToggledReservation,
} from '@/lib/inventory-usage'
import { money, type AnyRecord } from '@/lib/page-support'

type HistoricalMaterialUsageFormProps = {
	submitLabel: string
	historicalUsageForm: AnyRecord
	setHistoricalUsageForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	materialOptions: SelectOption[]
	serviceOptions: SelectOption[]
	materials: AnyRecord[]
	reservations: AnyRecord[]
	today: string
	submitting?: boolean
}

export function HistoricalMaterialUsageForm({
	submitLabel,
	historicalUsageForm,
	setHistoricalUsageForm,
	onSubmit,
	materialOptions,
	serviceOptions,
	materials,
	reservations,
	today,
	submitting = false,
}: HistoricalMaterialUsageFormProps) {
	const {
		selectedReservationIds,
		pastServiceReservations,
		selectedCount,
		unitQuantity,
		consumptionPerService,
		unitCost,
		materialUnit,
	} = historicalUsageDetails(
		historicalUsageForm,
		materials,
		reservations,
		today,
	)

	function toggleReservation(id: string) {
		setHistoricalUsageForm(
			historicalUsageFormForToggledReservation(
				historicalUsageForm,
				id,
				reservations,
			),
		)
	}

	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="info-note">
				Registra una unidad ya consumida en el pasado: elegi el producto, el
				servicio y las reservas donde lo usaste. Calcula el rendimiento por
				servicio y no descuenta stock actual.
			</div>
			<SearchSelect
				label="Producto"
				value={historicalUsageForm.material}
				options={materialOptions}
				focusKey="material-historical-usage.material"
				onChange={(value) =>
					setHistoricalUsageForm({ ...historicalUsageForm, material: value })
				}
			/>
			<SearchSelect
				label="Servicio"
				value={historicalUsageForm.service}
				options={serviceOptions}
				placeholder="Elegi un servicio"
				focusKey="material-historical-usage.service"
				onChange={(value) =>
					setHistoricalUsageForm({
						...historicalUsageForm,
						service: value,
						reservations: [],
						opened_at: '',
						finished_at: '',
					})
				}
			/>
			{historicalUsageForm.service ? (
				<Field
					label={`Reservas pasadas de este servicio (${selectedCount} elegidas)`}
				>
					{pastServiceReservations.length ? (
						<div className="usage-reservation-list">
							{pastServiceReservations.map((item) => (
								<Toggle
									key={item.id}
									checked={selectedReservationIds.includes(String(item.id))}
									onChange={() => toggleReservation(String(item.id))}
								>
									<span>
										{item.day} - {item.customer_name}
										{item.vehicle_label ? (
											<small>{item.vehicle_label}</small>
										) : null}
									</span>
								</Toggle>
							))}
						</div>
					) : (
						<div className="info-note">
							No hay reservas pasadas de este servicio.
						</div>
					)}
				</Field>
			) : null}
			<div className="form-row">
				<Field label="Apertura">
					<input
						type="date"
						value={historicalUsageForm.opened_at}
						onChange={(event) =>
							setHistoricalUsageForm({
								...historicalUsageForm,
								opened_at: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Cierre">
					<input
						type="date"
						value={historicalUsageForm.finished_at}
						onChange={(event) =>
							setHistoricalUsageForm({
								...historicalUsageForm,
								finished_at: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<Field label="Cantidad de producto usada (unidades)">
				<input
					type="number"
					min="0"
					step="0.01"
					value={historicalUsageForm.stock_quantity_to_decrement}
					onChange={(event) =>
						setHistoricalUsageForm({
							...historicalUsageForm,
							stock_quantity_to_decrement: event.target.value,
						})
					}
				/>
			</Field>
			{selectedCount > 0 ? (
				<div className="info-note">
					Rendimiento estimado:{' '}
					<strong>
						{unitQuantity.toLocaleString('es-AR', {
							maximumFractionDigits: 2,
						})}{' '}
						{materialUnit} en {selectedCount} servicio
						{selectedCount === 1 ? '' : 's'}
					</strong>
					. Cada servicio gasta ~
					{consumptionPerService.toLocaleString('es-AR', {
						maximumFractionDigits: 3,
					})}{' '}
					{materialUnit}
					{unitCost > 0
						? ` (~${money(consumptionPerService * unitCost)})`
						: ''}.
				</div>
			) : null}
			<Toggle
				checked={Boolean(historicalUsageForm.update_recipe)}
				onChange={(checked) =>
					setHistoricalUsageForm({ ...historicalUsageForm, update_recipe: checked })
				}
			>
				Actualizar la receta del servicio con este consumo estimado
			</Toggle>
			<Field label="Observaciones">
				<textarea
					value={historicalUsageForm.observations}
					onChange={(event) =>
						setHistoricalUsageForm({
							...historicalUsageForm,
							observations: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				disabled={
					!historicalUsageForm.material ||
					!historicalUsageForm.service ||
					selectedCount === 0
				}
				leadingIcon={<Package size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
