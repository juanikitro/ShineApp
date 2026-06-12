'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { CalendarClock } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import {
	type AnyRecord,
	debtPaymentMethodLabels,
	fixedExpenseIntervalOptions,
} from '@/lib/page-support'

const paymentMethodSelectOptions: SelectOption[] = Object.entries(
	debtPaymentMethodLabels,
).map(([value, label]) => ({ value, label }))

type FixedExpenseFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	fixedExpenseForm: AnyRecord
	setFixedExpenseForm: (form: AnyRecord) => void
	supplierOptions: SelectOption[]
	suppliers: AnyRecord[]
	categorySelectOptions: SelectOption[]
	subcategorySelectOptions: SelectOption[]
	updateCategory: (value: string) => void
	registerSubcategory: (value: string) => void
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function FixedExpenseForm({
	submitLabel,
	onSubmit,
	fixedExpenseForm,
	setFixedExpenseForm,
	supplierOptions,
	suppliers,
	categorySelectOptions,
	subcategorySelectOptions,
	updateCategory,
	registerSubcategory,
	focusField,
	focusNextOnEnter,
	submitting = false,
	fieldErrors,
}: FixedExpenseFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Concepto" error={fieldErrors?.['concept']}>
				<input
					data-focus-key="fixed-expense.concept"
					required
					placeholder="Internet, Alquiler, Expensas..."
					value={fixedExpenseForm.concept}
					onChange={(event) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							concept: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('fixed-expense.amount')}
				/>
			</Field>
			<SearchSelect
				label="Proveedor vinculado"
				value={fixedExpenseForm.supplier ?? ''}
				options={supplierOptions}
				placeholder="Sin proveedor"
				onChange={(value) => {
					const supplier = suppliers.find(
						(item) => String(item.id) === String(value),
					)
					setFixedExpenseForm({
						...fixedExpenseForm,
						supplier: value,
						concept: fixedExpenseForm.concept || supplier?.name || '',
					})
				}}
			/>
			<div className="form-row">
				<Field label="Monto del periodo" error={fieldErrors?.['amount']}>
					<NumericInput
						data-focus-key="fixed-expense.amount"
						required
						prefix="$"
						value={fixedExpenseForm.amount}
						onChange={(raw) =>
							setFixedExpenseForm({
								...fixedExpenseForm,
								amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('fixed-expense.start_date')}
					/>
				</Field>
				<Field label="Inicio" error={fieldErrors?.['start_date']}>
					<input
						data-focus-key="fixed-expense.start_date"
						type="date"
						value={fixedExpenseForm.start_date}
						onChange={(event) =>
							setFixedExpenseForm({
								...fixedExpenseForm,
								start_date: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Cada" error={fieldErrors?.['interval_count']}>
					<NumericInput
						required
						value={String(fixedExpenseForm.interval_count ?? '1')}
						onChange={(raw) =>
							setFixedExpenseForm({
								...fixedExpenseForm,
								interval_count: raw,
							})
						}
					/>
				</Field>
				<SearchSelect
					label="Periodo"
					value={String(fixedExpenseForm.interval_unit ?? 'months')}
					options={fixedExpenseIntervalOptions}
					placeholder="Periodo"
					onChange={(value) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							interval_unit: value,
						})
					}
				/>
			</div>
			<div className="form-row">
				<SearchSelect
					label="Categoria del egreso"
					value={fixedExpenseForm.expense_category ?? ''}
					options={categorySelectOptions}
					placeholder="Categoria de egreso"
					focusKey="fixed-expense.expense_category"
					onChange={updateCategory}
					onCreate={updateCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<SearchSelect
					label="Subcategoria"
					value={fixedExpenseForm.expense_subcategory ?? ''}
					options={subcategorySelectOptions}
					placeholder={
						fixedExpenseForm.expense_category
							? 'Subcategoria'
							: 'Elegir categoria'
					}
					disabled={!fixedExpenseForm.expense_category}
					focusKey="fixed-expense.expense_subcategory"
					onChange={(value) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							expense_subcategory: value,
						})
					}
					onCreate={registerSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Vence a los (dias)" error={fieldErrors?.['due_offset_days']}>
					<NumericInput
						value={String(fixedExpenseForm.due_offset_days ?? '0')}
						onChange={(raw) =>
							setFixedExpenseForm({
								...fixedExpenseForm,
								due_offset_days: raw,
							})
						}
					/>
				</Field>
				<Field label="Fin (opcional)" error={fieldErrors?.['end_date']}>
					<input
						type="date"
						value={String(fixedExpenseForm.end_date ?? '')}
						onChange={(event) =>
							setFixedExpenseForm({
								...fixedExpenseForm,
								end_date: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<Field label="Cantidad maxima de periodos (opcional)" error={fieldErrors?.['max_cycles']}>
				<NumericInput
					value={String(fixedExpenseForm.max_cycles ?? '')}
					onChange={(raw) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							max_cycles: raw,
						})
					}
				/>
			</Field>
			<Field label="Notas" error={fieldErrors?.['notes']}>
				<textarea
					data-focus-key="fixed-expense.notes"
					value={fixedExpenseForm.notes}
					onChange={(event) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<label className="fixed-expense-toggle">
				<input
					type="checkbox"
					checked={Boolean(fixedExpenseForm.auto_pay)}
					onChange={(event) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							auto_pay: event.target.checked,
						})
					}
				/>
				<span>Pago automatico (debito)</span>
			</label>
			{fixedExpenseForm.auto_pay ? (
				<SearchSelect
					label="Metodo del pago"
					value={String(fixedExpenseForm.payment_method ?? 'transfer')}
					options={paymentMethodSelectOptions}
					placeholder="Metodo"
					onChange={(value) =>
						setFixedExpenseForm({
							...fixedExpenseForm,
							payment_method: value,
						})
					}
				/>
			) : null}
			<div className="info-note">
				Cada periodo genera un egreso en la caja. Con pago automatico se registra
				saldado al instante; sin el, queda como gasto fijo por pagar hasta que lo
				registres.
			</div>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<CalendarClock size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
