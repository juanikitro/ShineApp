'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { Toggle } from '@/app/components/ui/Toggle'
import {
	calculatedUnitCost,
	money,
	type AnyRecord,
} from '@/lib/page-support'

type MaterialPurchaseFormProps = {
	submitLabel: string
	purchaseForm: AnyRecord
	setPurchaseForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	materialOptions: SelectOption[]
	materialClassName?: string
	onOpenMaterial: () => void
	selectedMaterial: AnyRecord | null | undefined
	focusField: (key: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
}

export function MaterialPurchaseForm({
	submitLabel,
	purchaseForm,
	setPurchaseForm,
	onSubmit,
	materialOptions,
	materialClassName,
	onOpenMaterial,
	selectedMaterial,
	focusField,
	focusNextOnEnter,
	submitting = false,
}: MaterialPurchaseFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Material"
				value={purchaseForm.material}
				options={materialOptions}
				focusKey="material-purchase.material"
				className={materialClassName}
				onAdd={onOpenMaterial}
				onChange={(value) => {
					setPurchaseForm({
						...purchaseForm,
						material: value,
					})
					focusField('material-purchase.quantity')
				}}
			/>
			<div className="form-row">
				<Field label="Cantidad">
					<input
						data-focus-key="material-purchase.quantity"
						required
						type="number"
						min="0"
						value={purchaseForm.quantity}
						onChange={(event) =>
							setPurchaseForm({
								...purchaseForm,
								quantity: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('material-purchase.total_cost')}
					/>
				</Field>
				<Field label="Costo total">
					<input
						data-focus-key="material-purchase.total_cost"
						required
						type="number"
						min="0"
						value={purchaseForm.total_cost}
						onChange={(event) =>
							setPurchaseForm({
								...purchaseForm,
								total_cost: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="info-note">
				Valor calculado por unidad:{' '}
				<strong>
					{money(
						calculatedUnitCost(purchaseForm.quantity, purchaseForm.total_cost),
					)}
				</strong>
				{selectedMaterial ? ` por ${selectedMaterial.unit}` : ''}
			</div>
			<Toggle
				checked={purchaseForm.affects_cash}
				onChange={(checked) =>
					setPurchaseForm({ ...purchaseForm, affects_cash: checked })
				}
			>
				Impacta en caja
			</Toggle>
			<Button type="submit" variant="primary" loading={submitting}>
				{submitLabel}
			</Button>
		</form>
	)
}
