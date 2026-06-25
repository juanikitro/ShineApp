'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Plus, Trash2, Wrench } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { DurationInput } from '@/app/components/ui/DurationInput'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { ServiceIconPicker } from '@/app/components/ui/ServiceIconPicker'
import { type AnyRecord, quantity } from '@/lib/page-support'
import { applyBasePriceToTypes, VEHICLE_TYPES } from '@/lib/service-pricing'

type ServiceFormProps = {
	submitLabel: string
	serviceForm: AnyRecord
	setServiceForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	sectors: AnyRecord[]
	materialOptions: SelectOption[]
	materials: AnyRecord[]
	serviceMaterialLines: AnyRecord[]
	addServiceMaterialLine: () => void
	removeServiceMaterialLine: (index: number) => void
	updateServiceMaterialLine: (index: number, changes: AnyRecord) => void
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
	focusField: (key: string) => void
	fieldErrors?: Record<string, string>
	submitting?: boolean
}

export function ServiceForm({
	submitLabel,
	serviceForm,
	setServiceForm,
	onSubmit,
	sectors,
	materialOptions,
	materials,
	serviceMaterialLines,
	addServiceMaterialLine,
	removeServiceMaterialLine,
	updateServiceMaterialLine,
	focusNextOnEnter,
	focusField,
	fieldErrors,
	submitting = false,
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
				<Field label="Nombre" error={fieldErrors?.['name']}>
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
				<Field label="Precio base" error={fieldErrors?.['base_price']}>
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
			<Field
				label="Costo estimado de materiales"
				error={fieldErrors?.['estimated_material_cost']}
			>
				<NumericInput
					prefix="$"
					value={serviceForm.estimated_material_cost ?? ''}
					onChange={(raw) =>
						setServiceForm({
							...serviceForm,
							estimated_material_cost: raw,
						})
					}
				/>
			</Field>
			<div className="info-note">
				Opcional. Solo se usa para estimar el ratio (margen y costo/precio)
				cuando el servicio no tiene receta de materiales cargada. Ese valor se
				muestra con un “~”.
			</div>
			<Field label="Notas" error={fieldErrors?.['notes']}>
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
			<div className="form-section-label">Materiales por servicio</div>
			<div className="info-note">
				Al cerrar un trabajo con este servicio, los materiales se descuentan
				automáticamente del stock.
			</div>
			<div className="stock-lines">
				{serviceMaterialLines.map((line: AnyRecord, index: number) => {
					const mat = materials.find(
						(m) => String(m.id) === String(line.material),
					)
					return (
						<div className="quote-line stock-line" key={index}>
							<SearchSelect
								label="Material"
								value={line.material}
								options={materialOptions}
								onChange={(value) =>
									updateServiceMaterialLine(index, { material: value })
								}
							/>
							<Field label={`Cantidad${mat?.unit ? ` (${mat.unit})` : ''}`}>
								<input
									type="number"
									min="0.001"
									step="0.001"
									value={line.quantity}
									onChange={(event) =>
										updateServiceMaterialLine(index, {
											quantity: event.target.value,
										})
									}
								/>
							</Field>
							<Button
								type="button"
								variant="ghost"
								onClick={() => removeServiceMaterialLine(index)}
							>
								<Trash2 size={16} />
							</Button>
						</div>
					)
				})}
			</div>
			<Button
				type="button"
				variant="ghost"
				onClick={addServiceMaterialLine}
			>
				<Plus size={16} />
				Agregar material
			</Button>
			<Button type="submit" variant="primary" loading={submitting} data-focus-key="service.submit">
				<Wrench size={16} />
				{submitLabel}
			</Button>
		</form>
	)
}
