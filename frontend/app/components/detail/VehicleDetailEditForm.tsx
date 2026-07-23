'use client'

import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type VehicleDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	customerOptions: SelectOption[]
	brandOptions: SelectOption[]
	modelOptions: SelectOption[]
	onUpdateBrand: (value: string) => void
	focusField: (key: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	actions?: ReactNode
}

export function VehicleDetailEditForm({
	data,
	onSubmit,
	onPatch,
	customerOptions,
	brandOptions,
	modelOptions,
	onUpdateBrand,
	focusField,
	focusNextOnEnter,
	actions,
}: VehicleDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Cliente"
				value={String(data.customer ?? '')}
				options={customerOptions}
				focusKey="detail.vehicle.customer"
				onChange={(value) => {
					onPatch({ customer: value })
					focusField('detail.vehicle.brand')
				}}
			/>
			<SearchSelect
				label="Tipo de vehiculo"
				value={String(data.vehicle_type ?? 'auto')}
				options={VEHICLE_TYPE_OPTIONS}
				focusKey="detail.vehicle.vehicle_type"
				onChange={(value) => onPatch({ vehicle_type: value || 'auto' })}
			/>
			<div className="form-row">
				<SearchSelect
					label="Marca"
					value={String(data.brand ?? '')}
					options={brandOptions}
					placeholder="Sin marca"
					focusKey="detail.vehicle.brand"
					onChange={onUpdateBrand}
					onCreate={onUpdateBrand}
					createLabel={(value) => `Crear marca "${value}"`}
				/>
				<SearchSelect
					label="Modelo"
					value={String(data.model ?? '')}
					options={modelOptions}
					placeholder={data.brand ? 'Sin modelo' : 'Elegir marca'}
					disabled={!data.brand && !data.model}
					focusKey="detail.vehicle.model"
					onChange={(value) => {
						onPatch({ model: value })
						focusField('detail.vehicle.color')
					}}
					onCreate={(value) => {
						onPatch({ model: value })
						focusField('detail.vehicle.color')
					}}
					createLabel={(value) => `Crear modelo "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Color">
					<input
						data-focus-key="detail.vehicle.color"
						value={data.color ?? ''}
						onChange={(event) => onPatch({ color: event.target.value })}
						onKeyDown={focusNextOnEnter('detail.vehicle.license_plate')}
					/>
				</Field>
				<Field label="Patente">
					<input
						data-focus-key="detail.vehicle.license_plate"
						value={data.license_plate ?? ''}
						onChange={(event) =>
							onPatch({ license_plate: event.target.value })
						}
						onKeyDown={focusNextOnEnter('detail.vehicle.notes')}
					/>
				</Field>
			</div>
			<Field label="Notas">
				<textarea
					data-focus-key="detail.vehicle.notes"
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
