import {
	validCashSubcategoryForCategory,
	validExpenseSubcategoryForCategory,
	type AnyRecord,
} from './page-support'

export function createCashSubcategoryValidators(
	incomeCategoryTree: unknown,
	expenseCategoryTree: unknown,
) {
	return {
		validExpenseSubcategoryForCategory: (
			category: string,
			subcategory: any,
		) =>
			validExpenseSubcategoryForCategory(
				expenseCategoryTree,
				category,
				subcategory,
			),
		validCashSubcategoryForCategory: (
			movementType: string,
			category: string,
			subcategory: any,
		) =>
			validCashSubcategoryForCategory(
				incomeCategoryTree,
				expenseCategoryTree,
				movementType,
				category,
				subcategory,
			),
	}
}

export function cashMovementFormWithCategory(
	form: AnyRecord,
	category: string,
	incomeCategoryTree: unknown,
	expenseCategoryTree: unknown,
) {
	return {
		...form,
		category,
		subcategory: validCashSubcategoryForCategory(
			incomeCategoryTree,
			expenseCategoryTree,
			form.movement_type,
			category,
			form.subcategory,
		),
	}
}

export function debtFormWithExpenseCategory(
	form: AnyRecord,
	expenseCategory: string,
	expenseCategoryTree: unknown,
) {
	return {
		...form,
		expense_category: expenseCategory,
		expense_subcategory: validExpenseSubcategoryForCategory(
			expenseCategoryTree,
			expenseCategory,
			form.expense_subcategory,
		),
	}
}
