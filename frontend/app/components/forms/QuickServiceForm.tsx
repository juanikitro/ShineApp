'use client'

import { type FormEvent } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { DurationInput } from '@/app/components/ui/DurationInput'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { type AnyRecord } from '@/lib/page-support'
import { VEHICLE_TYPES } from '@/lib/service-pricing'

type QuickServiceFormProps = {
	serviceForm: AnyRecord
	setServiceForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	sectorOptions: SelectOption[]
	onSectorChange: (value: string) => void
	onBasePriceChange: (value: string) => void
	submitting: boolean
}

export function QuickServiceForm({
	serviceForm,
	setServiceForm,
	onSubmit,
	sectorOptions,
	onSectorChange,
	onBasePriceChange,
	submitting,
}: QuickServiceFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					required
					list="service-name-options"
					value={serviceForm.name}
					onChange={(event) =>
						setServiceForm({
							...serviceForm,
							name: event.target.value,
						})
					}
				/>
			</Field>
			<ServiceIconPicker
				value={String(serviceForm.icon ?? '')}
				onChange={(icon) =>
					setServiceForm({
						...serviceForm,
						icon,
					})
				}
			/>
			<SearchSelect
				label="Sector"
				value={String(serviceForm.sector ?? '')}
				options={sectorOptions}
				onChange={onSectorChange}
			/>
			<div className="form-row">
				<Field label="Precio base">
					<input
						required
						type="number"
						min="0"
						value={serviceForm.base_price}
						onChange={(event) => onBasePriceChange(event.target.value)}
					/>
				</Field>
				<DurationInput
					form={serviceForm}
					onPatch={(patch) =>
						setServiceForm({ ...serviceForm, ...patch })
					}
				/>
			</div>
			<div className="form-row">
				{VEHICLE_TYPES.map((type) => (
					<Field key={type.value} label={`Precio ${type.label}`}>
						<input
							type="number"
							min="0"
							value={serviceForm[type.priceField] ?? ''}
							onChange={(event) =>
								setServiceForm({
									...serviceForm,
									[type.priceField]: event.target.value,
								})
							}
						/>
					</Field>
				))}
			</div>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
			>
				Crear servicio
			</Button>
		</form>
	)
}
