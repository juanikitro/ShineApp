'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type DebtPaymentDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	debtOptions: SelectOption[]
	paymentMethodOptions: SelectOption[]
	defaultPaymentMethod: string
	actions?: ReactNode
}

export function DebtPaymentDetailEditForm({
	data,
	onSubmit,
	onPatch,
	debtOptions,
	paymentMethodOptions,
	defaultPaymentMethod,
	actions,
}: DebtPaymentDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Deuda"
				value={String(data.debt ?? '')}
				options={debtOptions}
				onChange={(value) => onPatch({ debt: value })}
			/>
			<div className="form-row">
				<Field label="Importe">
					<input
						required
						type="number"
						min="0"
						value={data.amount ?? ''}
						onChange={(event) => onPatch({ amount: event.target.value })}
					/>
				</Field>
				<Field label="Fecha pago">
					<input
						type="date"
						value={data.paid_at ?? ''}
						onChange={(event) => onPatch({ paid_at: event.target.value })}
					/>
				</Field>
			</div>
			<SearchSelect
				label="Medio"
				value={String(data.method ?? defaultPaymentMethod)}
				options={paymentMethodOptions}
				onChange={(value) =>
					onPatch({ method: value || defaultPaymentMethod })
				}
			/>
			<Field label="Notas">
				<textarea
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
