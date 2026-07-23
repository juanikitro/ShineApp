import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { QuoteReservationForm } from './QuoteReservationForm'
import { ReservationForm } from './ReservationForm'

type QuoteReservationModalProps = {
	quoteId: unknown
	onClose: () => void
	formProps: ComponentProps<typeof QuoteReservationForm>
}

export function renderQuoteReservationModal({
	quoteId,
	onClose,
	formProps,
}: QuoteReservationModalProps): ReactNode {
	return (
		<Modal
			key={`reservation-from-quote:${quoteId}`}
			title={`Crear reserva desde cotizacion #${quoteId}`}
			onClose={onClose}
		>
			<QuoteReservationForm {...formProps} />
		</Modal>
	)
}

type QuickReservationModalProps = {
	day: string
	title: string
	onClose: () => void
	formProps: ComponentProps<typeof ReservationForm>
}

export function renderQuickReservationModal({
	day,
	title,
	onClose,
	formProps,
}: QuickReservationModalProps): ReactNode {
	return (
		<Modal key={`quick-reservation:${day}`} title={title} onClose={onClose}>
			<ReservationForm {...formProps} />
		</Modal>
	)
}
