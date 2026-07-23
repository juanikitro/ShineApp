'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type MaterialDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	sectorOptions: SelectOption[]
	history?: ReactNode
	actions?: ReactNode
}

export function MaterialDetailEditForm({
	data,
	onSubmit,
	onPatch,
	sectorOptions,
	history,
	actions,
}: MaterialDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					required
					value={data.name ?? ''}
					onChange={(event) => onPatch({ name: event.target.value })}
				/>
			</Field>
			{sectorOptions.length > 0 && (
				<SearchSelect
					label="Sector"
					value={String(data.sector ?? '')}
					options={[{ value: '', label: 'Sin sector' }, ...sectorOptions]}
					onChange={(value) =>
						onPatch({ sector: value ? Number(value) : null })
					}
				/>
			)}
			<div className="form-row">
				<Field label="Unidad">
					<input
						required
						value={data.unit ?? ''}
						onChange={(event) => onPatch({ unit: event.target.value })}
					/>
				</Field>
				<Field label="Stock">
					<input
						type="number"
						min="0"
						value={data.stock_quantity ?? ''}
						onChange={(event) =>
							onPatch({ stock_quantity: event.target.value })
						}
					/>
				</Field>
			</div>
			{history}
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
