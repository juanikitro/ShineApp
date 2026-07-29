'use client'

import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { QuickCustomerForm } from './QuickCustomerForm'
import { QuickMaterialForm } from './QuickMaterialForm'
import { QuickServiceForm } from './QuickServiceForm'
import { QuickVehicleForm } from './QuickVehicleForm'
import { SupplierForm } from './SupplierForm'

type QuickCreateModalLayerProps = {
	kind: string | null | undefined
	canViewEconomy: boolean
	onClose: () => void
	customerFormProps: ComponentProps<typeof QuickCustomerForm>
	vehicleFormProps: ComponentProps<typeof QuickVehicleForm>
	serviceFormProps: ComponentProps<typeof QuickServiceForm>
	materialFormProps: ComponentProps<typeof QuickMaterialForm>
	supplierFormProps: ComponentProps<typeof SupplierForm>
}

export function renderQuickCreateModal({
	kind,
	canViewEconomy,
	onClose,
	customerFormProps,
	vehicleFormProps,
	serviceFormProps,
	materialFormProps,
	supplierFormProps,
}: QuickCreateModalLayerProps): ReactNode {
	if (kind === 'customer') {
		return (
			<Modal key="quick-customer" title="Nuevo cliente" onClose={onClose}>
				<QuickCustomerForm {...customerFormProps} />
			</Modal>
		)
	}

	if (kind === 'vehicle') {
		return (
			<Modal key="quick-vehicle" title="Nuevo vehiculo" onClose={onClose}>
				<QuickVehicleForm {...vehicleFormProps} />
			</Modal>
		)
	}

	if (canViewEconomy && kind === 'service') {
		return (
			<Modal key="quick-service" title="Nuevo servicio" onClose={onClose}>
				<QuickServiceForm {...serviceFormProps} />
			</Modal>
		)
	}

	if (canViewEconomy && kind === 'material') {
		return (
			<Modal key="quick-material" title="Nuevo material" onClose={onClose}>
				<QuickMaterialForm {...materialFormProps} />
			</Modal>
		)
	}

	if (canViewEconomy && kind === 'supplier') {
		return (
			<Modal key="quick-supplier" title="Nuevo proveedor" onClose={onClose}>
				<SupplierForm {...supplierFormProps} />
			</Modal>
		)
	}

	return null
}
