import assert from 'node:assert/strict'
import { cleanup, render, within } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { toolTotalValue } from '@/lib/inventory-display'
import { money } from '@/lib/page-support'

const capturedProps = vi.hoisted(() => ({
	materialConsumption: null as Record<string, any> | null,
	materialPurchase: null as Record<string, any> | null,
	tool: null as Record<string, any> | null,
}))

vi.mock('./basic-detail-edit-form-renderers', () => ({
	renderToolDetailEditForm: (props: Record<string, any>) => {
		capturedProps.tool = props
		return <span>Editor de herramienta</span>
	},
}))

vi.mock('./inventory-detail-edit-form-renderers', () => ({
	renderMaterialConsumptionDetailEditor: (props: Record<string, any>) => {
		capturedProps.materialConsumption = props
		return <span>Editor de consumo</span>
	},
	renderMaterialPurchaseDetailEditor: (props: Record<string, any>) => {
		capturedProps.materialPurchase = props
		return <span>Editor de compra</span>
	},
}))

import { renderInventoryDetailFormRouter } from './detail-inventory-form-router'

afterEach(cleanup)

function renderRouter(kind: string) {
	const editData = {
		id: 'edited',
		quantity: '2',
		unit_value: '1250',
		status: 'available',
	}
	const materialOptions = [{ value: 'material-1', label: 'Shampoo' }]
	const workOrderOptions = [{ value: 'workorder-1', label: 'Orden Uno' }]
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const result = renderInventoryDetailFormRouter({
		detail: { kind, data: { id: 'original' }, editData },
		onSubmit: () => {},
		onPatch: () => {},
		toolStatusOptions: [{ value: 'available', label: 'Disponible' }],
		toolStatusLabels: { available: 'Disponible' },
		materialOptions,
		workOrderOptions,
		renderActions,
	} as Parameters<typeof renderInventoryDetailFormRouter>[0])

	return { editData, materialOptions, renderActions, result, workOrderOptions }
}

test('inventory detail router dispatches tool and material editors without a mounted wrapper', () => {
	for (const [kind, text] of [
		['tool', 'Editor de herramienta'],
		['material-purchase', 'Editor de compra'],
		['material-consumption', 'Editor de consumo'],
	] as const) {
		const { result } = renderRouter(kind)
		const rendered = render(result)
		assert.ok(within(rendered.container).getByText(text))
		rendered.unmount()
	}
})

test('inventory detail router preserves labels, supporting options and actions', () => {
	const tool = renderRouter('tool')
	const toolProps = capturedProps.tool as Record<string, any> | null
	assert.ok(toolProps)
	assert.equal(toolProps.data, tool.editData)
	assert.equal(toolProps.statusLabel, 'Disponible')
	assert.equal(toolProps.quantityLabel, 2)
	assert.equal(toolProps.unitValueLabel, money(tool.editData.unit_value))
	assert.equal(
		toolProps.totalValueLabel,
		money(toolTotalValue(tool.editData)),
	)
	assert.equal(toolProps.actions, tool.renderActions.mock.results[0]?.value)

	const purchase = renderRouter('material-purchase')
	const purchaseProps = capturedProps.materialPurchase as Record<string, any> | null
	assert.ok(purchaseProps)
	assert.equal(purchaseProps.data, purchase.editData)
	assert.equal(purchaseProps.materialOptions, purchase.materialOptions)
	assert.equal(purchaseProps.renderActions, purchase.renderActions)

	const consumption = renderRouter('material-consumption')
	const consumptionProps = capturedProps.materialConsumption as Record<string, any> | null
	assert.ok(consumptionProps)
	assert.equal(consumptionProps.data, consumption.editData)
	assert.equal(consumptionProps.materialOptions, consumption.materialOptions)
	assert.equal(consumptionProps.workOrderOptions, consumption.workOrderOptions)
	assert.equal(consumptionProps.renderActions, consumption.renderActions)
	assert.equal(renderRouter('customer').result, undefined)
})
