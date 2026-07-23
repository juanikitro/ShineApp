import { selectOptionsFromValues } from './display-text'
import {
	expenseSubcategoriesForCategory,
	incomeSubcategoriesForCategory,
	mergeStringValues,
	type AnyRecord,
	uniqueValues,
} from './page-support'

type CategoryTree = Record<string, string[]>

type CashCategorySelectOptionsInput = {
	cashIncomeCategoryValues: string[]
	cashExpenseCategoryValues: string[]
	movementForm: AnyRecord
	debtForm: AnyRecord
	fixedExpenseForm: AnyRecord
	expenseClassificationForm: AnyRecord
	incomeCategoryTree: CategoryTree
	expenseCategoryTree: CategoryTree
	cashMovements: AnyRecord[]
	debts: AnyRecord[]
	fixedExpenses: AnyRecord[]
}

export function cashCategorySelectOptions({
	cashIncomeCategoryValues,
	cashExpenseCategoryValues,
	movementForm,
	debtForm,
	fixedExpenseForm,
	expenseClassificationForm,
	incomeCategoryTree,
	expenseCategoryTree,
	cashMovements,
	debts,
	fixedExpenses,
}: CashCategorySelectOptionsInput) {
	const incomeCategorySelectOptions = selectOptionsFromValues(
		cashIncomeCategoryValues,
		movementForm.category,
	)
	const expenseCategorySelectOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		movementForm.category,
	)
	const debtExpenseCategorySelectOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		debtForm.expense_category,
	)
	const fixedExpenseCategorySelectOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		fixedExpenseForm.expense_category,
	)
	const settingsExpenseCategoryOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		expenseClassificationForm.category,
	)
	const settingsIncomeCategoryOptions = selectOptionsFromValues(
		cashIncomeCategoryValues,
		expenseClassificationForm.category,
	)
	const settingsClassificationCategoryOptions =
		expenseClassificationForm.movement_type === 'income'
			? settingsIncomeCategoryOptions
			: settingsExpenseCategoryOptions
	const selectedMovementSubcategoryValues = mergeStringValues(
		movementForm.movement_type === 'income'
			? incomeSubcategoriesForCategory(
					incomeCategoryTree,
					movementForm.category,
				)
			: expenseSubcategoriesForCategory(
					expenseCategoryTree,
					movementForm.category,
				),
		uniqueValues(
			cashMovements.filter(
				(item: AnyRecord) =>
					String(item.category ?? '') === String(movementForm.category ?? ''),
			),
			'subcategory',
		),
	)
	const movementSubcategorySelectOptions = selectOptionsFromValues(
		selectedMovementSubcategoryValues,
		movementForm.subcategory,
	)
	const debtExpenseSubcategoryValues = mergeStringValues(
		expenseSubcategoriesForCategory(
			expenseCategoryTree,
			debtForm.expense_category,
		),
		uniqueValues(
			debts.filter(
				(item: AnyRecord) =>
					String(item.expense_category ?? '') ===
					String(debtForm.expense_category ?? ''),
			),
			'expense_subcategory',
		),
	)
	const debtExpenseSubcategorySelectOptions = selectOptionsFromValues(
		debtExpenseSubcategoryValues,
		debtForm.expense_subcategory,
	)
	const fixedExpenseSubcategoryValues = mergeStringValues(
		expenseSubcategoriesForCategory(
			expenseCategoryTree,
			fixedExpenseForm.expense_category,
		),
		uniqueValues(
			fixedExpenses.filter(
				(item: AnyRecord) =>
					String(item.expense_category ?? '') ===
					String(fixedExpenseForm.expense_category ?? ''),
			),
			'expense_subcategory',
		),
	)
	const fixedExpenseSubcategorySelectOptions = selectOptionsFromValues(
		fixedExpenseSubcategoryValues,
		fixedExpenseForm.expense_subcategory,
	)
	const settingsExpenseSubcategoryOptions = selectOptionsFromValues(
		expenseSubcategoriesForCategory(
			expenseCategoryTree,
			expenseClassificationForm.category,
		),
		expenseClassificationForm.subcategory,
	)
	const settingsIncomeSubcategoryOptions = selectOptionsFromValues(
		incomeSubcategoriesForCategory(
			incomeCategoryTree,
			expenseClassificationForm.category,
		),
		expenseClassificationForm.subcategory,
	)
	const settingsClassificationSubcategoryOptions =
		expenseClassificationForm.movement_type === 'income'
			? settingsIncomeSubcategoryOptions
			: settingsExpenseSubcategoryOptions

	return {
		incomeCategorySelectOptions,
		expenseCategorySelectOptions,
		debtExpenseCategorySelectOptions,
		fixedExpenseCategorySelectOptions,
		settingsExpenseCategoryOptions,
		settingsIncomeCategoryOptions,
		settingsClassificationCategoryOptions,
		selectedMovementSubcategoryValues,
		movementSubcategorySelectOptions,
		debtExpenseSubcategoryValues,
		debtExpenseSubcategorySelectOptions,
		fixedExpenseSubcategoryValues,
		fixedExpenseSubcategorySelectOptions,
		settingsExpenseSubcategoryOptions,
		settingsIncomeSubcategoryOptions,
		settingsClassificationSubcategoryOptions,
	}
}
