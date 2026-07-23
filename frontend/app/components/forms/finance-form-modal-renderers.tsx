import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { DebtForm } from './DebtForm'
import { DebtPaymentForm } from './DebtPaymentForm'
import { FixedExpenseForm } from './FixedExpenseForm'

type DebtModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof DebtForm>
}

export function renderDebtModal({
	onClose,
	formProps,
}: DebtModalProps): ReactNode {
	return (
		<Modal key="form-debt" title="Nueva deuda" onClose={onClose}>
			<DebtForm {...formProps} />
		</Modal>
	)
}

type FixedExpenseModalProps = {
	title: string
	onClose: () => void
	formProps: ComponentProps<typeof FixedExpenseForm>
}

export function renderFixedExpenseModal({
	title,
	onClose,
	formProps,
}: FixedExpenseModalProps): ReactNode {
	return (
		<Modal key="form-fixed-expense" title={title} onClose={onClose}>
			<FixedExpenseForm {...formProps} />
		</Modal>
	)
}

type DebtPaymentModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof DebtPaymentForm>
}

export function renderDebtPaymentModal({
	onClose,
	formProps,
}: DebtPaymentModalProps): ReactNode {
	return (
		<Modal key="form-debt-payment" title="Registrar pago de deuda" onClose={onClose}>
			<DebtPaymentForm {...formProps} />
		</Modal>
	)
}
