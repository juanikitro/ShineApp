'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type DebtDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	supplierOptions: SelectOption[]
	expenseCategoryOptions: SelectOption[]
	expenseSubcategoryOptions: SelectOption[]
	expenseSubcategoryPlaceholder: string
	expenseSubcategoryDisabled: boolean
	onSupplierChange: (value: string) => void
	onExpenseCategoryChange: (value: string) => void
	onCreateExpenseCategory: (value: string) => void
	onExpenseSubcategoryChange: (value: string) => void
	onCreateExpenseSubcategory: (value: string) => void
	paidLabel: ReactNode
	balanceLabel: ReactNode
	statusLabel: ReactNode
	actions?: ReactNode
}

export function DebtDetailEditForm({
	data,
	onSubmit,
	onPatch,
	supplierOptions,
	expenseCategoryOptions,
	expenseSubcategoryOptions,
	expenseSubcategoryPlaceholder,
	expenseSubcategoryDisabled,
	onSupplierChange,
	onExpenseCategoryChange,
	onCreateExpenseCategory,
	onExpenseSubcategoryChange,
	onCreateExpenseSubcategory,
	paidLabel,
	balanceLabel,
	statusLabel,
	actions,
}: DebtDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Concepto">
				<input
					required
					list="debt-concept-options"
					value={data.concept ?? ''}
					onChange={(event) => onPatch({ concept: event.target.value })}
				/>
			</Field>
			<Field label="Acreedor">
				<input
					list="debt-creditor-options"
					value={data.creditor ?? ''}
					onChange={(event) => onPatch({ creditor: event.target.value })}
				/>
			</Field>
			<div className="form-row">
				<Field label="Total deuda">
					<input
						required
						type="number"
						min="0"
						value={data.principal_amount ?? ''}
						onChange={(event) =>
							onPatch({ principal_amount: event.target.value })
						}
					/>
				</Field>
				<Field label="Origen">
					<input
						type="date"
						value={data.origin_date ?? ''}
						onChange={(event) => onPatch({ origin_date: event.target.value })}
					/>
				</Field>
			</div>
			<Field label="Fecha limite">
				<input
					type="date"
					value={data.due_date ?? ''}
					onChange={(event) => onPatch({ due_date: event.target.value })}
				/>
			</Field>
			<SearchSelect
				label="Proveedor vinculado"
				value={String(data.supplier ?? '')}
				options={supplierOptions}
				placeholder="Sin proveedor"
				onChange={onSupplierChange}
			/>
			<div className="form-row">
				<SearchSelect
					label="Categoria del egreso"
					value={String(data.expense_category ?? '')}
					options={expenseCategoryOptions}
					placeholder="Categoria de egreso"
					onChange={onExpenseCategoryChange}
					onCreate={onCreateExpenseCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<SearchSelect
					label="Subcategoria"
					value={String(data.expense_subcategory ?? '')}
					options={expenseSubcategoryOptions}
					placeholder={expenseSubcategoryPlaceholder}
					disabled={expenseSubcategoryDisabled}
					onChange={onExpenseSubcategoryChange}
					onCreate={onCreateExpenseSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			</div>
			<div className="material-summary">
				<div className="material-kpi">
					<span>Pagado</span>
					<strong>{paidLabel}</strong>
				</div>
				<div className="material-kpi">
					<span>Saldo</span>
					<strong>{balanceLabel}</strong>
				</div>
				<div className="material-kpi">
					<span>Estado</span>
					<strong>{statusLabel}</strong>
				</div>
			</div>
			<Field label="Notas">
				<textarea
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
