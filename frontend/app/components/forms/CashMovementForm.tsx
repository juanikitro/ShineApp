'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { ReceiptText } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import {
	type AnyRecord,
	formatDateLabel,
	defaultCashCategory,
	DEFAULT_EXPENSE_CATEGORY,
	DEFAULT_INCOME_CATEGORY,
} from '@/lib/page-support'

type CashMovementFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	movementForm: AnyRecord
	setMovementForm: (form: AnyRecord) => void
	incomeCategorySelectOptions: SelectOption[]
	expenseCategorySelectOptions: SelectOption[]
	movementSubcategorySelectOptions: SelectOption[]
	updateMovementCashCategory: (value: string) => void
	registerMovementSubcategory: (value: string) => void
	validCashSubcategoryForCategory: (
		movementType: string,
		category: string,
		subcategory: unknown,
	) => string
	focusField: (key: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
}

export function CashMovementForm({
	submitLabel,
	onSubmit,
	movementForm,
	setMovementForm,
	incomeCategorySelectOptions,
	expenseCategorySelectOptions,
	movementSubcategorySelectOptions,
	updateMovementCashCategory,
	registerMovementSubcategory,
	validCashSubcategoryForCategory,
	focusField,
	focusNextOnEnter,
}: CashMovementFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Tipo"
				value={movementForm.movement_type}
				options={[
					{ value: 'expense', label: 'Egreso' },
					{ value: 'income', label: 'Ingreso' },
				]}
				focusKey="cash-movement.type"
				onChange={(value) => {
					const movementType = value || 'expense'
					const shouldResetCategory = [
						'',
						DEFAULT_EXPENSE_CATEGORY,
						DEFAULT_INCOME_CATEGORY,
					].includes(movementForm.category ?? '')
					const nextCategory = shouldResetCategory
						? defaultCashCategory(movementType)
						: movementForm.category
					setMovementForm({
						...movementForm,
						movement_type: movementType,
						category: nextCategory,
						subcategory: validCashSubcategoryForCategory(
							movementType,
							nextCategory,
							movementForm.subcategory,
						),
					})
					focusField('cash-movement.category')
				}}
			/>
			<div className="form-row">
				<SearchSelect
					label="Categoria"
					value={movementForm.category}
					options={
						movementForm.movement_type === 'income'
							? incomeCategorySelectOptions
							: expenseCategorySelectOptions
					}
					placeholder={
						movementForm.movement_type === 'income'
							? 'Categoria de ingreso'
							: 'Categoria de egreso'
					}
					focusKey="cash-movement.category"
					onChange={updateMovementCashCategory}
					onCreate={updateMovementCashCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<SearchSelect
					label="Subcategoria"
					value={movementForm.subcategory ?? ''}
					options={movementSubcategorySelectOptions}
					placeholder={
						movementForm.category ? 'Subcategoria' : 'Elegir categoria'
					}
					disabled={!movementForm.category}
					focusKey="cash-movement.subcategory"
					onChange={(value) =>
						setMovementForm({
							...movementForm,
							subcategory: value,
						})
					}
					onCreate={registerMovementSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Importe">
					<NumericInput
						data-focus-key="cash-movement.amount"
						required
						prefix="$"
						value={movementForm.amount}
						onChange={(raw) =>
							setMovementForm({
								...movementForm,
								amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
					/>
				</Field>
				<Field label="Fecha que impacta">
					<input
						data-focus-key="cash-movement.occurred_at"
						required
						type="datetime-local"
						value={movementForm.occurred_at}
						onChange={(event) =>
							setMovementForm({
								...movementForm,
								occurred_at: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
					/>
				</Field>
				<Field label="Corrige cierre">
					<input
						type="date"
						value={movementForm.adjusts_closed_day ?? ''}
						onChange={(event) =>
							setMovementForm({
								...movementForm,
								adjusts_closed_day: event.target.value,
								category: event.target.value
									? 'Ajustes'
									: movementForm.category,
								subcategory: event.target.value
									? 'Ajuste de cierre'
									: movementForm.subcategory,
							})
						}
					/>
				</Field>
			</div>
			{movementForm.adjusts_closed_day ? (
				<div className="info-note">
					El ajuste impacta hoy y deja trazado que corrige el cierre de{' '}
					<strong>{formatDateLabel(movementForm.adjusts_closed_day)}</strong>.
				</div>
			) : null}
			<Field label="Detalle">
				<textarea
					data-focus-key="cash-movement.description"
					value={movementForm.description}
					onChange={(event) =>
						setMovementForm({
							...movementForm,
							description: event.target.value,
						})
					}
				/>
			</Field>
			<button className="primary">
				<ReceiptText size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
