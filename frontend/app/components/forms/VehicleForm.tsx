'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Car } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type VehicleFormProps = {
	submitLabel: string
	vehicleForm: AnyRecord
	setVehicleForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	customerOptions: SelectOption[]
	vehicleBrandSelectOptions: SelectOption[]
	vehicleModelSelectOptions: SelectOption[]
	flashClass: (key: string | null) => string
	fieldFlashKey: (target: string) => string
	openQuickCreate: (kind: string, target: string) => void
	updateVehicleCustomer: (value: string) => void
	updateVehicleBrand: (value: string) => void
	focusField: (key: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
}

export function VehicleForm({
	submitLabel,
	vehicleForm,
	setVehicleForm,
	onSubmit,
	customerOptions,
	vehicleBrandSelectOptions,
	vehicleModelSelectOptions,
	flashClass,
	fieldFlashKey,
	openQuickCreate,
	updateVehicleCustomer,
	updateVehicleBrand,
	focusField,
	focusNextOnEnter,
}: VehicleFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Cliente"
				value={vehicleForm.customer}
				options={customerOptions}
				name="vehicle_customer"
				focusKey="vehicle.customer"
				className={flashClass(fieldFlashKey('vehicle.customer'))}
				onAdd={() => openQuickCreate('customer', 'vehicle.customer')}
				onChange={updateVehicleCustomer}
			/>
			<SearchSelect
				label="Tipo de vehiculo"
				value={vehicleForm.vehicle_type}
				options={VEHICLE_TYPE_OPTIONS}
				name="vehicle_type"
				focusKey="vehicle.vehicle_type"
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
					name="vehicle_brand"
					placeholder="Sin marca"
					focusKey="vehicle.brand"
					onChange={updateVehicleBrand}
					onCreate={updateVehicleBrand}
					createLabel={(value) => `Crear marca "${value}"`}
				/>
				<SearchSelect
					label="Modelo"
					value={vehicleForm.model}
					options={vehicleModelSelectOptions}
					name="vehicle_model"
					placeholder={vehicleForm.brand ? 'Sin modelo' : 'Elegir marca'}
					disabled={!vehicleForm.brand && !vehicleForm.model}
					focusKey="vehicle.model"
					onChange={(value) => {
						setVehicleForm({
							...vehicleForm,
							model: value,
						})
						focusField('vehicle.color')
					}}
					onCreate={(value) => {
						setVehicleForm({
							...vehicleForm,
							model: value,
						})
						focusField('vehicle.color')
					}}
					createLabel={(value) => `Crear modelo "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Color">
					<input
						data-focus-key="vehicle.color"
						name="vehicle_color"
						autoComplete="off"
						list="vehicle-color-options"
						value={vehicleForm.color}
						onChange={(event) =>
							setVehicleForm({
								...vehicleForm,
								color: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('vehicle.license_plate')}
					/>
				</Field>
				<Field label="Patente">
					<input
						data-focus-key="vehicle.license_plate"
						name="vehicle_license_plate"
						autoComplete="off"
						list="vehicle-plate-options"
						value={vehicleForm.license_plate}
						onChange={(event) =>
							setVehicleForm({
								...vehicleForm,
								license_plate: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('vehicle.submit')}
					/>
				</Field>
			</div>
			<button className="primary" data-focus-key="vehicle.submit">
				<Car size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
