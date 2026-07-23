import { type ComponentProps, type ReactNode } from 'react'

import { CustomerDetailEditForm } from './CustomerDetailEditForm'
import { SupplierDetailEditForm } from './SupplierDetailEditForm'
import { ToolDetailEditForm } from './ToolDetailEditForm'
import { VehicleDetailEditForm } from './VehicleDetailEditForm'

export function renderCustomerDetailEditForm(
	formProps: ComponentProps<typeof CustomerDetailEditForm>,
): ReactNode {
	return <CustomerDetailEditForm {...formProps} />
}

export function renderVehicleDetailEditForm(
	formProps: ComponentProps<typeof VehicleDetailEditForm>,
): ReactNode {
	return <VehicleDetailEditForm {...formProps} />
}

export function renderSupplierDetailEditForm(
	formProps: ComponentProps<typeof SupplierDetailEditForm>,
): ReactNode {
	return <SupplierDetailEditForm {...formProps} />
}

export function renderToolDetailEditForm(
	formProps: ComponentProps<typeof ToolDetailEditForm>,
): ReactNode {
	return <ToolDetailEditForm {...formProps} />
}
