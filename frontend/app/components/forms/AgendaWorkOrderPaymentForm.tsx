'use client'

import { type FormEvent, type ReactNode } from 'react'

import { CreditCard } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type AgendaWorkOrderPaymentFormProps = {
	form: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	onPaymentTypeChange: (value: string) => void
	onMethodChange: (value: string) => void
	info: ReactNode
	workOrderSummary: ReactNode
	submitting: boolean
}

export function AgendaWorkOrderPaymentForm({
	form,
	onSubmit,
	onPatch,
	onPaymentTypeChange,
	onMethodChange,
	info,
	workOrderSummary,
	submitting,
}: AgendaWorkOrderPaymentFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="info-note">{info}</div>
			{workOrderSummary}
			<div className="form-row">
				<Field label="Importe">
					<input
						required
						type="number"
						min="0"
						value={form.amount}
						onChange={(event) => onPatch({ amount: event.target.value })}
					/>
				</Field>{' '}
				<SearchSelect
					label="Tipo"
					value={form.payment_type}
					options={[
						{ value: 'payment', label: 'Pago' },
						{ value: 'deposit', label: 'Sena' },
					]}
					onChange={onPaymentTypeChange}
				/>
			</div>{' '}
			<SearchSelect
				label="Medio"
				value={form.method}
				options={[
					{ value: 'cash', label: 'Efectivo' },
					{ value: 'card', label: 'Tarjeta' },
					{ value: 'transfer', label: 'Transferencia' },
					{ value: 'other', label: 'Otro' },
				]}
				onChange={onMethodChange}
			/>
			<Field label="Observaciones">
				<textarea
					value={form.notes}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<CreditCard size={16} />}
			>
				Registrar pago
			</Button>
		</form>
	)
}
