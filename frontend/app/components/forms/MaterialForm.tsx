'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Package } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { type AnyRecord, money } from '@/lib/page-support'

type MaterialFormProps = {
	submitLabel: string
	materialForm: AnyRecord
	setMaterialForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
}

export function MaterialForm({
	submitLabel,
	materialForm,
	setMaterialForm,
	onSubmit,
	focusNextOnEnter,
}: MaterialFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					data-focus-key="material.name"
					required
					list="material-name-options"
					value={materialForm.name}
					onChange={(event) =>
						setMaterialForm({
							...materialForm,
							name: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('material.unit')}
				/>
			</Field>
			<div className="form-row">
				<Field label="Unidad">
					<input
						data-focus-key="material.unit"
						required
						list="material-unit-options"
						value={materialForm.unit}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								unit: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('material.stock')}
					/>
				</Field>
				<Field label="Categoria">
					<input
						list="material-category-options"
						value={materialForm.category}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								category: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="SKU">
					<input
						value={materialForm.sku}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								sku: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Presentacion">
					<input
						value={materialForm.presentation}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								presentation: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Stock">
					<input
						data-focus-key="material.stock"
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
				<Field label="Stock minimo">
					<input
						type="number"
						min="0"
						value={materialForm.minimum_stock}
						onChange={(event) =>
							setMaterialForm({
								...materialForm,
								minimum_stock: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="info-note">
				Costo unitario automatico por ultima compra:{' '}
				<strong>{money(materialForm.estimated_unit_cost)}</strong>
			</div>
			<button className="primary">
				<Package size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
