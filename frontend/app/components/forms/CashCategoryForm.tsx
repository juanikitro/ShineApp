'use client'

import { type FormEvent } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type CashCategoryFormProps = {
	form: AnyRecord
	setForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	focusField: (key: string) => void
	onCancel: () => void
	submitting?: boolean
}

export function CashCategoryForm({
	form,
	setForm,
	onSubmit,
	focusField,
	onCancel,
	submitting = false,
}: CashCategoryFormProps) {
	const editing = Boolean(form.originalName)
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
				disabled={editing}
				focusKey="cash-category.type"
				onChange={(value) => {
					const nextType = value === 'income' ? 'income' : 'expense'
					setForm({
						...form,
						movement_type: nextType,
					})
					focusField('cash-category.name')
				}}
			/>
			<Field label={`Nombre de la categoria de ${movementLabel}`}>
				<input
					required
					data-focus-key="cash-category.name"
					value={form.name}
					placeholder={`Categoria de ${movementLabel}`}
					onChange={(event) =>
						setForm({
							...form,
							name: event.target.value,
						})
					}
				/>
			</Field>
			<div className="info-note">
				Podes crear la categoria ahora y agregarle subcategorias mas tarde
				desde el listado.
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
					leadingIcon={<Plus size={16} />}
				>
					{editing ? 'Guardar cambios' : 'Crear categoria'}
				</Button>
			</div>
		</form>
	)
}
