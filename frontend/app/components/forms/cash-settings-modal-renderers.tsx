import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { CashCategoryForm } from './CashCategoryForm'
import { ExpenseClassificationForm } from './ExpenseClassificationForm'

type ExpenseClassificationModalProps = {
	title: string
	onClose: () => void
	onReset: () => void
	formProps: Omit<ComponentProps<typeof ExpenseClassificationForm>, 'onCancel'>
}

export function renderExpenseClassificationModal({
	title,
	onClose,
	onReset,
	formProps,
}: ExpenseClassificationModalProps): ReactNode {
	function close() {
		onReset()
		onClose()
	}

	return (
		<Modal
			key="form-expense-classification"
			title={title}
			onClose={close}
		>
			<ExpenseClassificationForm {...formProps} onCancel={close} />
		</Modal>
	)
}

type CashCategoryModalProps = {
	title: string
	onClose: () => void
	onReset: () => void
	formProps: Omit<ComponentProps<typeof CashCategoryForm>, 'onCancel'>
}

export function renderCashCategoryModal({
	title,
	onClose,
	onReset,
	formProps,
}: CashCategoryModalProps): ReactNode {
	function close() {
		onReset()
		onClose()
	}

	return (
		<Modal key="form-cash-category" title={title} onClose={close}>
			<CashCategoryForm {...formProps} onCancel={close} />
		</Modal>
	)
}
