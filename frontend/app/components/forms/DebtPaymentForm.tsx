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
	formatDateLabel,
	DEFAULT_PAYMENT_METHOD,
	debtPaymentMethodLabels,
} from '@/lib/page-support'

type DebtPaymentFormProps = {
	submitLabel?: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	debtPaymentForm: AnyRecord
	setDebtPaymentForm: (form: AnyRecord) => void
	debtOptions: SelectOption[]
	selectedDebtForPayment: AnyRecord | null | undefined
	focusField: (key: string, openCombo?: boolean) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	fieldErrors?: Record<string, string>
	submitting?: boolean
}

export function DebtPaymentForm({
	submitLabel = 'Guardar pago de deuda',
	onSubmit,
	debtPaymentForm,
	setDebtPaymentForm,
	debtOptions,
	selectedDebtForPayment,
	focusField,
	focusNextOnEnter,
	fieldErrors,
	submitting = false,
}: DebtPaymentFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			{debtOptions.length ? null : (
				<div className="info-note">
					No hay deudas con saldo pendiente para pagar.
				</div>
			)}
			<SearchSelect
				label="Deuda"
				value={debtPaymentForm.debt}
				options={debtOptions}
				focusKey="debt-payment.debt"
				onChange={(value) => {
					setDebtPaymentForm({
						...debtPaymentForm,
						debt: value,
					})
					focusField('debt-payment.amount')
				}}
			/>
			{selectedDebtForPayment ? (
				<div className="finance-form-summary finance-form-summary--debt">
					<div>
						<span>Saldo pendiente</span>
						<strong>{money(selectedDebtForPayment.balance_due)}</strong>
					</div>
					<small>
						{joinDisplayParts([
							selectedDebtForPayment.creditor || 'Sin acreedor',
							selectedDebtForPayment.due_date
								? `Limite ${formatDateLabel(selectedDebtForPayment.due_date)}`
								: null,
						])}
					</small>
				</div>
			) : null}
			<div className="form-row">
				<Field label="Importe" error={fieldErrors?.['amount']}>
					<NumericInput
						data-focus-key="debt-payment.amount"
						required
						prefix="$"
						value={debtPaymentForm.amount}
						onChange={(raw) =>
							setDebtPaymentForm({
								...debtPaymentForm,
								amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('debt-payment.paid_at')}
					/>
				</Field>
				<Field label="Fecha pago" error={fieldErrors?.['paid_at']}>
					<input
						data-focus-key="debt-payment.paid_at"
						type="date"
						value={debtPaymentForm.paid_at}
						onChange={(event) =>
							setDebtPaymentForm({
								...debtPaymentForm,
								paid_at: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('debt-payment.method', true)}
					/>
				</Field>
			</div>
			<SearchSelect
				label="Medio"
				value={debtPaymentForm.method}
				options={Object.entries(debtPaymentMethodLabels).map(
					([value, label]) => ({ value, label }),
				)}
				focusKey="debt-payment.method"
				onChange={(value) => {
					setDebtPaymentForm({
						...debtPaymentForm,
						method: value || DEFAULT_PAYMENT_METHOD,
					})
					focusField('debt-payment.notes')
				}}
			/>
			<Field label="Notas" error={fieldErrors?.['notes']}>
				<textarea
					data-focus-key="debt-payment.notes"
					value={debtPaymentForm.notes}
					onChange={(event) =>
						setDebtPaymentForm({
							...debtPaymentForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<div className="info-note">
				Este pago queda como trazabilidad de deuda y no genera otro egreso en los reportes economicos.
			</div>
			<Button type="submit" variant="primary" loading={submitting}>
				<CreditCard size={16} />
				{submitLabel}
			</Button>
		</form>
	)
}
