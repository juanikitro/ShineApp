'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Package } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord, money } from '@/lib/page-support'

type MaterialFormProps = {
	submitLabel: string
	materialForm: AnyRecord
	setMaterialForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
	sectors?: AnyRecord[]
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function MaterialForm({
	submitLabel,
	materialForm,
	setMaterialForm,
	onSubmit,
	focusNextOnEnter,
	sectors = [],
	submitting = false,
	fieldErrors,
}: MaterialFormProps) {
	const sectorOptions: SelectOption[] = [
		{ value: '', label: 'Sin sector' },
		...sectors
			.filter((s) => s.is_active !== false)
			.map((s) => ({ value: String(s.id), label: String(s.name ?? '') })),
	]

	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre" error={fieldErrors?.['name']}>
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
			{sectors.length > 0 && (
				<SearchSelect
					label="Sector"
					value={String(materialForm.sector ?? '')}
					options={sectorOptions}
					focusKey="material.sector"
					onChange={(value) =>
						setMaterialForm({
							...materialForm,
							sector: value ? Number(value) : null,
						})
					}
				/>
			)}
			<div className="form-row">
				<Field label="Unidad" error={fieldErrors?.['unit']}>
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
				<Field label="Categoria" error={fieldErrors?.['category']}>
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
				<Field label="SKU" error={fieldErrors?.['sku']}>
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
				<Field label="Presentacion" error={fieldErrors?.['presentation']}>
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
				<Field label="Stock" error={fieldErrors?.['stock_quantity']}>
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
				<Field label="Stock minimo" error={fieldErrors?.['minimum_stock']}>
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
