import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./MaterialForm', () => ({
	MaterialForm: () => <span>Formulario de material</span>,
}))
vi.mock('./SupplierForm', () => ({
	SupplierForm: () => <span>Formulario de proveedor</span>,
}))
vi.mock('./ToolForm', () => ({ ToolForm: () => <span>Formulario de herramienta</span> }))
vi.mock('./EmployeeForm', () => ({
	EmployeeForm: () => <span>Formulario de empleado</span>,
}))

import {
	renderEmployeeModal,
	renderMaterialModal,
	renderSupplierModal,
	renderToolModal,
} from './administrative-form-modal-renderers'

afterEach(cleanup)

const formProps = {} as never

test('administrative form modal renderers preserve all modal branches', () => {
	for (const [renderModal, title, formText] of [
		[
			() => renderMaterialModal({ onClose: () => {}, formProps }),
			'Nuevo material',
			'Formulario de material',
		],
		[
			() => renderSupplierModal({ onClose: () => {}, formProps }),
			'Nuevo proveedor',
			'Formulario de proveedor',
		],
		[
			() => renderToolModal({ onClose: () => {}, formProps }),
			'Nueva herramienta',
			'Formulario de herramienta',
		],
		[
			() => renderEmployeeModal({ onClose: () => {}, formProps }),
			'Nuevo empleado',
			'Formulario de empleado',
		],
	] as const) {
		const { unmount } = render(renderModal())
		assert.ok(screen.getByRole('dialog', { name: title }))
		assert.ok(screen.getByText(formText))
		unmount()
	}
})
