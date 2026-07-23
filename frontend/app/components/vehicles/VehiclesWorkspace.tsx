'use client'

import { type ReactNode } from 'react'

import { Car } from 'lucide-react'

import { VehicleListCard } from '@/app/components/vehicles/VehicleListCard'
import { Button } from '@/app/components/ui/Button'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import {
	vehicleDescriptionText,
	vehicleDisplayTitle,
} from '@/lib/vehicle-display'
import { type AnyRecord } from '@/lib/page-support'

type VehiclesWorkspaceProps = {
	vehicles: AnyRecord[]
	search: string
	onSearchChange: (value: string) => void
	onCreate: () => void
	getRecordClassName: (item: AnyRecord) => string
	detailProps: (
		item: AnyRecord,
	) => Parameters<typeof VehicleListCard>[0]['detailProps']
	quickActionTargetProps: (
		title: string,
		actions: QuickAction[],
	) => Parameters<typeof VehicleListCard>[0]['quickActionProps']
	vehicleQuickActions: (item: AnyRecord) => QuickAction[]
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	onEdit: (item: AnyRecord) => void
	onDeactivate: (item: AnyRecord) => void
}

export function VehiclesWorkspace({
	vehicles,
	search,
	onSearchChange,
	onCreate,
	getRecordClassName,
	detailProps,
	quickActionTargetProps,
	vehicleQuickActions,
	renderQuickActionsTrigger,
	onEdit,
	onDeactivate,
}: VehiclesWorkspaceProps) {
	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<h2>Vehiculos</h2>
					<Button type="button" variant="primary" onClick={onCreate}>
						<Car size={16} />
						Nuevo vehiculo
					</Button>
				</div>
				<div className="toolbar toolbar-spaced">
					<input
						placeholder="Buscar por patente, marca, modelo, color o cliente"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
				<div className="records">
					{vehicles.length ? (
						vehicles.map((item) => {
							const quickActions = vehicleQuickActions(item)
							return (
								<VehicleListCard
									key={`v-page-${item.id}`}
									item={item}
									recordClassName={getRecordClassName(item)}
									detailProps={detailProps(item)}
									quickActionProps={quickActionTargetProps(
										'Acciones de vehiculo',
										quickActions,
									)}
									quickActionsTrigger={renderQuickActionsTrigger(
										'Acciones de vehiculo',
										quickActions,
										'Acciones rapidas de vehiculo',
									)}
									title={vehicleDisplayTitle(item)}
									description={vehicleDescriptionText(item)}
									onEdit={() => onEdit(item)}
									onDeactivate={() => onDeactivate(item)}
								/>
							)
						})
					) : (
						<Empty
							text={
								search.trim()
									? 'No hay vehiculos para esta busqueda.'
									: 'Sin vehiculos.'
							}
							hint={
								search.trim()
									? 'Proba con otra patente, marca o cliente.'
									: 'Crea el primer vehiculo para vincular reservas.'
							}
						/>
					)}
				</div>
			</section>
		</div>
	)
}
