'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { Toggle } from '@/app/components/ui/Toggle'
import { type AnyRecord } from '@/lib/page-support'

type MaterialPurchaseDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	materialOptions: SelectOption[]
	unitCost: string
	actions?: ReactNode
}

export function MaterialPurchaseDetailEditForm({
	data,
	onSubmit,
	onPatch,
	materialOptions,
	unitCost,
	actions,
}: MaterialPurchaseDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Material"
				value={String(data.material ?? '')}
				options={materialOptions}
				onChange={(value) => onPatch({ material: value })}
			/>
			<div className="form-row">
				<Field label="Fecha">
					<input
						type="date"
						value={data.purchased_at ?? ''}
						onChange={(event) => onPatch({ purchased_at: event.target.value })}
					/>
				</Field>
				<Field label="Cantidad">
					<input
						required
						type="number"
						min="0"
						value={data.quantity ?? ''}
						onChange={(event) => onPatch({ quantity: event.target.value })}
					/>
				</Field>
			</div>
			<Field label="Costo total">
				<input
					required
					type="number"
					min="0"
					value={data.total_cost ?? ''}
					onChange={(event) => onPatch({ total_cost: event.target.value })}
				/>
			</Field>
			<div className="info-note">
				Valor calculado por unidad:{' '}
				<strong>{unitCost}</strong>
			</div>
			<Toggle
				checked={Boolean(data.affects_cash)}
				onChange={(checked) => onPatch({ affects_cash: checked })}
			>
				Impacta en caja
			</Toggle>
			<Field label="Observaciones">
				<textarea
					value={data.observations ?? ''}
					onChange={(event) => onPatch({ observations: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
