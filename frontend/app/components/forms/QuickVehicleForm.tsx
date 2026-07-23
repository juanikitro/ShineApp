'use client'

import { type FormEvent } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type QuickVehicleFormProps = {
	vehicleForm: AnyRecord
	setVehicleForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	customerOptions: SelectOption[]
	vehicleBrandSelectOptions: SelectOption[]
	vehicleModelSelectOptions: SelectOption[]
	customerClassName: string
	onAddCustomer: () => void
	updateVehicleBrand: (value: string) => void
	submitting: boolean
}

export function QuickVehicleForm({
	vehicleForm,
	setVehicleForm,
	onSubmit,
	customerOptions,
	vehicleBrandSelectOptions,
	vehicleModelSelectOptions,
	customerClassName,
	onAddCustomer,
	updateVehicleBrand,
	submitting,
}: QuickVehicleFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Cliente"
				value={vehicleForm.customer}
				options={customerOptions}
				name="quick_vehicle_customer"
				className={customerClassName}
				onAdd={onAddCustomer}
				onChange={(value) =>
					setVehicleForm({
						...vehicleForm,
						customer: value,
					})
				}
			/>
			<SearchSelect
				label="Tipo de vehiculo"
				value={vehicleForm.vehicle_type}
				options={VEHICLE_TYPE_OPTIONS}
				name="quick_vehicle_type"
				onChange={(value) =>
					setVehicleForm({
						...vehicleForm,
						vehicle_type: value || 'auto',
					})
				}
			/>
			<div className="form-row">
				<SearchSelect
					label="Marca"
					value={vehicleForm.brand}
					options={vehicleBrandSelectOptions}
					name="quick_vehicle_brand"
					placeholder="Sin marca"
					onChange={updateVehicleBrand}
					onCreate={updateVehicleBrand}
					createLabel={(value) => `Crear marca "${value}"`}
				/>
				<SearchSelect
					label="Modelo"
					value={vehicleForm.model}
					options={vehicleModelSelectOptions}
					name="quick_vehicle_model"
					placeholder={
						vehicleForm.brand ? 'Sin modelo' : 'Elegir marca'
					}
					disabled={!vehicleForm.brand && !vehicleForm.model}
					onChange={(value) =>
						setVehicleForm({
							...vehicleForm,
							model: value,
						})
					}
					onCreate={(value) =>
						setVehicleForm({
							...vehicleForm,
							model: value,
						})
					}
					createLabel={(value) => `Crear modelo "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Color">
					<input
						name="quick_vehicle_color"
						autoComplete="off"
						list="vehicle-color-options"
						value={vehicleForm.color}
						onChange={(event) =>
							setVehicleForm({
								...vehicleForm,
								color: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Patente">
					<input
						name="quick_vehicle_license_plate"
						autoComplete="off"
						list="vehicle-plate-options"
						value={vehicleForm.license_plate}
						onChange={(event) =>
							setVehicleForm({
								...vehicleForm,
								license_plate: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
			>
				Crear vehiculo
			</Button>
		</form>
	)
}
