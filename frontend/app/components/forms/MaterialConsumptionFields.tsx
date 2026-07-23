'use client'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { materialUnitValue } from '@/lib/inventory-display'
import { money, quantity, type AnyRecord } from '@/lib/page-support'

type MaterialConsumptionFieldsProps = {
	consumptionForm: AnyRecord
	setConsumptionForm: (form: AnyRecord) => void
	showWorkOrder?: boolean
	workOrderOptions: SelectOption[]
	materialOptions: SelectOption[]
	openMaterialUnitOptions: SelectOption[]
	materialClassName?: string
	openUnitClassName?: string
	onOpenMaterial: () => void
	selectedConsumptionMaterial: AnyRecord | null | undefined
	selectedOpenUnit: AnyRecord | null | undefined
	materials: AnyRecord[]
	onChangeMode: (mode: 'direct' | 'open_unit') => void
}

export function MaterialConsumptionFields({
	consumptionForm,
	setConsumptionForm,
	showWorkOrder = true,
	workOrderOptions,
	materialOptions,
	openMaterialUnitOptions,
	materialClassName,
	openUnitClassName,
	onOpenMaterial,
	selectedConsumptionMaterial,
	selectedOpenUnit,
	materials,
	onChangeMode,
}: MaterialConsumptionFieldsProps) {
	const directMode = consumptionForm.mode !== 'open_unit'

	return (
		<>
			{showWorkOrder ? (
				<SearchSelect
					label="Reserva/trabajo"
					value={consumptionForm.work_order}
					options={workOrderOptions}
					focusKey="material-consumption.work_order"
					onChange={(value) =>
						setConsumptionForm({
							...consumptionForm,
							work_order: value,
						})
					}
				/>
			) : null}
			<div className="mode-toggle" role="group" aria-label="Modo de consumo">
				<button
					type="button"
					className={directMode ? 'selected' : ''}
					onClick={() => onChangeMode('direct')}
				>
					Consumo directo
				</button>
				<button
					type="button"
					className={!directMode ? 'selected' : ''}
					onClick={() => onChangeMode('open_unit')}
				>
					Unidad abierta
				</button>
			</div>
			{directMode ? (
				<>
					<SearchSelect
						label="Material"
						value={consumptionForm.material}
						options={materialOptions}
						focusKey="consumption.material"
						className={materialClassName}
						onAdd={onOpenMaterial}
						onChange={(value) =>
							setConsumptionForm({
								...consumptionForm,
								material: value,
							})
						}
					/>
					{selectedConsumptionMaterial ? (
						<div className="info-note">
							Stock disponible:{' '}
							<strong>
								{quantity(
									selectedConsumptionMaterial.stock_quantity,
									selectedConsumptionMaterial.unit,
								)}
							</strong>{' '}
							- valor por unidad{' '}
							<strong>
								{money(materialUnitValue(selectedConsumptionMaterial))}
							</strong>
						</div>
					) : null}
				</>
			) : (
				<>
					<SearchSelect
						label="Unidad abierta"
						value={consumptionForm.open_unit}
						options={openMaterialUnitOptions}
						placeholder="Seleccionar unidad abierta"
						focusKey="material-consumption.open_unit"
						className={openUnitClassName}
						onChange={(value) =>
							setConsumptionForm({
								...consumptionForm,
								open_unit: value,
							})
						}
					/>
					{selectedOpenUnit ? (
						<div className="info-note">
							{selectedOpenUnit.material_name} abierta el{' '}
							<strong>{selectedOpenUnit.opened_at}</strong> -{' '}
							{selectedOpenUnit.consumptions_count ?? 0} usos. Al finalizar
							descuenta{' '}
							<strong>
								{quantity(
									selectedOpenUnit.stock_quantity_to_decrement,
									materials.find(
										(item) =>
											String(item.id) === String(selectedOpenUnit.material),
									)?.unit,
								)}
							</strong>
							.
						</div>
					) : (
						<div className="info-note">
							Primero abri una unidad desde Materiales si todavia no hay
							envases abiertos.
						</div>
					)}
				</>
			)}
			<div className="form-row">
				<Field label="Fecha">
					<input
						type="date"
						value={consumptionForm.consumed_at}
						onChange={(event) =>
							setConsumptionForm({
								...consumptionForm,
								consumed_at: event.target.value,
							})
						}
					/>
				</Field>
				{directMode ? (
					<Field label="Cantidad">
						<input
							required
							type="number"
							min="0"
							value={consumptionForm.quantity}
							onChange={(event) =>
								setConsumptionForm({
									...consumptionForm,
									quantity: event.target.value,
								})
							}
						/>
					</Field>
				) : null}
			</div>
			<Field label="Observaciones">
				<textarea
					value={consumptionForm.observations}
					onChange={(event) =>
						setConsumptionForm({
							...consumptionForm,
							observations: event.target.value,
						})
					}
				/>
			</Field>
		</>
	)
}
