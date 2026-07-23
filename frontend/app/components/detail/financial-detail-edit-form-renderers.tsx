import { type FormEvent, type ReactNode } from 'react'

import { type SelectOption } from '@/app/components/ui/SearchSelect'
import {
	cashMovementDetailOptions,
	debtDetailOptions,
} from '@/lib/detail-finance-options'
import { type AnyRecord, money } from '@/lib/page-support'

import { CashMovementDetailEditForm } from './CashMovementDetailEditForm'
import { DebtDetailEditForm } from './DebtDetailEditForm'
import { DebtPaymentDetailEditForm } from './DebtPaymentDetailEditForm'

type CashMovementDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	cashIncomeCategoryValues: string[]
	cashExpenseCategoryValues: string[]
	expenseCategoryTree: unknown
	cashMovements: AnyRecord[]
	validExpenseSubcategory: (category: string, subcategory: unknown) => string
	onCreateExpenseSubcategory: (category: string, subcategory: string) => void
	renderActions: () => ReactNode
}

export function renderCashMovementDetailEditor({
	data,
	onSubmit,
	onPatch,
	cashIncomeCategoryValues,
	cashExpenseCategoryValues,
	expenseCategoryTree,
	cashMovements,
	validExpenseSubcategory,
	onCreateExpenseSubcategory,
	renderActions,
}: CashMovementDetailEditorProps): ReactNode {
	const { isExpenseMovement, categoryOptions, subcategoryOptions } =
		cashMovementDetailOptions(
			data,
			cashIncomeCategoryValues,
			cashExpenseCategoryValues,
			expenseCategoryTree,
			cashMovements,
		)

	return (
		<CashMovementDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			typeOptions={[
				{ value: 'income', label: 'Ingreso' },
				{ value: 'expense', label: 'Egreso' },
			]}
			categoryOptions={categoryOptions}
			subcategoryOptions={subcategoryOptions}
			showSubcategory={isExpenseMovement}
			subcategoryPlaceholder={
				data.category ? 'Subcategoria' : 'Elegir categoria'
			}
			subcategoryDisabled={!data.category}
			onMovementTypeChange={(value) => onPatch({ movement_type: value })}
			onCategoryChange={(value) => {
				onPatch({
					category: value,
					subcategory: isExpenseMovement
						? validExpenseSubcategory(value, data.subcategory)
						: '',
				})
			}}
			onCreateCategory={
				isExpenseMovement
					? (value) => onPatch({ category: value, subcategory: '' })
					: undefined
			}
			onSubcategoryChange={(value) => onPatch({ subcategory: value })}
			onCreateSubcategory={(value) => {
				onCreateExpenseSubcategory(data.category, value)
				onPatch({ subcategory: value })
			}}
			onAdjustsClosedDayChange={(value) =>
				onPatch({
					adjusts_closed_day: value || null,
					category: value ? 'Ajustes' : data.category,
					subcategory: value ? 'Ajuste de cierre' : data.subcategory,
				})
			}
			actions={renderActions()}
		/>
	)
}

type DebtDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	supplierOptions: SelectOption[]
	suppliers: AnyRecord[]
	cashExpenseCategoryValues: string[]
	expenseCategoryTree: unknown
	debts: AnyRecord[]
	validExpenseSubcategory: (category: string, subcategory: unknown) => string
	onCreateExpenseSubcategory: (category: string, subcategory: string) => void
	debtStatusLabels: Record<string, string>
	renderActions: () => ReactNode
}

export function renderDebtDetailEditor({
	data,
	onSubmit,
	onPatch,
	supplierOptions,
	suppliers,
	cashExpenseCategoryValues,
	expenseCategoryTree,
	debts,
	validExpenseSubcategory,
	onCreateExpenseSubcategory,
	debtStatusLabels,
	renderActions,
}: DebtDetailEditorProps): ReactNode {
	const { expenseCategoryOptions, expenseSubcategoryOptions } =
		debtDetailOptions(
			data,
			cashExpenseCategoryValues,
			expenseCategoryTree,
			debts,
		)

	return (
		<DebtDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			supplierOptions={supplierOptions}
			expenseCategoryOptions={expenseCategoryOptions}
			expenseSubcategoryOptions={expenseSubcategoryOptions}
			expenseSubcategoryPlaceholder={
				data.expense_category ? 'Subcategoria' : 'Elegir categoria'
			}
			expenseSubcategoryDisabled={!data.expense_category}
			onSupplierChange={(value) => {
				const supplier = suppliers.find(
					(item) => String(item.id) === String(value),
				)
				onPatch({
					supplier: value || null,
					creditor: supplier?.name ?? data.creditor,
				})
			}}
			onExpenseCategoryChange={(value) =>
				onPatch({
					expense_category: value,
					expense_subcategory: validExpenseSubcategory(
						value,
						data.expense_subcategory,
					),
				})
			}
			onCreateExpenseCategory={(value) =>
				onPatch({ expense_category: value, expense_subcategory: '' })
			}
			onExpenseSubcategoryChange={(value) =>
				onPatch({ expense_subcategory: value })
			}
			onCreateExpenseSubcategory={(value) => {
				onCreateExpenseSubcategory(data.expense_category, value)
				onPatch({ expense_subcategory: value })
			}}
			paidLabel={money(data.total_paid)}
			balanceLabel={money(data.balance_due)}
			statusLabel={debtStatusLabels[data.status] ?? data.status}
			actions={renderActions()}
		/>
	)
}

type DebtPaymentDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	debtOptions: SelectOption[]
	debtPaymentMethodLabels: Record<string, string>
	defaultPaymentMethod: string
	renderActions: () => ReactNode
}

export function renderDebtPaymentDetailEditor({
	data,
	onSubmit,
	onPatch,
	debtOptions,
	debtPaymentMethodLabels,
	defaultPaymentMethod,
	renderActions,
}: DebtPaymentDetailEditorProps): ReactNode {
	return (
		<DebtPaymentDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			debtOptions={debtOptions}
			paymentMethodOptions={Object.entries(debtPaymentMethodLabels).map(
				([value, label]) => ({ value, label }),
			)}
			defaultPaymentMethod={defaultPaymentMethod}
			actions={renderActions()}
		/>
	)
}
