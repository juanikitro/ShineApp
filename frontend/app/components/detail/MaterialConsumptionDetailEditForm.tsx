'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type MaterialConsumptionDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	workOrderOptions: SelectOption[]
	materialOptions: SelectOption[]
	openUnitConsumption: boolean
	actions?: ReactNode
}

export function MaterialConsumptionDetailEditForm({
	data,
	onSubmit,
	onPatch,
	workOrderOptions,
	materialOptions,
	openUnitConsumption,
	actions,
}: MaterialConsumptionDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Reserva/trabajo"
				value={String(data.work_order ?? '')}
				options={workOrderOptions}
				onChange={(value) => onPatch({ work_order: value })}
			/>
			{openUnitConsumption ? (
				<div className="info-note">
					Uso desde unidad abierta:{' '}
					<strong>{data.open_unit_label ?? `#${data.open_unit}`}</strong>
					. No descuenta stock directo.
				</div>
			) : (
				<SearchSelect
					label="Material"
					value={String(data.material ?? '')}
					options={materialOptions}
					onChange={(value) => onPatch({ material: value })}
				/>
			)}
			<div className="form-row">
				<Field label="Fecha">
					<input
						type="date"
						value={data.consumed_at ?? ''}
						onChange={(event) => onPatch({ consumed_at: event.target.value })}
					/>
				</Field>
				{openUnitConsumption ? null : (
					<Field label="Cantidad">
						<input
							required
							type="number"
							min="0"
							value={data.quantity ?? ''}
							onChange={(event) => onPatch({ quantity: event.target.value })}
						/>
					</Field>
				)}
			</div>
			<div className="info-note">
				{openUnitConsumption
					? 'El costo y stock se imputan cuando se finaliza la unidad abierta.'
					: 'El costo estimado se recalcula si cambia el material o la cantidad.'}
			</div>
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
