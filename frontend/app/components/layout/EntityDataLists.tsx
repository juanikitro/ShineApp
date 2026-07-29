'use client'

import { DataList } from '@/lib/page-support'

type SelectOption = { value: string }

type EntityDataListsProps = {
	customerNameValues: string[]
	customerPhoneValues: string[]
	customerEmailValues: string[]
	vehiclePlateValues: string[]
	vehicleColorValues: string[]
	serviceNameValues: string[]
	materialNameValues: string[]
	materialCategoryValues: string[]
	materialUnitValues: string[]
	supplierNameValues: string[]
	supplierLegalNameValues: string[]
	supplierCategoryValues: string[]
	supplierTaxConditionValues: string[]
	toolNameValues: string[]
	debtConceptValues: string[]
	debtCreditorValues: string[]
	cashCategoryValues: string[]
	cashIncomeCategoryValues: string[]
	cashExpenseCategoryValues: string[]
	selectedMovementSubcategoryValues: string[]
	debtExpenseSubcategoryValues: string[]
	cashSubcategoryValues: string[]
	settingsClassificationSubcategoryOptions: SelectOption[]
}

export function EntityDataLists({
	customerNameValues,
	customerPhoneValues,
	customerEmailValues,
	vehiclePlateValues,
	vehicleColorValues,
	serviceNameValues,
	materialNameValues,
	materialCategoryValues,
	materialUnitValues,
	supplierNameValues,
	supplierLegalNameValues,
	supplierCategoryValues,
	supplierTaxConditionValues,
	toolNameValues,
	debtConceptValues,
	debtCreditorValues,
	cashCategoryValues,
	cashIncomeCategoryValues,
	cashExpenseCategoryValues,
	selectedMovementSubcategoryValues,
	debtExpenseSubcategoryValues,
	cashSubcategoryValues,
	settingsClassificationSubcategoryOptions,
}: EntityDataListsProps) {
	return (
		<>
			<DataList id="customer-name-options" values={customerNameValues} />
			<DataList id="customer-phone-options" values={customerPhoneValues} />
			<DataList id="customer-email-options" values={customerEmailValues} />
			<DataList id="vehicle-plate-options" values={vehiclePlateValues} />
			<DataList id="vehicle-color-options" values={vehicleColorValues} />
			<DataList id="service-name-options" values={serviceNameValues} />
			<DataList id="material-name-options" values={materialNameValues} />
			<DataList id="material-category-options" values={materialCategoryValues} />
			<DataList id="material-unit-options" values={materialUnitValues} />
			<DataList id="supplier-name-options" values={supplierNameValues} />
			<DataList
				id="supplier-legal-name-options"
				values={supplierLegalNameValues}
			/>
			<DataList id="supplier-category-options" values={supplierCategoryValues} />
			<DataList
				id="supplier-tax-condition-options"
				values={supplierTaxConditionValues}
			/>
			<DataList id="tool-name-options" values={toolNameValues} />
			<DataList id="debt-concept-options" values={debtConceptValues} />
			<DataList id="debt-creditor-options" values={debtCreditorValues} />
			<DataList id="cash-category-options" values={cashCategoryValues} />
			<DataList
				id="cash-category-income-options"
				values={cashIncomeCategoryValues}
			/>
			<DataList
				id="cash-category-expense-options"
				values={cashExpenseCategoryValues}
			/>
			<DataList
				id="cash-subcategory-options"
				values={
					selectedMovementSubcategoryValues.length
						? selectedMovementSubcategoryValues
						: cashSubcategoryValues
				}
			/>
			<DataList
				id="debt-expense-subcategory-options"
				values={
					debtExpenseSubcategoryValues.length
						? debtExpenseSubcategoryValues
						: cashSubcategoryValues
				}
			/>
			<DataList
				id="settings-classification-subcategory-options"
				values={settingsClassificationSubcategoryOptions.map(
					(option) => option.value,
				)}
			/>
		</>
	)
}
