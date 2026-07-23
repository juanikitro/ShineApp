'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type QuoteDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	statusOptions: SelectOption[]
	summary?: ReactNode
	groupEditor?: ReactNode
	subtotalLabel: ReactNode
	discountLabel: ReactNode
	taxableLabel: ReactNode
	taxLabel: ReactNode
	totalLabel: ReactNode
	downloadActions?: ReactNode
	actions?: ReactNode
}

export function QuoteDetailEditForm({
	data,
	onSubmit,
	onPatch,
	statusOptions,
	summary,
	groupEditor,
	subtotalLabel,
	discountLabel,
	taxableLabel,
	taxLabel,
	totalLabel,
	downloadActions,
	actions,
}: QuoteDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			{summary}
			<Field label="Nombre de la cotizacion">
				<input
					type="text"
					maxLength={20}
					value={data.public_code ?? ''}
					onChange={(event) => onPatch({ public_code: event.target.value })}
				/>
			</Field>
			<SearchSelect
				label="Estado"
				value={String(data.status ?? '')}
				options={statusOptions}
				onChange={(value) => onPatch({ status: value })}
			/>
			<div className="form-row">
				<Field label="Validez">
					<input
						type="date"
						value={data.valid_until ?? ''}
						onChange={(event) => onPatch({ valid_until: event.target.value })}
					/>
				</Field>
				<Field label="Descuento %">
					<input
						min="0"
						max="100"
						step="0.01"
						type="number"
						value={data.discount_rate ?? ''}
						onChange={(event) =>
							onPatch({ discount_rate: event.target.value })
						}
					/>
				</Field>
				<Field label="IVA %">
					<input
						min="0"
						max="100"
						step="0.01"
						type="number"
						value={data.tax_rate ?? ''}
						onChange={(event) => onPatch({ tax_rate: event.target.value })}
					/>
				</Field>
			</div>
			{groupEditor}
			<div className="quote-total quote-total--breakdown">
				<span>Subtotal {subtotalLabel}</span>
				<span>Descuento {discountLabel}</span>
				<span>Base imponible {taxableLabel}</span>
				<span>IVA {taxLabel}</span>
				<strong>Total {totalLabel}</strong>
			</div>
			<Field label="Observaciones">
				<textarea
					value={data.observations ?? ''}
					onChange={(event) => onPatch({ observations: event.target.value })}
				/>
			</Field>
			<Field label="Terminos">
				<textarea
					value={data.terms ?? ''}
					onChange={(event) => onPatch({ terms: event.target.value })}
				/>
			</Field>
			<Field label="Instrucciones de pago">
				<textarea
					value={data.payment_instructions ?? ''}
					onChange={(event) =>
						onPatch({ payment_instructions: event.target.value })
					}
				/>
			</Field>
			{downloadActions}
			{actions}
		</form>
	)
}
