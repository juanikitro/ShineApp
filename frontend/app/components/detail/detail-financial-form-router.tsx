import { type ReactNode } from 'react'

import { type AnyRecord } from '@/lib/page-support'

import {
	renderCashMovementDetailEditor,
	renderDebtDetailEditor,
	renderDebtPaymentDetailEditor,
} from './financial-detail-edit-form-renderers'

type DetailState = {
	kind: string
	data: AnyRecord
	editData: AnyRecord
}

type CashMovementDetailEditorProps = Parameters<
	typeof renderCashMovementDetailEditor
>[0]
type DebtDetailEditorProps = Parameters<typeof renderDebtDetailEditor>[0]
type DebtPaymentDetailEditorProps = Parameters<
	typeof renderDebtPaymentDetailEditor
>[0]

type FinancialDetailFormRouterProps = {
	detail: DetailState
	onSubmit: CashMovementDetailEditorProps['onSubmit']
	onPatch: CashMovementDetailEditorProps['onPatch']
	cashIncomeCategoryValues: CashMovementDetailEditorProps['cashIncomeCategoryValues']
	cashExpenseCategoryValues: CashMovementDetailEditorProps['cashExpenseCategoryValues']
	expenseCategoryTree: CashMovementDetailEditorProps['expenseCategoryTree']
	cashMovements: CashMovementDetailEditorProps['cashMovements']
	validExpenseSubcategory: CashMovementDetailEditorProps['validExpenseSubcategory']
	onCreateExpenseSubcategory: CashMovementDetailEditorProps['onCreateExpenseSubcategory']
	supplierOptions: DebtDetailEditorProps['supplierOptions']
	suppliers: DebtDetailEditorProps['suppliers']
	debts: DebtDetailEditorProps['debts']
	debtStatusLabels: DebtDetailEditorProps['debtStatusLabels']
	debtOptions: DebtPaymentDetailEditorProps['debtOptions']
	debtPaymentMethodLabels: DebtPaymentDetailEditorProps['debtPaymentMethodLabels']
	defaultPaymentMethod: DebtPaymentDetailEditorProps['defaultPaymentMethod']
	renderActions: CashMovementDetailEditorProps['renderActions']
}

export function renderFinancialDetailFormRouter({
	detail,
	onSubmit,
	onPatch,
	cashIncomeCategoryValues,
	cashExpenseCategoryValues,
	expenseCategoryTree,
	cashMovements,
	validExpenseSubcategory,
	onCreateExpenseSubcategory,
	supplierOptions,
	suppliers,
	debts,
	debtStatusLabels,
	debtOptions,
	debtPaymentMethodLabels,
	defaultPaymentMethod,
	renderActions,
}: FinancialDetailFormRouterProps): ReactNode | undefined {
	const data = detail.editData

	if (detail.kind === 'cash-movement') {
		return renderCashMovementDetailEditor({
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
		})
	}

	if (detail.kind === 'debt') {
		return renderDebtDetailEditor({
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
		})
	}

	if (detail.kind === 'debt-payment') {
		return renderDebtPaymentDetailEditor({
			data,
			onSubmit,
			onPatch,
			debtOptions,
			debtPaymentMethodLabels,
			defaultPaymentMethod,
			renderActions,
		})
	}

	return undefined
}
