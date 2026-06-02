'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Wrench } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import { SearchSelect } from '@/app/components/ui/SearchSelect'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { type AnyRecord } from '@/lib/page-support'
import { applyBasePriceToTypes, VEHICLE_TYPES } from '@/lib/service-pricing'

const serviceFormTypeOptions = [
	{ value: 'wash', label: 'Lavado' },
	{ value: 'detailing', label: 'Detailing' },
	{ value: 'combo', label: 'Combo' },
]

type ServiceFormProps = {
	submitLabel: string
	serviceForm: AnyRecord
	setServiceForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
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
	focusNextOnEnter,
	focusField,
}: ServiceFormProps) {
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
				label="Tipo"
				value={serviceForm.service_type}
				options={serviceFormTypeOptions}
				focusKey="service.type"
				onChange={(value) => {
					setServiceForm({
						...serviceForm,
						service_type: value || 'wash',
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
				<Field label="Duracion estimada">
					<input
						data-focus-key="service.duration"
						required
						type="number"
						min="1"
						value={serviceForm.estimated_duration_minutes}
						onChange={(event) =>
							setServiceForm({
								...serviceForm,
								estimated_duration_minutes: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('service.notes')}
					/>
				</Field>
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
