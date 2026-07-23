import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { CustomerForm } from './CustomerForm'
import { PaymentForm } from './PaymentForm'
import { QuoteForm } from './QuoteForm'
import { ServiceForm } from './ServiceForm'
import { VehicleForm } from './VehicleForm'

type CoreFormModalRendererProps = {
	kind: string | null | undefined
	canViewEconomy: boolean
	onClose: () => void
	customerFormProps: ComponentProps<typeof CustomerForm>
	vehicleFormProps: ComponentProps<typeof VehicleForm>
	quoteFormProps: ComponentProps<typeof QuoteForm>
	serviceFormProps: ComponentProps<typeof ServiceForm>
	paymentFormProps: ComponentProps<typeof PaymentForm>
}

export function renderCoreFormModal({
	kind,
	canViewEconomy,
	onClose,
	customerFormProps,
	vehicleFormProps,
	quoteFormProps,
	serviceFormProps,
	paymentFormProps,
}: CoreFormModalRendererProps): ReactNode {
	if (kind === 'customer') {
		return (
			<Modal key="form-customer" title="Nuevo cliente" onClose={onClose}>
				<CustomerForm {...customerFormProps} />
			</Modal>
		)
	}
	if (kind === 'vehicle') {
		return (
			<Modal key="form-vehicle" title="Nuevo vehiculo" onClose={onClose}>
				<VehicleForm {...vehicleFormProps} />
			</Modal>
		)
	}
	if (canViewEconomy && kind === 'quote') {
		return (
			<Modal key="form-quote" title="Nueva cotizacion" onClose={onClose}>
				<QuoteForm {...quoteFormProps} />
			</Modal>
		)
	}
	if (canViewEconomy && kind === 'service') {
		return (
			<Modal key="form-service" title="Nuevo servicio" onClose={onClose}>
				<ServiceForm {...serviceFormProps} />
			</Modal>
		)
	}
	if (canViewEconomy && kind === 'payment') {
		return (
			<Modal key="form-payment" title="Registrar pago" onClose={onClose}>
				<PaymentForm {...paymentFormProps} />
			</Modal>
		)
	}
	return null
}
