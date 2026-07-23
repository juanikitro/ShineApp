import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./MaterialPurchaseForm', () => ({
	MaterialPurchaseForm: () => <span>Formulario de compra</span>,
}))
vi.mock('./MaterialOpenUnitForm', () => ({
	MaterialOpenUnitForm: () => <span>Formulario de unidad</span>,
}))
vi.mock('./HistoricalMaterialUsageForm', () => ({
	HistoricalMaterialUsageForm: () => <span>Formulario de consumo historico</span>,
}))
vi.mock('./MaterialConsumptionForm', () => ({
	MaterialConsumptionForm: ({ fields }: { fields: React.ReactNode }) => (
		<div>Formulario de consumo {fields}</div>
	),
}))

import {
	renderHistoricalMaterialUsageModal,
	renderMaterialConsumptionModal,
	renderMaterialOpenUnitModal,
	renderMaterialPurchaseModal,
} from './inventory-flow-modal-renderers'

afterEach(cleanup)

const formProps = {} as never

test('inventory flow renderers preserve each form modal', () => {
	for (const [renderModal, title, formText] of [
		[
			() => renderMaterialPurchaseModal({ onClose: () => {}, formProps }),
			'Registrar compra',
			'Formulario de compra',
		],
		[
			() => renderMaterialOpenUnitModal({ onClose: () => {}, formProps }),
			'Abrir unidad',
			'Formulario de unidad',
		],
		[
			() => renderHistoricalMaterialUsageModal({ onClose: () => {}, formProps }),
			'Registrar consumo historico',
			'Formulario de consumo historico',
		],
	] as const) {
		const { unmount } = render(renderModal())
		assert.ok(screen.getByRole('dialog', { name: title }))
		assert.ok(screen.getByText(formText))
		unmount()
	}
})

test('renderMaterialConsumptionModal lazily renders fields', () => {
	let fieldsRendered = 0
	render(
		renderMaterialConsumptionModal({
			onClose: () => {},
			onSubmit: (event) => event.preventDefault(),
			renderFields: () => {
				fieldsRendered += 1
				return <span>Campos de consumo</span>
			},
			submitLabel: 'Registrar consumo',
			submitting: false,
		}),
	)

	assert.equal(fieldsRendered, 1)
	assert.ok(screen.getByText('Campos de consumo'))
})
