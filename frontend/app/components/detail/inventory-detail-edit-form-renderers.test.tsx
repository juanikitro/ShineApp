import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { calculatedUnitCost, money } from '@/lib/page-support'

const capturedProps = vi.hoisted(() => ({
	consumption: null as Record<string, any> | null,
	material: null as Record<string, any> | null,
	materialHistory: null as Record<string, any> | null,
	purchase: null as Record<string, any> | null,
}))

vi.mock('./MaterialPurchaseDetailEditForm', () => ({
	MaterialPurchaseDetailEditForm: (props: Record<string, any>) => {
		capturedProps.purchase = props
		return <span>Editor de compra</span>
	},
}))

vi.mock('./MaterialConsumptionDetailEditForm', () => ({
	MaterialConsumptionDetailEditForm: (props: Record<string, any>) => {
		capturedProps.consumption = props
		return <span>Editor de consumo</span>
	},
}))

vi.mock('./MaterialDetailEditForm', () => ({
	MaterialDetailEditForm: (props: Record<string, any>) => {
		capturedProps.material = props
		return (
			<>
				<span>Editor de material</span>
				{props.history}
			</>
		)
	},
}))

vi.mock('./MaterialDetailHistory', () => ({
	MaterialDetailHistory: (props: Record<string, any>) => {
		capturedProps.materialHistory = props
		return <span>Historial de material</span>
	},
}))

import {
	renderMaterialConsumptionDetailEditor,
	renderMaterialDetailEditor,
	renderMaterialPurchaseDetailEditor,
} from './inventory-detail-edit-form-renderers'

afterEach(cleanup)

test('material purchase detail renderer preserves references and calculated unit cost', () => {
	const data = { quantity: '4', total_cost: '100' }
	const onSubmit = vi.fn()
	const onPatch = vi.fn()
	const materialOptions = [{ value: '1', label: 'Shampoo' }]
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)

	render(
		renderMaterialPurchaseDetailEditor({
			data,
			onSubmit,
			onPatch,
			materialOptions,
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de compra'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.purchase?.data, data)
	assert.equal(capturedProps.purchase?.onSubmit, onSubmit)
	assert.equal(capturedProps.purchase?.onPatch, onPatch)
	assert.equal(capturedProps.purchase?.materialOptions, materialOptions)
	assert.equal(
		capturedProps.purchase?.unitCost,
		money(calculatedUnitCost(data.quantity, data.total_cost)),
	)
})

test('material consumption detail renderer preserves open-unit and direct-stock branches', () => {
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const baseProps = {
		onSubmit: () => {},
		onPatch: () => {},
		workOrderOptions: [{ value: '1', label: 'Trabajo Uno' }],
		materialOptions: [{ value: '2', label: 'Shampoo' }],
		renderActions,
	}

	const { unmount } = render(
		renderMaterialConsumptionDetailEditor({
			...baseProps,
			data: { open_unit: 2 },
		}),
	)
	assert.equal(capturedProps.consumption?.openUnitConsumption, true)
	unmount()

	render(
		renderMaterialConsumptionDetailEditor({
			...baseProps,
			data: { open_unit: null },
		}),
	)
	assert.equal(capturedProps.consumption?.openUnitConsumption, false)
	assert.equal(renderActions.mock.calls.length, 2)
})

test('material detail renderer preserves history sources, actions and linked record targets', () => {
	const data = { id: '1', unit: 'ml', stock_quantity: '4' }
	const usage = { count: 1, totalCost: 100, totalQuantity: 2, rows: [] }
	const openUnits = [{ id: 'unit-1' }]
	const materialUsageSummary = vi.fn(() => usage)
	const materialOpenUnitRows = vi.fn(() => openUnits)
	const onOpenDetail = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)

	render(
		renderMaterialDetailEditor({
			data,
			onSubmit: () => {},
			onPatch: () => {},
			sectorOptions: [{ value: '1', label: 'Lavado' }],
			materialUsageSummary,
			materialOpenUnitRows,
			onOpenDetail,
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de material'))
	assert.ok(screen.getByText('Historial de material'))
	assert.deepEqual(materialUsageSummary.mock.calls, [[data]])
	assert.deepEqual(materialOpenUnitRows.mock.calls, [[data]])
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.materialHistory?.material, data)
	assert.equal(capturedProps.materialHistory?.usage, usage)
	assert.equal(capturedProps.materialHistory?.openUnits, openUnits)
	capturedProps.materialHistory?.onOpenUsage({ id: 'usage-1' })
	capturedProps.materialHistory?.onOpenOpenUnit({ id: 'unit-1' })
	assert.deepEqual(onOpenDetail.mock.calls, [
		['Consumo de material', { id: 'usage-1' }],
		['Unidad abierta', { id: 'unit-1' }],
	])
})
