'use client'

import { type FormEvent, type ReactNode } from 'react'

import { DurationInput } from '@/app/components/ui/DurationInput'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { type AnyRecord } from '@/lib/page-support'

type ServicePriceType = {
	value: string
	label: string
	priceField: string
}

type ServiceDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	sectorOptions: SelectOption[]
	onSectorChange: (value: string) => void
	onBasePriceChange: (value: string) => void
	priceTypes: readonly ServicePriceType[]
	materialsEditor?: ReactNode
	actions?: ReactNode
}

export function ServiceDetailEditForm({
	data,
	onSubmit,
	onPatch,
	sectorOptions,
	onSectorChange,
	onBasePriceChange,
	priceTypes,
	materialsEditor,
	actions,
}: ServiceDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="form-row">
				<Field label="Nombre">
					<input
						required
						value={data.name ?? ''}
						onChange={(event) => onPatch({ name: event.target.value })}
					/>
				</Field>
				<ServiceIconPicker
					value={String(data.icon ?? '')}
					onChange={(icon) => onPatch({ icon })}
				/>
			</div>
			<SearchSelect
				label="Sector"
				value={String(data.sector ?? '')}
				options={sectorOptions}
				onChange={onSectorChange}
			/>
			<div className="form-row">
				<Field label="Precio base">
					<input
						required
						type="number"
						min="0"
						value={data.base_price ?? ''}
						onChange={(event) => onBasePriceChange(event.target.value)}
					/>
				</Field>
				<DurationInput form={data} onPatch={onPatch} />
			</div>
			<div className="form-row">
				{priceTypes.map((type) => (
					<Field key={type.value} label={`Precio ${type.label}`}>
						<input
							type="number"
							min="0"
							value={data[type.priceField] ?? ''}
							onChange={(event) =>
								onPatch({ [type.priceField]: event.target.value })
							}
						/>
					</Field>
				))}
			</div>
			<Field label="Costo estimado de materiales">
				<input
					type="number"
					min="0"
					value={data.estimated_material_cost ?? ''}
					onChange={(event) =>
						onPatch({ estimated_material_cost: event.target.value })
					}
				/>
			</Field>
			<div className="info-note">
				Opcional. Solo se usa para estimar el ratio cuando el servicio no
				tiene receta de materiales; ese valor se muestra con un “~”.
			</div>
			<Field label="Notas">
				<textarea
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{materialsEditor}
			{actions}
		</form>
	)
}
