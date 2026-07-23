import { selectOptionsFromValues } from './display-text'
import {
	type AnyRecord,
	expenseSubcategoriesForCategory,
	mergeStringValues,
	uniqueValues,
} from './page-support'

export function cashMovementDetailOptions(
	data: AnyRecord,
	cashIncomeCategoryValues: string[],
	cashExpenseCategoryValues: string[],
	expenseCategoryTree: unknown,
	cashMovements: AnyRecord[],
) {
	const isExpenseMovement = data.movement_type === 'expense'
	const categoryOptions =
		data.movement_type === 'income'
			? selectOptionsFromValues(cashIncomeCategoryValues, data.category)
			: selectOptionsFromValues(cashExpenseCategoryValues, data.category)
	const subcategoryOptions = isExpenseMovement
		? selectOptionsFromValues(
				mergeStringValues(
					expenseSubcategoriesForCategory(
						expenseCategoryTree,
						data.category,
					),
					uniqueValues(
						cashMovements.filter(
							(item) =>
								String(item.category ?? '') === String(data.category ?? ''),
						),
						'subcategory',
					),
				),
				data.subcategory,
			)
		: []

	return { isExpenseMovement, categoryOptions, subcategoryOptions }
}

export function debtDetailOptions(
	data: AnyRecord,
	cashExpenseCategoryValues: string[],
	expenseCategoryTree: unknown,
	debts: AnyRecord[],
) {
	const expenseCategoryOptions = selectOptionsFromValues(
		cashExpenseCategoryValues,
		data.expense_category,
	)
	const expenseSubcategoryOptions = selectOptionsFromValues(
		mergeStringValues(
			expenseSubcategoriesForCategory(
				expenseCategoryTree,
				data.expense_category,
			),
			uniqueValues(
				debts.filter(
					(item) =>
						String(item.expense_category ?? '') ===
						String(data.expense_category ?? ''),
				),
				'expense_subcategory',
			),
		),
		data.expense_subcategory,
	)

	return { expenseCategoryOptions, expenseSubcategoryOptions }
}
