import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'
import { type AnyRecord } from '@/lib/page-support'

import { FixedExpenseOccurrencePaymentForm } from './FixedExpenseOccurrencePaymentForm'

type FixedExpensePaymentModalRendererProps = {
	form: AnyRecord
	setForm: (form: AnyRecord) => void
	onSubmit: ComponentProps<typeof FixedExpenseOccurrencePaymentForm>['onSubmit']
	paymentMethodOptions: ComponentProps<
		typeof FixedExpenseOccurrencePaymentForm
>['paymentMethodOptions']
	formatMoney: (value: number) => ReactNode
	onClose: () => void
}

export function renderFixedExpensePaymentModal({
	form,
	setForm,
	onSubmit,
	paymentMethodOptions,
	formatMoney,
	onClose,
}: FixedExpensePaymentModalRendererProps): ReactNode {
	return (
		<Modal
			key="form-fixed-expense-pay"
			title="Registrar pago de gasto fijo"
			onClose={onClose}
		>
			<FixedExpenseOccurrencePaymentForm
				form={form}
				onSubmit={onSubmit}
				onAmountChange={(newAmount) => {
					const isOriginal =
						newAmount === '' ||
						Number(newAmount) === Number(form.original_amount)
					setForm({
						...form,
						amount: newAmount,
						update_template: isOriginal ? false : form.update_template,
					})
				}}
				onUpdateTemplateChange={(checked) =>
					setForm({ ...form, update_template: checked })
				}
				onMethodChange={(value) => setForm({ ...form, method: value })}
				onPaidAtChange={(value) => setForm({ ...form, paid_at: value })}
				paymentMethodOptions={paymentMethodOptions}
				showUpdateTemplate={
					form.amount !== '' &&
					Number(form.amount) !== Number(form.original_amount)
				}
				originalAmountLabel={formatMoney(Number(form.original_amount))}
				amountLabel={formatMoney(Number(form.amount))}
			/>
		</Modal>
	)
}
