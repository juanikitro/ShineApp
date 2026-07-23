'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Package } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { money, numberValue, quantity, type AnyRecord } from '@/lib/page-support'

type MaterialOpenUnitFormProps = {
	submitLabel: string
	openUnitForm: AnyRecord
	setOpenUnitForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	materialOptions: SelectOption[]
	workOrderOptions: SelectOption[]
	materialClassName?: string
	onOpenMaterial: () => void
	selectedMaterial: AnyRecord | null | undefined
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
}

export function MaterialOpenUnitForm({
	submitLabel,
	openUnitForm,
	setOpenUnitForm,
	onSubmit,
	materialOptions,
	workOrderOptions,
	materialClassName,
	onOpenMaterial,
	selectedMaterial,
	focusField,
	focusNextOnEnter,
	submitting = false,
}: MaterialOpenUnitFormProps) {
	const unitLabel = selectedMaterial?.unit ? `en ${selectedMaterial.unit}` : ''
	const unitCost = selectedMaterial
		? numberValue(selectedMaterial.estimated_unit_cost)
		: 0

	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Material"
				value={openUnitForm.material}
				options={materialOptions}
				focusKey="material-open-unit.material"
				className={materialClassName}
				onAdd={onOpenMaterial}
				onChange={(value) => {
					setOpenUnitForm({
						...openUnitForm,
						material: value,
					})
					focusField('material-open-unit.work_order', true)
				}}
			/>
			{selectedMaterial ? (
				<div className="info-note open-unit-material-info">
					<div className="open-unit-material-stats">
						<span>
							Stock actual{' '}
							<strong>
								{quantity(
									selectedMaterial.stock_quantity,
									selectedMaterial.unit,
								)}
							</strong>
						</span>
						{unitCost > 0 && (
							<span>
								Costo unitario <strong>{money(unitCost)}</strong>
							</span>
						)}
					</div>
					<span className="open-unit-material-disclaimer">
						Abrir una unidad no descuenta stock; el descuento se aplica al finalizar.
					</span>
				</div>
			) : null}
			<SearchSelect
				label="Trabajo de apertura"
				value={openUnitForm.opened_by_work_order}
				options={workOrderOptions}
				placeholder="Sin trabajo asociado"
				focusKey="material-open-unit.work_order"
				onChange={(value) => {
					setOpenUnitForm({
						...openUnitForm,
						opened_by_work_order: value,
					})
					focusField('material-open-unit.opened_at')
				}}
			/>
			<div className="form-row">
				<Field label="Fecha de apertura">
					<input
						data-focus-key="material-open-unit.opened_at"
						type="date"
						value={openUnitForm.opened_at}
						onChange={(event) =>
							setOpenUnitForm({
								...openUnitForm,
								opened_at: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter(
							'material-open-unit.quantity',
						)}
					/>
				</Field>
				<Field
					label="Cantidad al cerrar"
					hint={
						selectedMaterial
							? `Se descuenta del stock ${unitLabel} al finalizar`
							: 'Se descuenta del stock al finalizar la unidad'
					}
				>
					<input
						data-focus-key="material-open-unit.quantity"
						required
						type="number"
						min="0"
						value={openUnitForm.stock_quantity_to_decrement}
						onChange={(event) =>
							setOpenUnitForm({
								...openUnitForm,
								stock_quantity_to_decrement: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('material-open-unit.notes')}
					/>
				</Field>
			</div>
			<Field label="Observaciones">
				<textarea
					data-focus-key="material-open-unit.notes"
					value={openUnitForm.observations}
					onChange={(event) =>
						setOpenUnitForm({
							...openUnitForm,
							observations: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Package size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
