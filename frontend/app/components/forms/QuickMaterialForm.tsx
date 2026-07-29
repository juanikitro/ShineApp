'use client'

import { type FormEvent } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type QuickMaterialFormProps = {
	materialForm: AnyRecord
	setMaterialForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	submitting: boolean
}

export function QuickMaterialForm({
	materialForm,
	setMaterialForm,
	onSubmit,
	submitting,
}: QuickMaterialFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					required
					list="material-name-options"
					value={materialForm.name}
					onChange={(event) =>
						setMaterialForm({
							...materialForm,
							name: event.target.value,
						})
					}
				/>
			</Field>
			<div className="form-row">
				<Field label="Unidad">
					<input
						required
						list="material-unit-options"
						value={materialForm.unit}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								unit: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Stock inicial">
					<input
						type="number"
						min="0"
						value={materialForm.stock_quantity}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								stock_quantity: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="info-note">
				El costo unitario se completa con la primera compra.
			</div>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
			>
				Crear material
			</Button>
		</form>
	)
}
