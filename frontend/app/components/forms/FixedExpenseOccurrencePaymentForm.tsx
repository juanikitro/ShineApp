'use client'

import { type FormEvent, type ReactNode } from 'react'

import { CreditCard } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { Toggle } from '@/app/components/ui/Toggle'
import { type AnyRecord } from '@/lib/page-support'

type FixedExpenseOccurrencePaymentFormProps = {
	form: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onAmountChange: (value: string) => void
	onUpdateTemplateChange: (checked: boolean) => void
	onMethodChange: (value: string) => void
	onPaidAtChange: (value: string) => void
	paymentMethodOptions: Array<{ value: string; label: ReactNode }>
	showUpdateTemplate: boolean
	originalAmountLabel: ReactNode
	amountLabel: ReactNode
}

export function FixedExpenseOccurrencePaymentForm({
	form,
	onSubmit,
	onAmountChange,
	onUpdateTemplateChange,
	onMethodChange,
	onPaidAtChange,
	paymentMethodOptions,
	showUpdateTemplate,
	originalAmountLabel,
	amountLabel,
}: FixedExpenseOccurrencePaymentFormProps) {
	return (
		<form onSubmit={onSubmit} className="form-body">
			<Field label="Monto">
				<input
					id="fixed-expense-pay.amount"
					type="number"
					min="0.01"
					step="any"
					placeholder="Ej: 94300 o 94300.50"
					value={form.amount}
					onChange={(event) => onAmountChange(event.target.value)}
				/>
				<small>
					Usá punto como decimal. Si lo dejás vacío, se usa el monto
					estimado de la ocurrencia.
				</small>
			</Field>
			{showUpdateTemplate ? (
				<Toggle
					checked={form.update_template}
					onChange={onUpdateTemplateChange}
				>
					Actualizar el monto estimado de la plantilla ({originalAmountLabel} →{' '}
					{amountLabel})
				</Toggle>
			) : null}
			<Field label="Metodo de pago">
				<select
					id="fixed-expense-pay.method"
					value={form.method}
					onChange={(event) => onMethodChange(event.target.value)}
				>
					{paymentMethodOptions.map(({ value, label }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</Field>
			<Field label="Fecha de pago">
				<input
					id="fixed-expense-pay.paid_at"
					type="date"
					value={form.paid_at}
					onChange={(event) => onPaidAtChange(event.target.value)}
				/>
			</Field>
			<div className="form-actions">
				<Button type="submit" variant="primary">
					<CreditCard size={16} />
					Confirmar pago
				</Button>
			</div>
		</form>
	)
}
