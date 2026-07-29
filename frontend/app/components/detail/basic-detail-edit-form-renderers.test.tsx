import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { type ReactNode } from 'react'

const capturedProps = vi.hoisted(() => ({
	customer: null as Record<string, unknown> | null,
	supplier: null as Record<string, unknown> | null,
	tool: null as Record<string, unknown> | null,
	vehicle: null as Record<string, unknown> | null,
}))

vi.mock('./CustomerDetailEditForm', () => ({
	CustomerDetailEditForm: (props: {
		data: Record<string, unknown>
		actions?: ReactNode
	}) => {
		capturedProps.customer = props
		return <span>Editor de cliente: {String(props.data.name)}</span>
	},
}))

vi.mock('./VehicleDetailEditForm', () => ({
	VehicleDetailEditForm: (props: {
		data: Record<string, unknown>
		actions?: ReactNode
	}) => {
		capturedProps.vehicle = props
		return <span>Editor de vehiculo: {String(props.data.brand)}</span>
	},
}))

vi.mock('./SupplierDetailEditForm', () => ({
	SupplierDetailEditForm: (props: {
		data: Record<string, unknown>
		actions?: ReactNode
	}) => {
		capturedProps.supplier = props
		return <span>Editor de proveedor: {String(props.data.name)}</span>
	},
}))

vi.mock('./ToolDetailEditForm', () => ({
	ToolDetailEditForm: (props: {
		data: Record<string, unknown>
		actions?: ReactNode
	}) => {
		capturedProps.tool = props
		return <span>Editor de herramienta: {String(props.data.name)}</span>
	},
}))

import { CustomerDetailEditForm } from './CustomerDetailEditForm'
import { SupplierDetailEditForm } from './SupplierDetailEditForm'
import { ToolDetailEditForm } from './ToolDetailEditForm'
import { VehicleDetailEditForm } from './VehicleDetailEditForm'
import {
	renderCustomerDetailEditForm,
	renderSupplierDetailEditForm,
	renderToolDetailEditForm,
	renderVehicleDetailEditForm,
} from './basic-detail-edit-form-renderers'

afterEach(cleanup)

test('basic detail renderers preserve the customer, vehicle, supplier and tool form props', () => {
	const customerData = { name: 'Ana' }
	const supplierData = { name: 'Proveedor Uno' }
	const toolData = { name: 'Aspiradora' }
	const vehicleData = { brand: 'Ford' }
	const customerSubmit = () => {}
	const supplierSubmit = () => {}
	const toolSubmit = () => {}
	const vehicleSubmit = () => {}
	const customerActions = <button type="submit">Guardar cliente</button>
	const supplierActions = <button type="submit">Guardar proveedor</button>
	const toolActions = <button type="submit">Guardar herramienta</button>
	const vehicleActions = <button type="submit">Guardar vehiculo</button>
	const customerFormProps = {
		data: customerData,
		onSubmit: customerSubmit,
		onPatch: () => {},
		focusNextOnEnter: () => () => {},
		canViewEconomy: false,
		customerHistoryLoading: false,
		customerHistory: null,
		orderLabels: {},
		onOpenOrder: () => {},
		actions: customerActions,
	} as Parameters<typeof CustomerDetailEditForm>[0]
	const vehicleFormProps = {
		data: vehicleData,
		onSubmit: vehicleSubmit,
		onPatch: () => {},
		customerOptions: [],
		brandOptions: [],
		modelOptions: [],
		onUpdateBrand: () => {},
		focusField: () => {},
		focusNextOnEnter: () => () => {},
		actions: vehicleActions,
	} as Parameters<typeof VehicleDetailEditForm>[0]
	const supplierFormProps = {
		data: supplierData,
		onSubmit: supplierSubmit,
		onPatch: () => {},
		actions: supplierActions,
	} as Parameters<typeof SupplierDetailEditForm>[0]
	const toolFormProps = {
		data: toolData,
		onSubmit: toolSubmit,
		onPatch: () => {},
		statusOptions: [],
		statusLabel: 'En uso',
		quantityLabel: '1',
		unitValueLabel: '$ 100',
		totalValueLabel: '$ 100',
		actions: toolActions,
	} as Parameters<typeof ToolDetailEditForm>[0]

	const { unmount } = render(renderCustomerDetailEditForm(customerFormProps))
	assert.ok(screen.getByText('Editor de cliente: Ana'))
	assert.equal(capturedProps.customer?.data, customerData)
	assert.equal(capturedProps.customer?.onSubmit, customerSubmit)
	assert.equal(capturedProps.customer?.actions, customerActions)
	unmount()

	const { unmount: unmountVehicle } = render(
		renderVehicleDetailEditForm(vehicleFormProps),
	)
	assert.ok(screen.getByText('Editor de vehiculo: Ford'))
	assert.equal(capturedProps.vehicle?.data, vehicleData)
	assert.equal(capturedProps.vehicle?.onSubmit, vehicleSubmit)
	assert.equal(capturedProps.vehicle?.actions, vehicleActions)
	unmountVehicle()

	const { unmount: unmountSupplier } = render(
		renderSupplierDetailEditForm(supplierFormProps),
	)
	assert.ok(screen.getByText('Editor de proveedor: Proveedor Uno'))
	assert.equal(capturedProps.supplier?.data, supplierData)
	assert.equal(capturedProps.supplier?.onSubmit, supplierSubmit)
	assert.equal(capturedProps.supplier?.actions, supplierActions)
	unmountSupplier()

	render(renderToolDetailEditForm(toolFormProps))
	assert.ok(screen.getByText('Editor de herramienta: Aspiradora'))
	assert.equal(capturedProps.tool?.data, toolData)
	assert.equal(capturedProps.tool?.onSubmit, toolSubmit)
	assert.equal(capturedProps.tool?.actions, toolActions)
})
