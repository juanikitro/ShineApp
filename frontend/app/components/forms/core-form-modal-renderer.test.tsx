import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

vi.mock('./CustomerForm', () => ({ CustomerForm: () => <span>Customer form</span> }))
vi.mock('./VehicleForm', () => ({ VehicleForm: () => <span>Vehicle form</span> }))
vi.mock('./QuoteForm', () => ({ QuoteForm: () => <span>Quote form</span> }))
vi.mock('./ServiceForm', () => ({ ServiceForm: () => <span>Service form</span> }))
vi.mock('./PaymentForm', () => ({ PaymentForm: () => <span>Payment form</span> }))

import { renderCoreFormModal } from './core-form-modal-renderer'

afterEach(cleanup)

const formProps = {} as never

test('renderCoreFormModal preserves each allowed modal title and form', () => {
	for (const [kind, title, formText] of [
		['customer', 'Nuevo cliente', 'Customer form'],
		['vehicle', 'Nuevo vehiculo', 'Vehicle form'],
		['quote', 'Nueva cotizacion', 'Quote form'],
		['service', 'Nuevo servicio', 'Service form'],
		['payment', 'Registrar pago', 'Payment form'],
	] as const) {
		const { unmount } = render(
			renderCoreFormModal({
				kind,
				canViewEconomy: true,
				onClose: () => {},
				customerFormProps: formProps,
				vehicleFormProps: formProps,
				quoteFormProps: formProps,
				serviceFormProps: formProps,
				paymentFormProps: formProps,
			}),
		)
		assert.ok(screen.getByRole('dialog', { name: title }))
		assert.ok(screen.getByText(formText))
		unmount()
	}
})

test('renderCoreFormModal keeps economic modals hidden without access', () => {
	render(
		renderCoreFormModal({
			kind: 'quote',
			canViewEconomy: false,
			onClose: () => {},
			customerFormProps: formProps,
			vehicleFormProps: formProps,
			quoteFormProps: formProps,
			serviceFormProps: formProps,
			paymentFormProps: formProps,
		}),
	)
	assert.equal(screen.queryByRole('dialog'), null)
})
