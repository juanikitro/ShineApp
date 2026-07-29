import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { EmployeeForm } from './EmployeeForm'
import { MaterialForm } from './MaterialForm'
import { SupplierForm } from './SupplierForm'
import { ToolForm } from './ToolForm'

type MaterialModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof MaterialForm>
}

export function renderMaterialModal({
	onClose,
	formProps,
}: MaterialModalProps): ReactNode {
	return (
		<Modal key="form-material" title="Nuevo material" onClose={onClose}>
			<MaterialForm {...formProps} />
		</Modal>
	)
}

type SupplierModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof SupplierForm>
}

export function renderSupplierModal({
	onClose,
	formProps,
}: SupplierModalProps): ReactNode {
	return (
		<Modal key="form-supplier" title="Nuevo proveedor" onClose={onClose}>
			<SupplierForm {...formProps} />
		</Modal>
	)
}

type ToolModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof ToolForm>
}

export function renderToolModal({
	onClose,
	formProps,
}: ToolModalProps): ReactNode {
	return (
		<Modal key="form-tool" title="Nueva herramienta" onClose={onClose}>
			<ToolForm {...formProps} />
		</Modal>
	)
}

type EmployeeModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof EmployeeForm>
}

export function renderEmployeeModal({
	onClose,
	formProps,
}: EmployeeModalProps): ReactNode {
	return (
		<Modal key="form-employee" title="Nuevo empleado" onClose={onClose}>
			<EmployeeForm {...formProps} />
		</Modal>
	)
}
