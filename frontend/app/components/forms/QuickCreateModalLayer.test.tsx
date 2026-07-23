import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { renderQuickCreateModal } from './QuickCreateModalLayer'

afterEach(cleanup)

function renderLayer(overrides = {}) {
	const props = {
		kind: 'customer' as const,
		canViewEconomy: true,
		onClose: () => {},
		customerFormProps: {
			customerForm: {
				name: '',
				phone: '',
				email: '',
				tax_id: '',
				billing_address: '',
				birthday_day: '',
				birthday_month: '',
			},
			setCustomerForm: () => {},
			onSubmit: (event: React.FormEvent<HTMLFormElement>) =>
				event.preventDefault(),
			submitting: false,
		},
		vehicleFormProps: {
			vehicleForm: {
				customer: '',
				vehicle_type: 'auto',
				brand: '',
				model: '',
				color: '',
				license_plate: '',
			},
			setVehicleForm: () => {},
			onSubmit: (event: React.FormEvent<HTMLFormElement>) =>
				event.preventDefault(),
			customerOptions: [],
			vehicleBrandSelectOptions: [],
			vehicleModelSelectOptions: [],
			customerClassName: '',
			onAddCustomer: () => {},
			updateVehicleBrand: () => {},
			submitting: false,
		},
		serviceFormProps: {
			serviceForm: {
				name: '',
				icon: '',
				sector: null,
				base_price: '',
				estimated_duration_minutes: '60',
			},
			setServiceForm: () => {},
			onSubmit: (event: React.FormEvent<HTMLFormElement>) =>
				event.preventDefault(),
			sectorOptions: [],
			onSectorChange: () => {},
			onBasePriceChange: () => {},
			submitting: false,
		},
		materialFormProps: {
			materialForm: { name: '', unit: 'ml', stock_quantity: '0' },
			setMaterialForm: () => {},
			onSubmit: (event: React.FormEvent<HTMLFormElement>) =>
				event.preventDefault(),
			submitting: false,
		},
		supplierFormProps: {
			submitLabel: 'Crear proveedor',
			supplierForm: {
				name: '',
				legal_name: '',
				category: '',
				tax_condition: '',
				contact_name: '',
				phone: '',
				email: '',
				tax_id: '',
				website: '',
				address: '',
				notes: '',
			},
			setSupplierForm: () => {},
			onSubmit: (event: React.FormEvent<HTMLFormElement>) =>
				event.preventDefault(),
			focusNextOnEnter: () => () => {},
			submitting: false,
			fieldErrors: {},
		},
		...overrides,
	} as Parameters<typeof renderQuickCreateModal>[0]

	return { ...render(renderQuickCreateModal(props)), props }
}

test('QuickCreateModalLayer preserves every allowed quick-create dialog', () => {
	const { rerender, props } = renderLayer()

	assert.ok(screen.getByRole('dialog', { name: 'Nuevo cliente' }))
	assert.ok(screen.getByRole('button', { name: 'Crear cliente' }))
	for (const [kind, title, submitLabel] of [
		['vehicle', 'Nuevo vehiculo', 'Crear vehiculo'],
		['service', 'Nuevo servicio', 'Crear servicio'],
		['material', 'Nuevo material', 'Crear material'],
		['supplier', 'Nuevo proveedor', 'Crear proveedor'],
	] as const) {
		rerender(renderQuickCreateModal({ ...props, kind }))
		assert.ok(screen.getByRole('dialog', { name: title }))
		assert.ok(screen.getByRole('button', { name: submitLabel }))
	}
})

test('QuickCreateModalLayer keeps economic quick creates hidden without access', () => {
	renderLayer({ kind: 'service', canViewEconomy: false })

	assert.equal(screen.queryByRole('dialog'), null)
})
