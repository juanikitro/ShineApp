'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { CreditCard } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AnyRecord,
	money,
	fullPaymentAmountForOrder,
	DEFAULT_PAYMENT_TYPE,
	DEFAULT_PAYMENT_METHOD,
} from '@/lib/page-support'
import { serviceDisplayName } from '@/lib/service-display'

type PaymentFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	paymentForm: AnyRecord
	setPaymentForm: (form: AnyRecord) => void
	workOrders: AnyRecord[]
	workOrderOptions: SelectOption[]
	selectedWorkOrderForPayment: AnyRecord | null | undefined
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function PaymentForm({
	submitLabel,
	onSubmit,
	paymentForm,
	setPaymentForm,
	workOrders,
	workOrderOptions,
	selectedWorkOrderForPayment,
	focusField,
	focusNextOnEnter,
	submitting = false,
	fieldErrors,
}: PaymentFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Reserva/trabajo"
				value={paymentForm.work_order}
				options={workOrderOptions}
				focusKey="payment.work_order"
				onChange={(value) => {
					const selectedOrder = workOrders.find(
						(item) => String(item.id) === String(value),
					)
					setPaymentForm({
						...paymentForm,
						work_order: value,
						amount: fullPaymentAmountForOrder(selectedOrder),
					})
					focusField('payment.amount')
				}}
			/>
			{selectedWorkOrderForPayment ? (
				<div className="finance-form-summary">
					<div>
						<span>Saldo a cobrar</span>
						<strong>
							{money(
								selectedWorkOrderForPayment.balance_due ??
									selectedWorkOrderForPayment.total_amount,
							)}
						</strong>
					</div>
					<small>
						{joinDisplayParts([
							selectedWorkOrderForPayment.customer_name,
							selectedWorkOrderForPayment.vehicle_label,
							serviceDisplayName(selectedWorkOrderForPayment),
						])}
					</small>
				</div>
			) : null}
			<div className="form-row">
				<Field label="Importe" error={fieldErrors?.['amount']}>
					<NumericInput
						data-focus-key="payment.amount"
						required
						prefix="$"
						value={paymentForm.amount}
						onChange={(raw) =>
							setPaymentForm({
								...paymentForm,
								amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('payment.type', true)}
					/>
				</Field>
				<SearchSelect
					label="Tipo"
					value={paymentForm.payment_type}
					options={[
						{ value: 'payment', label: 'Pago' },
						{ value: 'deposit', label: 'Sena' },
					]}
					focusKey="payment.type"
					onChange={(value) => {
						setPaymentForm({
							...paymentForm,
							payment_type: value || DEFAULT_PAYMENT_TYPE,
						})
						focusField('payment.method', true)
					}}
				/>
			</div>
			<SearchSelect
				label="Medio"
				value={paymentForm.method}
				options={[
					{ value: 'cash', label: 'Efectivo' },
					{ value: 'card', label: 'Tarjeta' },
					{ value: 'transfer', label: 'Transferencia' },
					{ value: 'other', label: 'Otro' },
				]}
				focusKey="payment.method"
				onChange={(value) => {
					setPaymentForm({
						...paymentForm,
						method: value || DEFAULT_PAYMENT_METHOD,
					})
					focusField('payment.notes')
				}}
			/>
			<Field label="Notas" error={fieldErrors?.['notes']}>
				<textarea
					data-focus-key="payment.notes"
					value={paymentForm.notes}
					onChange={(event) =>
						setPaymentForm({
							...paymentForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<CreditCard size={16} />}
				data-focus-key="payment.submit"
			>
				{submitLabel}
			</Button>
		</form>
	)
}
