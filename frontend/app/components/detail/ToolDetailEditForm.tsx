'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type ToolDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	statusOptions: SelectOption[]
	statusLabel: ReactNode
	quantityLabel: ReactNode
	unitValueLabel: ReactNode
	totalValueLabel: ReactNode
	actions?: ReactNode
}

export function ToolDetailEditForm({
	data,
	onSubmit,
	onPatch,
	statusOptions,
	statusLabel,
	quantityLabel,
	unitValueLabel,
	totalValueLabel,
	actions,
}: ToolDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					required
					value={data.name ?? ''}
					onChange={(event) => onPatch({ name: event.target.value })}
				/>
			</Field>
			<div className="form-row">
				<Field label="Cantidad">
					<input
						required
						type="number"
						min="0"
						step="1"
						value={data.quantity ?? ''}
						onChange={(event) => onPatch({ quantity: event.target.value })}
					/>
				</Field>
				<SearchSelect
					label="Estado"
					value={String(data.status ?? 'in_use')}
					options={statusOptions}
					onChange={(value) => onPatch({ status: value || 'in_use' })}
				/>
			</div>
			<div className="form-row">
				<Field label="Valor unitario">
					<input
						type="number"
						min="0"
						value={data.unit_value ?? ''}
						onChange={(event) => onPatch({ unit_value: event.target.value })}
					/>
				</Field>
				<Field label="Fecha compra">
					<input
						type="date"
						value={data.purchased_at ?? ''}
						onChange={(event) => onPatch({ purchased_at: event.target.value })}
					/>
				</Field>
			</div>
			<div className="material-summary">
				<div className="material-kpi">
					<span>Estado</span>
					<strong>{statusLabel}</strong>
				</div>
				<div className="material-kpi">
					<span>Cantidad</span>
					<strong>{quantityLabel}</strong>
				</div>
				<div className="material-kpi">
					<span>Valor unidad</span>
					<strong>{unitValueLabel}</strong>
				</div>
				<div className="material-kpi">
					<span>Valor total</span>
					<strong>{totalValueLabel}</strong>
				</div>
			</div>
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
