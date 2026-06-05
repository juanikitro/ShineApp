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
	debtPaymentMethodLabels,
	recurringDebtIntervalOptions,
} from '@/lib/page-support'

const debtPaymentMethodSelectOptions: SelectOption[] = Object.entries(
	debtPaymentMethodLabels,
).map(([value, label]) => ({ value, label }))

type DebtFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	debtForm: AnyRecord
	setDebtForm: (form: AnyRecord) => void
	supplierOptions: SelectOption[]
	suppliers: AnyRecord[]
	debtExpenseCategorySelectOptions: SelectOption[]
	debtExpenseSubcategorySelectOptions: SelectOption[]
	updateDebtExpenseCategory: (value: string) => void
	registerDebtSubcategory: (value: string) => void
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
}

export function DebtForm({
	submitLabel,
	onSubmit,
	debtForm,
	setDebtForm,
	supplierOptions,
	suppliers,
	debtExpenseCategorySelectOptions,
	debtExpenseSubcategorySelectOptions,
	updateDebtExpenseCategory,
	registerDebtSubcategory,
	focusField,
	focusNextOnEnter,
}: DebtFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Concepto">
				<input
					data-focus-key="debt.concept"
					required
					list="debt-concept-options"
					value={debtForm.concept}
					onChange={(event) =>
						setDebtForm({
							...debtForm,
							concept: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('debt.creditor')}
				/>
			</Field>
			<Field label="Acreedor">
				<input
					data-focus-key="debt.creditor"
					list="debt-creditor-options"
					value={debtForm.creditor}
					onChange={(event) =>
						setDebtForm({
							...debtForm,
							creditor: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('debt.amount')}
				/>
			</Field>
			<SearchSelect
				label="Proveedor vinculado"
				value={debtForm.supplier ?? ''}
				options={supplierOptions}
				placeholder="Sin proveedor"
				onChange={(value) => {
					const supplier = suppliers.find(
						(item) => String(item.id) === String(value),
					)
					setDebtForm({
						...debtForm,
						supplier: value,
						creditor: supplier?.name ?? debtForm.creditor,
					})
				}}
			/>
			<div className="form-row">
				<Field label="Total deuda">
					<NumericInput
						data-focus-key="debt.amount"
						required
						prefix="$"
						value={debtForm.principal_amount}
						onChange={(raw) =>
							setDebtForm({
								...debtForm,
								principal_amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('debt.origin_date')}
					/>
				</Field>
				<Field label="Origen">
					<input
						data-focus-key="debt.origin_date"
						type="date"
						value={debtForm.origin_date}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								origin_date: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('debt.due_date')}
					/>
				</Field>
			</div>
			<Field label="Fecha limite">
				<input
					data-focus-key="debt.due_date"
					type="date"
					value={debtForm.due_date}
					onChange={(event) =>
						setDebtForm({
							...debtForm,
							due_date: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('debt.expense_category')}
				/>
			</Field>
			<div className="form-row">
				<SearchSelect
					label="Categoria del egreso"
					value={debtForm.expense_category ?? ''}
					options={debtExpenseCategorySelectOptions}
					placeholder="Categoria de egreso"
					focusKey="debt.expense_category"
					onChange={updateDebtExpenseCategory}
					onCreate={updateDebtExpenseCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<SearchSelect
					label="Subcategoria"
					value={debtForm.expense_subcategory ?? ''}
					options={debtExpenseSubcategorySelectOptions}
					placeholder={
						debtForm.expense_category ? 'Subcategoria' : 'Elegir categoria'
					}
					disabled={!debtForm.expense_category}
					focusKey="debt.expense_subcategory"
					onChange={(value) =>
						setDebtForm({
							...debtForm,
							expense_subcategory: value,
						})
					}
					onCreate={registerDebtSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			</div>
			<Field label="Notas">
				<textarea
					data-focus-key="debt.notes"
					value={debtForm.notes}
					onChange={(event) =>
						setDebtForm({
							...debtForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<div className="debt-recurrence">
				<label className="debt-recurrence-toggle">
					<input
						type="checkbox"
						checked={Boolean(debtForm.is_recurring)}
						onChange={(event) =>
							setDebtForm({
								...debtForm,
								is_recurring: event.target.checked,
							})
						}
					/>
					<span>Repetir automaticamente</span>
				</label>
				{debtForm.is_recurring ? (
					<div className="debt-recurrence-fields">
						<div className="form-row">
							<Field label="Cada">
								<NumericInput
									required
									value={String(debtForm.interval_count ?? '1')}
									onChange={(raw) =>
										setDebtForm({
											...debtForm,
											interval_count: raw,
										})
									}
								/>
							</Field>
							<SearchSelect
								label="Unidad"
								value={String(debtForm.interval_unit ?? 'months')}
								options={recurringDebtIntervalOptions}
								placeholder="Periodo"
								onChange={(value) =>
									setDebtForm({
										...debtForm,
										interval_unit: value,
									})
								}
							/>
						</div>
						<div className="form-row">
							<Field label="Vence a los (dias)">
								<NumericInput
									value={String(debtForm.due_offset_days ?? '0')}
									onChange={(raw) =>
										setDebtForm({
											...debtForm,
											due_offset_days: raw,
										})
									}
								/>
							</Field>
							<Field label="Fecha de fin (opcional)">
								<input
									type="date"
									value={String(debtForm.end_date ?? '')}
									onChange={(event) =>
										setDebtForm({
											...debtForm,
											end_date: event.target.value,
										})
									}
								/>
							</Field>
						</div>
						<Field label="Cantidad maxima de ciclos (opcional)">
							<NumericInput
								value={String(debtForm.max_cycles ?? '')}
								onChange={(raw) =>
									setDebtForm({
										...debtForm,
										max_cycles: raw,
									})
								}
							/>
						</Field>
						<label className="debt-recurrence-toggle">
							<input
								type="checkbox"
								checked={Boolean(debtForm.auto_settle)}
								onChange={(event) =>
									setDebtForm({
										...debtForm,
										auto_settle: event.target.checked,
									})
								}
							/>
							<span>Pago automatico (debito)</span>
						</label>
						{debtForm.auto_settle ? (
							<SearchSelect
								label="Metodo del debito"
								value={String(debtForm.auto_settle_method ?? 'transfer')}
								options={debtPaymentMethodSelectOptions}
								placeholder="Metodo"
								onChange={(value) =>
									setDebtForm({
										...debtForm,
										auto_settle_method: value,
									})
								}
							/>
						) : null}
						<div className="info-note">
							La fecha de origen del formulario se usa como inicio del ciclo.
							Cada generacion crea su deuda y, si activas pago automatico, queda saldada al instante.
						</div>
					</div>
				) : null}
			</div>
			<div className="info-note">
				El total crea el egreso original de la deuda. Los pagos parciales quedan trazados abajo y no generan otro egreso.
			</div>
			<button className="primary">
				<ReceiptText size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
