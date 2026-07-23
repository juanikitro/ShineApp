'use client'

import { type FormEvent } from 'react'

import { ReceiptText } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type ExpenseClassificationFormProps = {
	form: AnyRecord
	setForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	categoryOptions: SelectOption[]
	focusField: (key: string) => void
	onCancel: () => void
	submitting?: boolean
}

export function ExpenseClassificationForm({
	form,
	setForm,
	onSubmit,
	categoryOptions,
	focusField,
	onCancel,
	submitting = false,
}: ExpenseClassificationFormProps) {
	const editing = Boolean(form.originalCategory)
	const lockCategory = Boolean(form.lockCategory)
	const movementType = form.movement_type === 'income' ? 'income' : 'expense'
	const movementLabel = movementType === 'income' ? 'ingreso' : 'egreso'

	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Tipo"
				value={movementType}
				options={[
					{ value: 'income', label: 'Ingreso' },
					{ value: 'expense', label: 'Egreso' },
				]}
				disabled={editing || lockCategory}
				focusKey="expense-classification.type"
				onChange={(value) => {
					const nextType = value === 'income' ? 'income' : 'expense'
					setForm({
						...form,
						movement_type: nextType,
						category: '',
						subcategory: '',
					})
					focusField('expense-classification.category')
				}}
			/>
			<SearchSelect
				label={`Categoria de ${movementLabel}`}
				value={form.category}
				options={categoryOptions}
				placeholder={`Categoria de ${movementLabel}`}
				disabled={lockCategory}
				focusKey="expense-classification.category"
				onChange={(value) =>
					setForm({
						...form,
						category: value,
					})
				}
				onCreate={(value) =>
					setForm({
						...form,
						category: value,
					})
				}
				createLabel={(value) => `Crear categoria "${value}"`}
			/>
			<Field label="Denominacion subcategoria">
				<input
					required
					list="settings-classification-subcategory-options"
					data-focus-key="expense-classification.subcategory"
					value={form.subcategory}
					onChange={(event) =>
						setForm({
							...form,
							subcategory: event.target.value,
						})
					}
				/>
			</Field>
			<div className="info-note">
				Las combinaciones guardadas alimentan los desplegables de Caja.
				Las de egresos tambien se usan en Deudas.
			</div>
			<div className="record-actions">
				{editing ? (
					<Button type="button" variant="ghost" onClick={onCancel}>
						Cancelar
					</Button>
				) : null}
				<Button
					type="submit"
					variant="primary"
					loading={submitting}
					leadingIcon={<ReceiptText size={16} />}
				>
					{editing
						? 'Guardar cambios'
						: lockCategory
							? 'Agregar subcategoria'
							: 'Crear subcategoria'}
				</Button>
			</div>
		</form>
	)
}
