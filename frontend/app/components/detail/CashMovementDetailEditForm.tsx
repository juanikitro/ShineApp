'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type CashMovementDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	typeOptions: SelectOption[]
	categoryOptions: SelectOption[]
	subcategoryOptions: SelectOption[]
	showSubcategory: boolean
	subcategoryPlaceholder: string
	subcategoryDisabled: boolean
	onMovementTypeChange: (value: string) => void
	onCategoryChange: (value: string) => void
	onCreateCategory?: (value: string) => void
	onSubcategoryChange: (value: string) => void
	onCreateSubcategory: (value: string) => void
	onAdjustsClosedDayChange: (value: string) => void
	actions?: ReactNode
}

export function CashMovementDetailEditForm({
	data,
	onSubmit,
	onPatch,
	typeOptions,
	categoryOptions,
	subcategoryOptions,
	showSubcategory,
	subcategoryPlaceholder,
	subcategoryDisabled,
	onMovementTypeChange,
	onCategoryChange,
	onCreateCategory,
	onSubcategoryChange,
	onCreateSubcategory,
	onAdjustsClosedDayChange,
	actions,
}: CashMovementDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Tipo"
				value={String(data.movement_type ?? '')}
				options={typeOptions}
				onChange={onMovementTypeChange}
			/>
			<div className="form-row">
				<SearchSelect
					label="Categoria"
					value={String(data.category ?? '')}
					options={categoryOptions}
					onChange={onCategoryChange}
					onCreate={onCreateCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<Field label="Importe">
					<input
						required
						type="number"
						min="0"
						value={data.amount ?? ''}
						onChange={(event) => onPatch({ amount: event.target.value })}
					/>
				</Field>
			</div>
			{showSubcategory ? (
				<SearchSelect
					label="Subcategoria"
					value={String(data.subcategory ?? '')}
					options={subcategoryOptions}
					placeholder={subcategoryPlaceholder}
					disabled={subcategoryDisabled}
					onChange={onSubcategoryChange}
					onCreate={onCreateSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			) : null}
			<Field label="Fecha">
				<input
					type="datetime-local"
					value={String(data.occurred_at ?? '').slice(0, 16)}
					onChange={(event) => onPatch({ occurred_at: event.target.value })}
				/>
			</Field>
			<Field label="Corrige cierre">
				<input
					type="date"
					value={data.adjusts_closed_day ?? ''}
					onChange={(event) => onAdjustsClosedDayChange(event.target.value)}
				/>
			</Field>
			<Field label="Detalle">
				<textarea
					value={data.description ?? ''}
					onChange={(event) => onPatch({ description: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
