import assert from 'node:assert/strict'
import { cleanup, render, within } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	customer: null as Record<string, any> | null,
	material: null as Record<string, any> | null,
	service: null as Record<string, any> | null,
	supplier: null as Record<string, any> | null,
	vehicle: null as Record<string, any> | null,
}))

vi.mock('./basic-detail-edit-form-renderers', () => ({
	renderCustomerDetailEditForm: (props: Record<string, any>) => {
		capturedProps.customer = props
		return <span>Formulario cliente</span>
	},
	renderSupplierDetailEditForm: (props: Record<string, any>) => {
		capturedProps.supplier = props
		return <span>Formulario proveedor</span>
	},
	renderVehicleDetailEditForm: (props: Record<string, any>) => {
		capturedProps.vehicle = props
		return <span>Formulario vehiculo</span>
	},
}))

vi.mock('./service-detail-edit-renderer', () => ({
	renderServiceDetailEditor: (props: Record<string, any>) => {
		capturedProps.service = props
		return <span>Formulario servicio</span>
	},
}))

vi.mock('./inventory-detail-edit-form-renderers', () => ({
	renderMaterialDetailEditor: (props: Record<string, any>) => {
		capturedProps.material = props
		return <span>Formulario material</span>
	},
}))

import { renderCoreDetailFormRouter } from './detail-core-form-router'

afterEach(cleanup)

function renderRouter(kind: string, editData: Record<string, unknown> = {}) {
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const result = renderCoreDetailFormRouter({
		detail: { kind, data: { id: 'original' }, editData },
		onSubmit: () => {},
		onPatch: () => {},
		focusNextOnEnter: () => () => {},
		canViewEconomy: true,
		customerHistoryLoading: false,
		customerHistory: null,
		orderLabels: {},
		onOpenDetail: () => {},
		vehicleOptions: [{ value: '1', label: 'Ford' }],
		vehicles: [{ id: '1', brand: 'Ford', model: 'Fiesta' }],
		customerOptions: [{ value: '1', label: 'Ana' }],
		vehicleBrandValues: ['Ford'],
		onUpdateVehicleBrand: () => {},
		focusField: () => {},
		sectorOptions: [{ value: '1', label: 'Lavado' }],
		sectors: [{ id: 1, key: 'wash' }],
		serviceMaterialLines: [],
		materials: [],
		materialOptions: [],
		onAddMaterialLine: () => {},
		onRemoveMaterialLine: () => {},
		onUpdateMaterialLine: () => {},
		materialUsageSummary: () => ({
			count: 0,
			totalCost: 0,
			totalQuantity: 0,
			rows: [],
		}),
		materialOpenUnitRows: () => [],
		renderActions,
	} as Parameters<typeof renderCoreDetailFormRouter>[0])

	return { result, renderActions }
}

test('core detail router dispatches each supported kind without adding a mounted wrapper', () => {
	for (const [kind, text] of [
		['customer', 'Formulario cliente'],
		['vehicle', 'Formulario vehiculo'],
		['service', 'Formulario servicio'],
		['material', 'Formulario material'],
		['supplier', 'Formulario proveedor'],
	] as const) {
		const { result } = renderRouter(
			kind,
			kind === 'vehicle' ? { brand: 'Ford', model: 'Fiesta' } : {},
		)
		const rendered = render(result)
		assert.ok(within(rendered.container).getByText(text))
		rendered.unmount()
	}
})

test('core detail router preserves branch props and leaves other kinds to the caller', () => {
	const { renderActions } = renderRouter('vehicle', {
		brand: 'Ford',
		model: 'Fiesta',
	})
	const vehicle = capturedProps.vehicle as Record<string, any> | null
	assert.ok(vehicle)
	assert.ok(
		vehicle.brandOptions.some(
			(option: { value: string }) => option.value === 'Ford',
		),
	)
	assert.ok(
		vehicle.modelOptions.some(
			(option: { value: string }) => option.value === 'Fiesta',
		),
	)
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(renderRouter('reservation').result, undefined)
})
