'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Wrench } from 'lucide-react'

import { DurationInput } from '@/app/components/ui/DurationInput'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { type AnyRecord } from '@/lib/page-support'
import { applyBasePriceToTypes, VEHICLE_TYPES } from '@/lib/service-pricing'

type ServiceFormProps = {
	submitLabel: string
	serviceForm: AnyRecord
	setServiceForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	sectors: AnyRecord[]
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
	focusField: (key: string) => void
}

export function ServiceForm({
	submitLabel,
	serviceForm,
	setServiceForm,
	onSubmit,
	sectors,
	focusNextOnEnter,
	focusField,
}: ServiceFormProps) {
	const sectorOptions = sectors
		.filter((s) => s.is_active !== false)
		.map((s) => ({ value: String(s.id), label: String(s.name ?? '') }))
	function serviceTypeFromSectorId(sectorId: string | number): string {
		const sector = sectors.find((s) => String(s.id) === String(sectorId))
		return sector?.key === 'detailing' ? 'detailing' : 'wash'
	}
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="form-row">
				<Field label="Nombre">
					<input
						data-focus-key="service.name"
						required
						list="service-name-options"
						value={serviceForm.name}
						onChange={(event) =>
							setServiceForm({
								...serviceForm,
								name: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('service.icon')}
					/>
				</Field>
				<ServiceIconPicker
					focusKey="service.icon"
					value={String(serviceForm.icon ?? '')}
					onChange={(icon) =>
						setServiceForm({
							...serviceForm,
							icon,
						})
					}
				/>
			</div>
			<SearchSelect
				label="Sector"
				value={String(serviceForm.sector ?? '')}
				options={sectorOptions}
				focusKey="service.sector"
				onChange={(value) => {
					setServiceForm({
						...serviceForm,
						sector: value ? Number(value) : null,
						service_type: value ? serviceTypeFromSectorId(value) : 'wash',
					})
					focusField('service.base_price')
				}}
			/>
			<div className="form-row">
				<Field label="Precio base">
					<NumericInput
						data-focus-key="service.base_price"
						required
						prefix="$"
						value={serviceForm.base_price}
						onChange={(raw) =>
							setServiceForm(
								applyBasePriceToTypes(serviceForm, raw),
							)
						}
						onKeyDown={focusNextOnEnter('service.duration')}
					/>
				</Field>
				<DurationInput
					form={serviceForm}
					onPatch={(patch) => setServiceForm({ ...serviceForm, ...patch })}
					focusKey="service.duration"
					required
					onKeyDown={focusNextOnEnter('service.notes')}
				/>
			</div>
			<div className="form-row">
				{VEHICLE_TYPES.map((type) => (
					<Field key={type.value} label={`Precio ${type.label}`}>
						<NumericInput
							prefix="$"
							value={serviceForm[type.priceField] ?? ''}
							onChange={(raw) =>
								setServiceForm({
									...serviceForm,
									[type.priceField]: raw,
								})
							}
						/>
					</Field>
				))}
			</div>
			<Field label="Notas">
				<textarea
					data-focus-key="service.notes"
					value={serviceForm.notes}
					onChange={(event) =>
						setServiceForm({
							...serviceForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<button className="primary" data-focus-key="service.submit">
				<Wrench size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
